"use client";

/**
 * Browser side of the store's own analytics. Sends tiny, anonymous hits to
 * /api/track; see src/lib/analytics.ts for exactly what is kept.
 *
 * Nothing is sent when the shopper's browser asks not to be tracked (Global
 * Privacy Control or Do Not Track), or from a device an admin has signed in on,
 * so the owner's own browsing does not inflate the numbers.
 */
import { cleanPath, cleanSearch, cleanSource, deviceFor, type AnalyticsEvent } from "./analytics";

const SESSION_KEY = "rc-visit";
const SEEN_KEY = "rc-seen";
export const NO_TRACK_KEY = "rc-no-track";

function optedOut(): boolean {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean; doNotTrack?: string | null };
    if (nav.globalPrivacyControl || nav.doNotTrack === "1") return true;
    return window.localStorage.getItem(NO_TRACK_KEY) === "1";
  } catch {
    return false;
  }
}

/** Source and flags for this browsing session, worked out on its first page. */
function visit(): { source: string; first: boolean; newVisitor: boolean } {
  try {
    const saved = window.sessionStorage.getItem(SESSION_KEY);
    if (saved) return { source: saved, first: false, newVisitor: false };
    const utm = new URLSearchParams(window.location.search).get("utm_source");
    const source = cleanSource(document.referrer, window.location.hostname, utm);
    window.sessionStorage.setItem(SESSION_KEY, source);
    const newVisitor = !window.localStorage.getItem(SEEN_KEY);
    if (newVisitor) window.localStorage.setItem(SEEN_KEY, "1");
    return { source, first: true, newVisitor };
  } catch {
    return { source: "direct", first: false, newVisitor: false };
  }
}

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  } catch {
    /* fall through */
  }
  fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(
    () => {},
  );
}

/** Records one event against the current page. Safe to call anywhere. */
export function trackEvent(event: AnalyticsEvent, detail: { query?: string } = {}) {
  if (typeof window === "undefined" || optedOut()) return;
  const path = cleanPath(window.location.pathname, window.location.search);
  if (!path) return;
  const { source, first, newVisitor } = event === "page_view" ? visit() : { ...visit(), first: false, newVisitor: false };
  const payload: Record<string, unknown> = {
    e: event,
    p: path,
    r: source,
    d: deviceFor(window.innerWidth),
  };
  if (first) payload.s = 1;
  if (newVisitor) payload.n = 1;
  if (event === "search") {
    const query = cleanSearch(detail.query ?? "");
    if (!query) return;
    payload.q = query;
  }
  send(payload);
}

/** Called when an admin signs in or out on this device. */
export function setAdminDevice(isAdmin: boolean) {
  try {
    if (isAdmin) window.localStorage.setItem(NO_TRACK_KEY, "1");
  } catch {
    /* storage may be disabled */
  }
}
