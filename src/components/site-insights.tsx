"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Vercel Web Analytics and Speed Insights (free tier, no cookies).
 *
 * Vercel's dashboard shows traffic and real-phone page speed; the store's own
 * dashboard in Admin → Analytics shows sales-side numbers. Admin pages are
 * never recorded, and query strings are dropped before anything is sent,
 * because links such as /invoice?order=… carry order numbers.
 *
 * Collects nothing until Web Analytics and Speed Insights are switched on for
 * the project in the Vercel dashboard.
 */
function scrub(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/admin")) return null;
    // Keep `category` and `brand` on the shop page: they say what people browse, not who they are.
    const keep = new URLSearchParams();
    if (parsed.pathname === "/products") {
      for (const name of ["category", "brand"]) {
        const value = parsed.searchParams.get(name);
        if (value) keep.set(name, value);
      }
    }
    parsed.search = keep.toString();
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function beforeSend<T extends { url: string }>(event: T): T | null {
  const url = scrub(event.url);
  return url ? { ...event, url } : null;
}

export function SiteInsights() {
  return (
    <>
      <Analytics beforeSend={(event: BeforeSendEvent) => beforeSend(event)} />
      <SpeedInsights beforeSend={(event) => beforeSend(event)} />
    </>
  );
}
