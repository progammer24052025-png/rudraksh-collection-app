/**
 * SMTP delivery for transactional email.
 *
 * No third-party mail service and no dependency: this opens an implicit-TLS
 * connection to the store's own mailbox (Gmail by default), authenticates with
 * AUTH LOGIN and posts one multipart/alternative message. Transactional mail
 * therefore leaves from the same address customers already reply to.
 *
 * Gmail setup: turn on 2-Step Verification, create an App password, then set
 * SMTP_USER and SMTP_PASSWORD. See EMAIL_SETUP.md.
 *
 * Server only — `node:tls` means the Node.js runtime, not Edge.
 */

import * as tls from "node:tls";
import { siteUrl } from "@/lib/config";

const TIMEOUT_MS = 20_000;

export type OutgoingMail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
};

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  fromName: string;
};

const env = (name: string) => process.env[name]?.trim() || "";

function smtpConfig(): SmtpConfig | null {
  const user = env("SMTP_USER");
  const password = env("SMTP_PASSWORD");
  if (!user || !password) return null;
  return {
    host: env("SMTP_HOST") || "smtp.gmail.com",
    port: Number(env("SMTP_PORT") || 465),
    user,
    password,
    fromName: env("SMTP_FROM_NAME") || "Rudraksh Collection",
  };
}

/** True only when both credentials exist, so routes can answer 503 early. */
export const isMailConfigured = (): boolean => smtpConfig() !== null;

/** The address customers will see in the From line. */
export const mailSender = (): string => smtpConfig()?.user ?? "";

// ── Reply reader ───────────────────────────────────────────
// SMTP replies are text lines; a multi-line reply ends on the line whose code
// is followed by a space ("250 …") rather than a hyphen ("250-…").
class SmtpChannel {
  private lines: string[] = [];
  private partial = "";
  private pending: { resolve: (reply: string) => void; reject: (error: Error) => void } | null = null;
  private failure: Error | null = null;

  constructor(private readonly socket: tls.TLSSocket) {
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string | Buffer) => this.onData(String(chunk)));
    socket.on("error", (error: Error) => this.fail(error));
    socket.on("close", () => this.fail(new Error("SMTP connection closed")));
    socket.on("timeout", () => this.fail(new Error("SMTP connection timed out")));
  }

  private fail(error: Error) {
    this.failure = error;
    const waiter = this.pending;
    this.pending = null;
    waiter?.reject(error);
  }

  private onData(chunk: string) {
    this.partial += chunk;
    let index = this.partial.indexOf("\r\n");
    while (index !== -1) {
      this.lines.push(this.partial.slice(0, index));
      this.partial = this.partial.slice(index + 2);
      index = this.partial.indexOf("\r\n");
    }
    this.pump();
  }

  private pump() {
    if (!this.pending) return;
    const end = this.lines.findIndex((line) => /^\d{3} /.test(line));
    if (end === -1) return;
    const reply = this.lines.slice(0, end + 1).join("\n");
    this.lines = this.lines.slice(end + 1);
    const waiter = this.pending;
    this.pending = null;
    waiter.resolve(reply);
  }

  read(): Promise<string> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      this.pump();
    });
  }

  write(line: string) {
    this.socket.write(`${line}\r\n`);
  }

  async command(line: string): Promise<string> {
    this.write(line);
    return this.read();
  }

  close() {
    this.socket.destroy();
  }
}

const code = (reply: string) => reply.slice(0, 3);

function requireCode(reply: string, expected: string, step: string): void {
  if (code(reply) !== expected) {
    throw new Error(`${step} rejected: ${reply.split("\n").pop()?.slice(0, 200)}`);
  }
}

// ── Message building ───────────────────────────────────────
const base64 = (value: string) => Buffer.from(value, "utf8").toString("base64");

