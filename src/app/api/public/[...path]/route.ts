/**
 * The shop's public data (catalogue, brands, settings, offers, reviews),
 * served from Vercel's cache instead of a live database connection per visitor.
 *
 * GET /api/public/products            GET /api/public/products/{id}
 * GET /api/public/reviews/{productId}  …
 *
 * Why: the free Firebase plan allows about 100 open connections at once and
 * 10 GB of downloads a month. A shopper used to hold a live connection for as
 * long as the tab stayed open and download the whole catalogue on every page.
 * Now the CDN answers almost every request; the database is read at most once
 * every few minutes per path, or right after an admin saves (tag "catalog").
 *
 * Reads are anonymous, so the database rules still decide what is public —
 * this route can never show more than a visitor could already read.
 */
import { unstable_cache } from "next/cache";

import { DB_ROOT } from "@/lib/server/rtdb-admin";

/** Public roots and how long the server keeps each one between database reads. */
const ROOTS: Record<string, { revalidate: number; tags: string[]; cdn: number }> = {
  products: { revalidate: 600, tags: ["catalog"], cdn: 15 },
  brands: { revalidate: 600, tags: ["catalog"], cdn: 15 },
  categories: { revalidate: 600, tags: ["catalog"], cdn: 15 },
  banners: { revalidate: 600, tags: ["catalog"], cdn: 15 },
  settings: { revalidate: 600, tags: ["catalog"], cdn: 15 },
  coupons: { revalidate: 300, tags: ["catalog"], cdn: 15 },
  reviews: { revalidate: 300, tags: ["catalog", "reviews"], cdn: 15 },
};

const SEGMENT = /^[A-Za-z0-9_-]{1,160}$/;

/**
 * Pictures saved inside records (`data:` text, from before photo storage)
 * made the brand list 7 MB, so every shopper waited for it. Large ones are
 * left out here; the shop shows the brand name instead. Admin → Settings →
 * "Move pictures to photo storage" turns them into real photo addresses.
 */
const MAX_EMBEDDED_PICTURE = 20_000;

function withoutEmbeddedPictures(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutEmbeddedPictures);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" && entry.startsWith("data:") && entry.length > MAX_EMBEDDED_PICTURE) continue;
    out[key] = withoutEmbeddedPictures(entry);
  }
  return out;
}

function databaseUrl(): string {
  const explicit = process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : "";
}

const notFound = () =>
  Response.json({ error: "Not found" }, { status: 404, headers: { "cache-control": "public, max-age=60" } });

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const root = path?.[0] ?? "";
  const config = ROOTS[root];
  if (!config || path.length > 3 || !path.every((segment) => SEGMENT.test(segment))) return notFound();

  const base = databaseUrl();
  if (!base) return Response.json(null, { status: 503 });

  let value: unknown = null;
  try {
    // The trimmed result is what gets cached: the raw read can be larger than
    // the 2 MB the server cache accepts (old pictures stored inside records).
    const read = unstable_cache(
      async (): Promise<{ status: number; value?: unknown }> => {
        const response = await fetch(`${base}/${DB_ROOT}/${path.join("/")}.json`, { cache: "no-store" });
        if (!response.ok) return { status: response.status };
        return { status: 200, value: withoutEmbeddedPictures(await response.json()) };
      },
      ["public-data", ...path],
      { revalidate: config.revalidate, tags: config.tags },
    );
    const result = await read();
    if (result.status === 401 || result.status === 403) return notFound();
    if (result.status !== 200) {
      return Response.json(null, { status: 502, headers: { "cache-control": "no-store" } });
    }
    value = result.value;
  } catch {
    return Response.json(null, { status: 502, headers: { "cache-control": "no-store" } });
  }

  return Response.json(value ?? null, {
    headers: {
      // Browsers always ask again; the CDN keeps a copy for 15 seconds only and
      // never serves an older one, so an admin change reaches every shopper
      // within 15 seconds. Behind the CDN, the server's copy is replaced the
      // moment an admin saves, so the database is still read only rarely.
      "cache-control": `public, max-age=0, s-maxage=${config.cdn}`,
      "x-content-type-options": "nosniff",
    },
  });
}
