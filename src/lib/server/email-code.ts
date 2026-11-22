/**
 * Signing in with a 6-digit code sent by email — free, and works on the
 * Spark plan where SMS codes do not.
 *
 * Flow: the customer types an email → we store a hash of a random code for
 * 10 minutes and email the code → they type it back → we find (or create)
 * their Firebase account for that email and hand the browser a one-hour
 * custom token, which it exchanges with signInWithCustomToken.
 *
 * Safety:
 *  · only a salted hash of the code is stored, under server-only
 *    `serverState/emailCodes/{hash of email}`;
 *  · five wrong guesses burn the code; sending is throttled per email and
 *    per network (in the route);
 *  · a customer who signs in by code and already has an account with that
 *    email gets that same account (same orders, same addresses). If that
 *    account was never email-verified, its password is removed — otherwise
 *    someone could pre-register a stranger's email with a password and later
 *    walk into the account the real owner now uses.
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import {
  adminDelete,
  adminGet,
  adminSet,
  createCustomToken,
  googleApiAccess,
  serverSecret,
} from "@/lib/server/rtdb-admin";

export const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const IDENTITY_SCOPE = "https://www.googleapis.com/auth/identitytoolkit";

type StoredCode = { hash: string; expires_at: number; attempts: number; sent_at: number };

export const normalizeEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();
export const isEmailAddress = (value: string) =>
  value.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value);

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const keyFor = (email: string) => `serverState/emailCodes/${sha(`email-code:${email}`).slice(0, 40)}`;
const hashCode = (email: string, code: string) => sha(`${serverSecret() ?? ""}:${email}:${code}`);

/** Creates and stores a new code (replacing any older one). Returns the code to email. */
export async function issueCode(email: string): Promise<{ code: string } | { wait: number }> {
  const path = keyFor(email);
  const existing = await adminGet<StoredCode>(path);
  // One code a minute per address, so the inbox cannot be flooded.
  if (existing && Date.now() - existing.sent_at < 60_000) {
    return { wait: Math.ceil((60_000 - (Date.now() - existing.sent_at)) / 1000) };
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const record: StoredCode = {
    hash: hashCode(email, code),
    expires_at: Date.now() + CODE_MINUTES * 60_000,
    attempts: 0,
    sent_at: Date.now(),
  };
  await adminSet(path, record);
  return { code };
}

export async function discardCode(email: string): Promise<void> {
  await adminDelete(keyFor(email)).catch(() => {});
}

/** Checks a typed code; a correct one is used up. */
export async function checkCode(email: string, code: string): Promise<"ok" | "wrong" | "expired"> {
  const path = keyFor(email);
  const stored = await adminGet<StoredCode>(path);
  if (!stored || stored.expires_at < Date.now() || stored.attempts >= MAX_ATTEMPTS) {
    if (stored) await adminDelete(path).catch(() => {});
    return "expired";
  }
  const expected = Buffer.from(stored.hash, "hex");
  const given = Buffer.from(hashCode(email, code), "hex");
  if (expected.length === given.length && timingSafeEqual(expected, given)) {
    await adminDelete(path);
    return "ok";
  }
  const attempts = stored.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) await adminDelete(path).catch(() => {});
  else await adminSet(path, { ...stored, attempts });
  return "wrong";
}

type IdentityUser = {
  localId: string;
  email?: string;
  emailVerified?: boolean;
  disabled?: boolean;
  providerUserInfo?: { providerId: string }[];
};

async function identity<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const access = await googleApiAccess(IDENTITY_SCOPE);
  if (!access) throw new Error("The server credentials are not set up.");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(access.projectId)}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${access.token}` },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Sign-in service error ${response.status}: ${detail.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

/**
 * The account for this (now proven) email: the existing one when there is
 * one, otherwise a new account. Returns a custom token for it, or null when
 * the account has been disabled by the store.
 */
export async function signInTokenFor(email: string): Promise<string | null> {
  const found = await identity<{ users?: IdentityUser[] }>("accounts:lookup", { email: [email] });
  let user = found.users?.[0];

  if (user?.disabled) return null;

  if (!user) {
    const created = await identity<{ localId: string }>("accounts", { email, emailVerified: true });
    user = { localId: created.localId, email, emailVerified: true };
  } else if (!user.emailVerified) {
    const hasPassword = (user.providerUserInfo ?? []).some((info) => info.providerId === "password");
    await identity("accounts:update", {
      localId: user.localId,
      emailVerified: true,
      ...(hasPassword ? { deleteProvider: ["password"] } : {}),
    });
  }

  return createCustomToken(user.localId);
}
