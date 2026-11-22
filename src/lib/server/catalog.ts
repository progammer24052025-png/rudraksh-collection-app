/**
 * Read-only catalogue access for server rendering (page metadata, structured
 * data and the sitemap). Uses the public REST endpoint — the same data any
 * visitor can read — and caches for a few minutes so crawlers and link
 * previews do not hit the database on every request.
 */
import { revalidateTag } from "next/cache";

import { DB_ROOT } from "@/lib/server/rtdb-admin";
import type { Product, StoreSettings } from "@/lib/types";

const REVALIDATE_SECONDS = 300;

function databaseUrl(): string {
  const explicit = process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : "";
}

async function get<T>(path: string, query = ""): Promise<T | null> {
  const root = databaseUrl();
  if (!root) return null;
  try {
    const response = await fetch(`${root}/${DB_ROOT}/${path}.json${query ? `?${query}` : ""}`, {
      // Tagged so admin saves and deletes can refresh pages at once.
      next: { revalidate: REVALIDATE_SECONDS, tags: ["catalog"] },
    });
    if (!response.ok) return null;
    return (await response.json()) as T | null;
  } catch {
    return null;
  }
}

/** One active product by slug (or by id for records keyed differently). */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const key = (slug ?? "").trim();
  if (!key || !/^[A-Za-z0-9_-]{1,160}$/.test(key)) return null;

  const matches = await get<Record<string, Product>>(
    "products",
    `orderBy=${encodeURIComponent('"slug"')}&equalTo=${encodeURIComponent(JSON.stringify(key))}&limitToFirst=1`,
  );
  const entry = matches ? Object.entries(matches)[0] : undefined;
  if (entry) return { ...entry[1], id: entry[1].id || entry[0] };

  const byKey = await get<Product>(`products/${key}`);
  return byKey ? { ...byKey, id: byKey.id || key } : null;
}

/** Every active product, for the sitemap. */
export async function getActiveProducts(): Promise<Product[]> {
  const all = (await get<Record<string, Product>>("products")) ?? {};
  return Object.entries(all)
    .map(([id, product]) => ({ ...product, id: product.id || id }))
    .filter((product) => product && product.status === "active" && product.slug);
}

/** The store's public settings (contact details, hours), for page metadata. */
export async function getStoreSettings(): Promise<StoreSettings | null> {
  return get<StoreSettings>("settings");
}

/**
 * Marks the cached shop data as stale after the server changes it (stock after
 * an order or cancellation, a product's rating after a review), so shoppers see
 * the change within seconds. Never throws: a stale copy refreshes on its own.
 */
export function refreshCatalog(): void {
  try {
    revalidateTag("catalog", { expire: 0 });
  } catch (error) {
    console.warn("Could not refresh the cached catalogue:", error);
  }
}