/** Non-ASCII text (₹, accents) has to travel as an RFC 2047 encoded word. */
function encodeHeader(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${base64(value)}?=`;
}

const fold = (value: string) => value.replace(/(.{76})/g, "$1\r\n");

function message(config: SmtpConfig, mail: OutgoingMail): string {
  const boundary = `rc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const domain = (config.user.split("@")[1] || "rudrakshcollection.in").toLowerCase();
  const messageId = `<${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 10)}@${domain}>`;

  return [
    `From: ${encodeHeader(config.fromName)} <${config.user}>`,
    `To: ${mail.to}`,
    `Reply-To: ${mail.replyTo || config.user}`,
    `Subject: ${encodeHeader(mail.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    fold(base64(mail.text)),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    fold(base64(mail.html)),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

/** RFC 5321: a line that starts with "." is doubled; base64 bodies never do. */
const dotStuff = (value: string) => value.replace(/^\./gm, "..");

function heloName(): string {
  try {
    return new URL(siteUrl).hostname || "localhost";
  } catch {
    return "localhost";
  }
}

function openSocket(config: SmtpConfig): Promise<tls.TLSSocket> {
  // Node refuses a TLS ServerName that is a bare IP, so only name-based hosts
  // get SNI (smtp.gmail.com always does).
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(config.host) || config.host.includes(":");

  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: config.host,
        port: config.port,
        servername: isIp ? undefined : config.host,
        timeout: TIMEOUT_MS,
      },
      () => {
        socket.setTimeout(TIMEOUT_MS);
        resolve(socket);
      },
    );
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error("SMTP connection timed out")));
  });
}

/**
 * Sends one message and never throws: callers are fire-and-forget so a mail
 * failure must not break a sign-up or a checkout.
 */
export async function sendMail(mail: OutgoingMail): Promise<{ ok: boolean; error?: string }> {
  const config = smtpConfig();
  if (!config) return { ok: false, error: "SMTP is not configured." };

  let channel: SmtpChannel | null = null;
  try {
    const socket = await openSocket(config);
    channel = new SmtpChannel(socket);

    requireCode(await channel.read(), "220", "Greeting");

    let ehlo = await channel.command(`EHLO ${heloName()}`);
    requireCode(ehlo, "250", "EHLO");
    if (!/AUTH\b/i.test(ehlo)) throw new Error("This server does not offer SMTP AUTH");

    requireCode(await channel.command("AUTH LOGIN"), "334", "AUTH LOGIN");
    requireCode(await channel.command(base64(config.user)), "334", "Username");
    requireCode(await channel.command(base64(config.password)), "235", "Password");

    requireCode(await channel.command(`MAIL FROM:<${config.user}>`), "250", "MAIL FROM");
    requireCode(await channel.command(`RCPT TO:<${mail.to}>`), "250", "RCPT TO");
    requireCode(await channel.command("DATA"), "354", "DATA");

    // The message already ends with CRLF, so "." alone closes the DATA block.
    channel.write(`${dotStuff(message(config, mail))}.`);
    requireCode(await channel.read(), "250", "Message body");

    await channel.command("QUIT").catch(() => "");
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    // Gmail's usual failure here is a missing or revoked App password.
    console.error("SMTP send failed:", detail);
    return { ok: false, error: `Could not send the email: ${detail}` };
  } finally {
    channel?.close();
  }
}

/** Exported for the setup script: verifies the mailbox without sending. */
export async function verifySmtp(): Promise<{ ok: boolean; error?: string }> {
  const config = smtpConfig();
  if (!config) return { ok: false, error: "SMTP is not configured." };

  let channel: SmtpChannel | null = null;
  try {
    const socket = await openSocket(config);
    channel = new SmtpChannel(socket);
    requireCode(await channel.read(), "220", "Greeting");
    requireCode(await channel.command(`EHLO ${heloName()}`), "250", "EHLO");
    requireCode(await channel.command("AUTH LOGIN"), "334", "AUTH LOGIN");
    requireCode(await channel.command(base64(config.user)), "334", "Username");
    requireCode(await channel.command(base64(config.password)), "235", "Password");
    await channel.command("QUIT").catch(() => "");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    channel?.close();
  }
}

