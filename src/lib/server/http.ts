/**
 * Shared request guards for the API routes.
 *
 * Two things every mutating route needs and none of them had: a caller identity
 * for throttling, and a check that the request really came from our own pages
 * rather than a stranger's tab.
 *
 * The throttle is in-memory and therefore per instance, which is enough to stop
 * a scripted loop from draining the database or the gateway quota. A shared
 * store would be stronger; nothing here pretends to be that.
 */

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

/**
 * Counts one hit against `key`. Returns `retryAfter` in seconds when the caller
 * is over the limit, so the route can answer with a useful 429.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
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

    const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
    if (configured && originHost === new URL(configured).host) return true;

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
