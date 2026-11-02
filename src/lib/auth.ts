import { getCloudflareContext } from "@opennextjs/cloudflare";

const SECRET_KEY = "rudraksh-admin-session-secret";

function getSecret(): string {
  const { env } = getCloudflareContext<{ Env: { ADMIN_SECRET?: string } }>();
  return env.ADMIN_SECRET || SECRET_KEY;
}

// Simple password hashing using Web Crypto (no external deps needed)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256
  );
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex] = stored.split(":");
  if (!saltHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256
  );
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return stored === `${saltHex}:${hashHex}`;
}

// Session token signing/verification
export async function signToken(payload: Record<string, unknown>): Promise<string> {
  const data = btoa(JSON.stringify(payload));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${data}.${sigHex}`;
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const [data, sigHex] = token.split(".");
    if (!data || !sigHex) return null;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sig = new Uint8Array(sigHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
    const valid = await crypto.subtle.verify("HMAC", key, sig, encoder.encode(data));
    if (!valid) return null;
    const payload = JSON.parse(atob(data));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookie(req: Request): string | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/admin_session=([^;]+)/);
  return match ? match[1] : null;
}

export const SESSION_COOKIE = "admin_session";
export const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
