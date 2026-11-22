/**
 * Catalogue changes that must happen completely or not at all (admins only).
 *
 * POST /api/admin/catalog
 *   { action: "delete-product", id }
 *   { action: "delete-brand", id, confirmName }   confirmName must match the brand's name
 *   { action: "refresh" }                         after a save, refresh search-facing pages
 *
 * Deleting on the server (not from the admin's browser) means a dropped phone
 * connection can never leave half a brand behind, and everything tied to a
 * product goes with it: its photos, reviews, back-in-stock requests and its
 * place in offer banners. Past orders keep their own copy of what was bought,
 * so invoices and order history are unaffected.
 */
import { revalidateTag } from "next/cache";

import { crossOriginResponse, isSameOrigin, rateLimit, tooManyRequestsResponse } from "@/lib/server/http";
import { callerFrom } from "@/lib/server/id-token";
import { deleteMedia, isMediaUrl, referencedMedia } from "@/lib/server/media";
import { adminDelete, adminGet, adminUpdate, isSecureCheckout } from "@/lib/server/rtdb-admin";
import type { Banner, Brand, Product } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const json = (data: unknown, status = 200) => Response.json(data, { status });
const safeId = (value: unknown) => {
  const id = String(value ?? "").trim();
  return /^[A-Za-z0-9_-]{1,120}$/.test(id) ? id : null;
};

const productMedia = (product: Product | null | undefined) =>
  [...(Array.isArray(product?.images) ? product.images : []), product?.image_cutout].filter(isMediaUrl);

const belongsToBrand = (product: Product | null | undefined, brandId: string, brandSlug: string) => {
  if (!product) return false;
  const id = String(product.brand_id ?? "").trim();
  const slug = String(product.brand_slug ?? "").trim();
  return id === brandId || id === brandSlug || slug === brandSlug || slug === brandId;
};

/** Removes the products and everything hanging off them. Returns the photos they used. */
async function removeProducts(ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  const products = (await adminGet<Record<string, Product>>("products")) ?? {};
  const photos = ids.flatMap((id) => productMedia(products[id]));

  // One multi-path write: every product disappears at the same moment.
  await adminUpdate("products", Object.fromEntries(ids.map((id) => [id, null])));
  for (const id of ids) {
    await adminDelete(`reviews/${id}`).catch(() => {});
    await adminDelete(`stockAlerts/${id}`).catch(() => {});
  }

  const banners = (await adminGet<Record<string, Banner>>("banners")) ?? {};
  const gone = new Set(ids);
  for (const [bannerId, banner] of Object.entries(banners)) {
    const list = Array.isArray(banner?.product_ids) ? banner.product_ids : [];
    if (list.some((id) => gone.has(id))) {
      await adminUpdate(`banners/${bannerId}`, { product_ids: list.filter((id) => !gone.has(id)) });
    }
  }
  return photos;
}

/** Deletes photos that nothing else still uses. */
async function removeUnusedPhotos(candidates: string[]): Promise<number> {
  if (!candidates.length) return 0;
  const stillUsed = await referencedMedia();
  return deleteMedia(candidates.filter((url) => !stillUsed.has(url)));
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse();
  if (!isSecureCheckout()) return json({ ok: false, error: "The server credentials are not set up." }, 503);

  const caller = await callerFrom(request);
  if (!caller) return json({ ok: false, error: "Sign in required." }, 401);
  const gate = await rateLimit(`catalog:${caller.uid}`, 60, 10 * 60 * 1000);
  if (!gate.ok) return tooManyRequestsResponse(gate.retryAfter);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = String(body?.action ?? "");

  try {
    if (!(await adminGet<unknown>(`admins/${caller.uid}`))) return json({ ok: false, error: "Admins only." }, 403);

    if (action === "refresh") {
      revalidateTag("catalog", { expire: 0 });
      return json({ ok: true });
    }

    if (action === "delete-product") {
      const id = safeId(body?.id);
      if (!id) return json({ ok: false, error: "Unknown product." }, 400);
      const exists = await adminGet<Product>(`products/${id}`);
      if (!exists) return json({ ok: false, error: "That product was already deleted." }, 404);
      const photos = await removeProducts([id]);
      const photosRemoved = await removeUnusedPhotos(photos);
      revalidateTag("catalog", { expire: 0 });
      console.info(`Product ${id} deleted by admin ${caller.uid}`);
      return json({ ok: true, deletedProducts: 1, photosRemoved });
    }

    if (action === "delete-brand") {
      const id = safeId(body?.id);
      if (!id) return json({ ok: false, error: "Unknown brand." }, 400);
      const brand = await adminGet<Brand>(`brands/${id}`);
      if (!brand) return json({ ok: false, error: "That brand was already deleted." }, 404);

      // The typed name is the confirmation: deleting a brand removes its products too.
      const typed = String(body?.confirmName ?? "").trim().toLowerCase();
      if (typed !== String(brand.name ?? "").trim().toLowerCase()) {
        return json({ ok: false, error: `Type the brand name “${brand.name}” exactly to confirm.` }, 400);
      }

      const slug = String(brand.slug || id).trim();
      const products = (await adminGet<Record<string, Product>>("products")) ?? {};
      const owned = Object.keys(products).filter((productId) => belongsToBrand(products[productId], id, slug));

      const photos = await removeProducts(owned);
      await adminDelete(`brands/${id}`);
      const photosRemoved = await removeUnusedPhotos([...photos, ...(isMediaUrl(brand.logo) ? [brand.logo] : [])]);
      revalidateTag("catalog", { expire: 0 });
      console.info(`Brand ${id} and ${owned.length} product(s) deleted by admin ${caller.uid}`);
      return json({ ok: true, brandName: brand.name, deletedProducts: owned.length, photosRemoved });
    }

    return json({ ok: false, error: "Unknown action." }, 400);
  } catch (error) {
    console.error("Catalogue change failed:", error);
    return json({ ok: false, error: "That could not be completed. Please try again." }, 500);
  }
}
