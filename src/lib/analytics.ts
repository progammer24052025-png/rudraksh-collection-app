/**
 * The store's own visitor analytics — what is recorded and how it is summed.
 *
 * Privacy by construction: a hit holds a cleaned page path, the referring
 * site's host name, a device class, and two yes/no flags (first page of this
 * visit, first visit on this device). No IP address, cookie, account id,
 * order number or free-form text from the URL is ever stored, so the data
 * cannot identify a customer even if it leaked.
 *
 * Pure functions only, shared by the browser beacon, the collector route, the
 * nightly roll-up and the admin dashboard.
 */

export const EVENTS = ["page_view", "add_to_cart", "begin_checkout", "purchase", "search"] as const;
export type AnalyticsEvent = (typeof EVENTS)[number];
export type Device = "mobile" | "tablet" | "desktop";

/** One raw hit, as stored under `analytics/hits/{day}/{pushId}`. */
export type Hit = {
  /** Event name. */
  e: AnalyticsEvent;
  /** Cleaned page path, e.g. "/products/boys-shirt". */
  p: string;
  /** Traffic source: a referring host ("google.com"), a campaign tag, or "direct". */
  r: string;
  d: Device;
  /** 1 on the first page of a browsing session. */
  s?: 1;
  /** 1 on the first visit from this device. */
  n?: 1;
  /** Search term (searches only), already cleaned. */
  q?: string;
  /** Milliseconds since epoch, set by the server. */
  t: number;
};

/** One day, summed. Stored under `analytics/daily/{day}` by the nightly roll-up. */
export type DaySummary = {
  views: number;
  sessions: number;
  newVisitors: number;
  pages: Record<string, number>;
  sources: Record<string, number>;
  devices: Record<string, number>;
  events: Record<string, number>;
  searches: Record<string, number>;
};

/** Pages never recorded: private, per-customer or meaningless to count. */
const PRIVATE_PREFIXES = ["/admin", "/account", "/invoice", "/api", "/checkout/success"];
const MAX_PATH = 120;
const TOP_N = 60;

/** Calendar day in India, "YYYY-MM-DD" — the store's business day. */
export function istDay(time: number = Date.now()): string {
  return new Date(time + 5.5 * 3600_000).toISOString().slice(0, 10);
}

/**
 * Cleans a page address down to something safe to keep: the path only, plus
 * the shop's `category` / `brand` filters. Returns null for pages that are
 * never recorded.
 */
export function cleanPath(pathname: string, search = ""): string | null {
  const path = (pathname || "/").split("#")[0].split("?")[0].replace(/\/+$/, "") || "/";
  if (!/^\/[A-Za-z0-9/_\-.]*$/.test(path) || path.length > MAX_PATH) return null;
  if (PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null;
  if (path === "/products") {
    const params = new URLSearchParams(search);
    for (const name of ["category", "brand"]) {
      const value = params.get(name);
      if (value && /^[a-z0-9-]{1,48}$/.test(value)) return `/products?${name}=${value}`;
    }
  }
  return path;
}

/**
 * Where a visit came from. A campaign tag (?utm_source=instagram) wins; then
 * the referring site's host; anything else is "direct". Only a short,
 * lower-case label is kept.
 */
export function cleanSource(referrer: string, ownHost: string, utmSource?: string | null): string {
  const tag = (utmSource ?? "").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 32);
  if (tag) return `campaign:${tag}`;
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "").replace(/^l\./, "");
    if (!host || host === ownHost.replace(/^www\./, "")) return "direct";
    // Collapse the many Google and Facebook domains into one label each.
    if (/(^|\.)google\./.test(host)) return "google";
    if (/(^|\.)(facebook|fb)\.com$/.test(host)) return "facebook";
    if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
    if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(host)) return "whatsapp";
    if (/(^|\.)bing\.com$/.test(host)) return "bing";
    return /^[a-z0-9.-]{1,64}$/.test(host) ? host : "other";
  } catch {
    return "direct";
  }
}

/**
 * A search term worth counting, or null. Terms that look like personal data
 * (long digit runs, e-mail addresses) are dropped, never stored.
 */
export function cleanSearch(term: string): string | null {
  const value = term.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 40);
  if (value.length < 2) return null;
  if (/\d{5,}/.test(value) || value.includes("@")) return null;
  return value.replace(/[^\p{L}\p{N} '&-]/gu, "").trim() || null;
}

export function deviceFor(width: number): Device {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/** Firebase keys cannot hold `. / # $ [ ]`, so map keys are percent-encoded. */
export const encodeKey = (value: string) =>
  encodeURIComponent(value).replace(/\./g, "%2E").slice(0, 300) || "_";
export const decodeKey = (key: string) => {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
};

export const emptySummary = (): DaySummary => ({
  views: 0,
  sessions: 0,
  newVisitors: 0,
  pages: {},
  sources: {},
  devices: {},
  events: {},
  searches: {},
});

const bump = (map: Record<string, number>, key: string, by = 1) => {
  const k = encodeKey(key);
  map[k] = (map[k] ?? 0) + by;
};

/** Keeps the largest entries so one day's summary stays small. */
function top(map: Record<string, number>, n = TOP_N): Record<string, number> {
  return Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n));
}

/** Sums one day's raw hits. */
export function summarise(hits: Iterable<Partial<Hit>>): DaySummary {
  const day = emptySummary();
  for (const hit of hits) {
    if (!hit || typeof hit.e !== "string") continue;
    bump(day.events, hit.e);
    if (hit.e === "search" && hit.q) bump(day.searches, hit.q);
    if (hit.e !== "page_view") continue;
    day.views += 1;
    if (hit.p) bump(day.pages, hit.p);
    if (hit.s) {
      // Sources and devices are counted once per visit, not once per page.
      day.sessions += 1;
      bump(day.sources, hit.r || "direct");
      bump(day.devices, hit.d || "desktop");
    }
    if (hit.n) day.newVisitors += 1;
  }
  return {
    ...day,
    pages: top(day.pages),
    sources: top(day.sources),
    searches: top(day.searches, 40),
  };
}

/** Adds several days together, for the dashboard's chosen range. */
export function combine(days: DaySummary[]): DaySummary {
  const total = emptySummary();
  const add = (into: Record<string, number>, from: Record<string, number> | undefined) => {
    for (const [key, count] of Object.entries(from ?? {})) into[key] = (into[key] ?? 0) + (Number(count) || 0);
  };
  for (const day of days) {
    total.views += Number(day.views) || 0;
    total.sessions += Number(day.sessions) || 0;
    total.newVisitors += Number(day.newVisitors) || 0;
    add(total.pages, day.pages);
    add(total.sources, day.sources);
    add(total.devices, day.devices);
    add(total.events, day.events);
    add(total.searches, day.searches);
  }
  return total;
}

/** A map's entries, decoded and largest first. */
export function ranked(map: Record<string, number>, limit = 10): Array<{ key: string; count: number }> {
  return Object.entries(map)
    .map(([key, count]) => ({ key: decodeKey(key), count: Number(count) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
