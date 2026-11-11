/**
 * Server-side Realtime Database writes.
 *
 * Uses the service-account credentials in `FIREBASE_SERVICE_ACCOUNT` to mint a
 * short-lived Google OAuth token, then writes through the RTDB REST API. No
 * `firebase-admin` dependency, and the key never reaches the browser.
 *
 * When the secret is absent the store still works — checkout falls back to the
 * client write — but totals are no longer tamper-proof, so `isSecureCheckout()`
 * is surfaced in admin.
 */

export const DB_ROOT =
  process.env.FIREBASE_DB_ROOT || process.env.NEXT_PUBLIC_FIREBASE_DB_ROOT || "rudraksh";

type ServiceAccount = {
  project_id?: string;
  client_email: string;
  private_key: string;
  databaseURL?: string;
};

function readServiceAccount(): ServiceAccount | null {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT ?? "").trim();
  if (!raw) return null;
  try {
    const text = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf-8");
    const parsed = JSON.parse(text) as ServiceAccount;
    if (!parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    console.error("FIREBASE_SERVICE_ACCOUNT is not valid JSON — secure checkout is disabled.");
    return null;
  }
}

export const isSecureCheckout = (): boolean => readServiceAccount() !== null;

function databaseUrl(account: ServiceAccount | null): string {
  const explicit = process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (account?.databaseURL) return account.databaseURL.replace(/\/$/, "");
  const projectId = account?.project_id || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : "";
}

function base64Url(input: ArrayBuffer | Uint8Array | string): string {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signJwt(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope:
        "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claims}`;

  const pem = account.private_key.replace(/\\n/g, "\n");
  const der = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const raw = Uint8Array.from(atob(der), (char) => char.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64Url(signature)}`;
}

type CachedToken = { token: string; expiresAt: number };
let cached: CachedToken | null = null;

async function accessToken(account: ServiceAccount): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const assertion = await signJwt(account);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as { access_token: string; expires_in: number };
  cached = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

function urlFor(account: ServiceAccount, path: string, token?: string): string {
  const root = databaseUrl(account);
  if (!root) throw new Error("No Realtime Database URL configured");
  const clean = path.replace(/^\/+|\/+$/g, "");
  const base = `${root}/${DB_ROOT}/${clean}.json`;
  return token ? `${base}?access_token=${encodeURIComponent(token)}` : base;
}

export async function adminGet<T>(path: string): Promise<T | null> {
  const account = readServiceAccount();
  if (!account) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
  const token = await accessToken(account);
  const response = await fetch(urlFor(account, path, token), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`RTDB read failed (${response.status})`);
  return (await response.json()) as T | null;
}

export async function adminSet(path: string, value: unknown): Promise<void> {
  const account = readServiceAccount();
  if (!account) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
  const token = await accessToken(account);
  const response = await fetch(urlFor(account, path, token), {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(value),
  });
  if (!response.ok) {
    throw new Error(`RTDB write failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
  }
}

export async function adminPush(path: string, value: unknown): Promise<string> {
  const account = readServiceAccount();
  if (!account) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
  const token = await accessToken(account);
  const response = await fetch(urlFor(account, path, token), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(value),
  });
  if (!response.ok) {
    throw new Error(`RTDB push failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
  }
  const result = (await response.json()) as { name?: string } | string;
  if (result && typeof result === "object" && "name" in result && typeof result.name === "string") {
    return result.name;
  }
  return typeof result === "string" ? result : "";
}

/**
 * Adds `delta` to a numeric leaf, atomically.
 *
 * A read-then-write would let two concurrent checkouts both spend the same last
 * unit, so the write is guarded by the node's ETag: if anything changed between
 * our read and our write the server answers 412 and we try again with fresh
 * numbers. Returns the stored value afterwards, or null when the leaf is not a
 * number (an unset stock means "no limit", which we leave alone).
 */
export async function adminAdjustNumber(
  path: string,
  delta: number,
  attempts = 3,
  options: { createIfMissing?: boolean } = {},
): Promise<number | null> {
  const account = readServiceAccount();
  if (!account) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
  const token = await accessToken(account);
  const url = `${urlFor(account, path)}?access_token=${encodeURIComponent(token)}`;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const read = await fetch(url, {
      headers: { "X-Firebase-ETag": "true" },
      cache: "no-store",
    });
    if (!read.ok) throw new Error(`RTDB read failed (${read.status})`);

    const etag = read.headers.get("etag");
    const raw = (await read.json()) as number | string | null;
    // An unset leaf means "no limit" for stock, so it is left alone unless the
    // caller is keeping a counter (`createIfMissing`). `Number(null)` is 0, so
    // without this guard an unlimited product would be written as sold out.
    if (raw === null && !options.createIfMissing) return null;
    const current = raw === null ? 0 : typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(current)) return null;

    const next = Math.max(0, current + delta);
    const write = await fetch(url, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        ...(etag ? { "if-match": etag } : {}),
      },
      body: JSON.stringify(next),
    });

    if (write.ok) return next;
    // 412 means someone else moved the number first — re-read and retry.
    if (write.status !== 412) {
      throw new Error(`RTDB write failed (${write.status}): ${(await write.text()).slice(0, 200)}`);
    }
  }

  throw new Error(`RTDB write kept conflicting on ${path}`);
}

export async function adminUpdate(path: string, value: Record<string, unknown>): Promise<void> {
  const account = readServiceAccount();
  if (!account) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
  const token = await accessToken(account);
  const response = await fetch(urlFor(account, path, token), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(value),
  });
  if (!response.ok) {
    throw new Error(`RTDB update failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
  }
}

/**
 * Writes `value` only when nothing is stored at `path` yet. Returns false when
 * somebody else got there first. Guarded by the node's ETag, so two requests
 * racing for the same key cannot both win — this is what makes "one payment,
 * one order" hold when the browser and the gateway webhook arrive together.
 */
export async function adminCreateIfAbsent(path: string, value: unknown): Promise<boolean> {
  const account = readServiceAccount();
  if (!account) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
  const token = await accessToken(account);
  const url = `${urlFor(account, path)}?access_token=${encodeURIComponent(token)}`;

  const read = await fetch(url, { headers: { "X-Firebase-ETag": "true" }, cache: "no-store" });
  if (!read.ok) throw new Error(`RTDB read failed (${read.status})`);
  if ((await read.json()) !== null) return false;

  const etag = read.headers.get("etag");
  if (!etag) throw new Error("RTDB did not return an ETag");
  const write = await fetch(url, {
    method: "PUT",
    headers: { "content-type": "application/json", "if-match": etag },
    body: JSON.stringify(value),
  });
  if (write.ok) return true;
  if (write.status === 412) return false;
  throw new Error(`RTDB write failed (${write.status}): ${(await write.text()).slice(0, 200)}`);
}

export async function adminDelete(path: string): Promise<void> {
  const account = readServiceAccount();
  if (!account) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
  const token = await accessToken(account);
  const response = await fetch(`${urlFor(account, path)}?access_token=${encodeURIComponent(token)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`RTDB delete failed (${response.status})`);
}
