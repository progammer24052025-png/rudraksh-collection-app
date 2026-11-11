/**
 * Shared request guards for the API routes.
 *
 * Two things every mutating route needs and none of them had: a caller identity
 * for throttling, and a check that the request really came from our own pages
 * rather than a stranger's tab.
 *
 * The throttle is shared through the database when the service account is
 * configured, and falls back to a per-instance counter otherwise.
 */

import { adminAdjustNumber, adminDelete, isSecureCheckout } from "@/lib/server/rtdb-admin";

export function clientIp(request: Request): string {
  // Vercel rewrites these; Cloudflare sets its own. Only fall back to
  // `x-forwarded-for` and then take the *last* hop, because earlier entries are
  // whatever the caller felt like sending — a spoofed header must not buy a
  // fresh rate-limit budget.
  const cloudflare = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflare) return cloudflare;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }

  return "unknown";
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateResult = { ok: true } | { ok: false; retryAfter: number };

/** Per-instance counter: the fallback when the shared store is unavailable. */
function memoryRateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();

  if (buckets.size > 5000) {
    for (const [existing, bucket] of buckets) {
      if (now > bucket.resetAt) buckets.delete(existing);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  bucket.count += 1;
  if (bucket.count <= limit) return { ok: true };

  return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
}

async function hashKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest).slice(0, 16), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Counts one hit against `key`. Returns `retryAfter` in seconds when the caller
 * is over the limit, so the route can answer with a useful 429.
 *
 * On a serverless host every instance has its own memory, so an in-memory
 * counter alone lets a caller multiply their budget by the number of warm
 * instances. When the service account is configured the count is kept in the
 * database instead (`rateLimits/{window}/{hashed key}`, incremented atomically),
 * which every instance shares. The key is hashed so no IP address is stored.
 * If the shared store cannot be reached the per-instance counter still applies.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateResult> {
  const local = memoryRateLimit(key, limit, windowMs);
  if (!local.ok || !isSecureCheckout()) return local;

  try {
    const now = Date.now();
    const windowIndex = Math.floor(now / windowMs);
    const bucketPath = (index: number) => `rateLimits/${windowMs}_${index}`;
    const count = await adminAdjustNumber(
      `${bucketPath(windowIndex)}/${await hashKey(key)}`,
      1,
      3,
      { createIfMissing: true },
    );

    // First hit of a window for this caller: sweep a long-finished window so
    // the node never grows without bound.
    if (count === 1) {
      await adminDelete(bucketPath(windowIndex - 2)).catch(() => {});
    }

    if (count !== null && count > limit) {
      const resetAt = (windowIndex + 1) * windowMs;
      return { ok: false, retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
    }
  } catch (error) {
    console.warn("Shared rate limit unavailable, using the per-instance counter:", error);
  }
  return { ok: true };
}

/**
 * Rejects cross-site form posts. Requests with no `Origin` (curl, server-to-server)
 * are allowed: an origin check cannot constrain them, and blocking them would only
 * break deploys and tests while changing nothing for a browser-based attacker.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host = request.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    if (host && originHost === host) return true;

    // The configured site URL may hold several comma-separated hosts.
    const configured = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
    for (const entry of configured.split(",").map((value) => value.trim())) {
      if (!entry) continue;
      try {
        if (new URL(entry).host === originHost) return true;
      } catch {
        /* a malformed entry must not allow anything */
      }
    }

    // Vercel previews serve the same build from a generated host.
    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel && originHost === vercel) return true;
  } catch {
    return false;
  }
  return false;
}

/** Standard "not your page" answer for a mutating route. */
export function crossOriginResponse(): Response {
  return Response.json({ ok: false, error: "This request came from another site." }, { status: 403 });
}

/** Standard "slow down" answer. */
export function tooManyRequestsResponse(retryAfter: number): Response {
  return Response.json(
    { ok: false, error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "retry-after": String(retryAfter), "cache-control": "no-store" } },
  );
}
