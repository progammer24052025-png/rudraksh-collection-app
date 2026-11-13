/**
 * The store's own analytics collector.
 *
 * POST /api/track  { e, p, r, d, s?, n?, q? }   (sent by the browser beacon)
 *
 * Every field is re-checked here: only known events, cleaned paths, short
 * source labels and yes/no flags are kept, so nothing personal can be stored
 * even by a hand-crafted request. Bots are ignored. Hits are appended under
 * `analytics/hits/{day}`; the nightly job sums each finished day into
 * `analytics/daily/{day}` and deletes the raw hits. The database rules make
 * the whole `analytics` node server-write and admin-read only.
 */
import { EVENTS, cleanPath, cleanSearch, istDay, type AnalyticsEvent, type Hit } from "@/lib/analytics";
import { clientIp, isSameOrigin, memoryRateLimit } from "@/lib/server/http";
import { adminPush, isSecureCheckout } from "@/lib/server/rtdb-admin";

export const dynamic = "force-dynamic";

const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl|wget|python|axios|node-fetch/i;
const DEVICES = new Set(["mobile", "tablet", "desktop"]);
const done = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  if (!isSameOrigin(request) || !isSecureCheckout()) return done();
  if (BOTS.test(request.headers.get("user-agent") ?? "")) return done();
  // Per-instance limit only: a shared counter would cost two database writes
  // per page view, more than the hit itself.
  if (!memoryRateLimit(`track:${clientIp(request)}`, 120, 10 * 60 * 1000).ok) return done();

  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > 1024) return done();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return done();
  }

  const event = String(body.e ?? "") as AnalyticsEvent;
  if (!EVENTS.includes(event)) return done();

  const [pathname, search = ""] = String(body.p ?? "").split("?");
  const path = cleanPath(pathname, search ? `?${search}` : "");
  if (!path) return done();

  const source = String(body.r ?? "direct");
  const hit: Hit = {
    e: event,
    p: path,
    r: /^(campaign:)?[a-z0-9._-]{1,64}$/.test(source) ? source : "other",
    d: DEVICES.has(String(body.d)) ? (String(body.d) as Hit["d"]) : "desktop",
    t: Date.now(),
    ...(body.s === 1 ? { s: 1 as const } : {}),
    ...(body.n === 1 ? { n: 1 as const } : {}),
  };
  if (event === "search") {
    const term = cleanSearch(String(body.q ?? ""));
    if (!term) return done();
    hit.q = term;
  }

  try {
    await adminPush(`analytics/hits/${istDay(hit.t)}`, hit);
  } catch (error) {
    console.warn("Analytics hit not stored:", error);
  }
  return done();
}
