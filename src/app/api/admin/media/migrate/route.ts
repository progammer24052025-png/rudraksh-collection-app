/**
 * One-time move of pictures into photo storage (admins only).
 *
 * POST /api/admin/media/migrate
 *
 * Brand logos and collection covers used to be saved as long text inside
 * their records, which made the brand list several megabytes and slow on
 * phones. This moves every such picture — and any in products or banners —
 * into photo storage and replaces it with a short /media/… address. Safe to
 * run again: already-moved pictures are left alone.
 *
 * It also lists products whose photo points at a file that was never uploaded
 * (the old "commit this file" flow), so those can be uploaded again.
 */
import { revalidateTag } from "next/cache";

import { crossOriginResponse, isSameOrigin } from "@/lib/server/http";
import { callerFrom } from "@/lib/server/id-token";
import { dataUrlToMedia, isMediaUrl } from "@/lib/server/media";
import { adminGet, adminUpdate, isSecureCheckout } from "@/lib/server/rtdb-admin";
import type { Banner, Brand, Category, Product } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const json = (data: unknown, status = 200) => Response.json(data, { status });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse();
  if (!isSecureCheckout()) return json({ ok: false, error: "Photo storage is not set up on the server." }, 503);
  const caller = await callerFrom(request);
  if (!caller) return json({ ok: false, error: "Sign in required." }, 401);

  try {
    if (!(await adminGet<unknown>(`admins/${caller.uid}`))) return json({ ok: false, error: "Admins only." }, 403);

    let moved = 0;
    const missing: string[] = [];

    const brands = (await adminGet<Record<string, Brand>>("brands")) ?? {};
    for (const [id, brand] of Object.entries(brands)) {
      const logo = await dataUrlToMedia(brand?.logo, `${brand?.name ?? id} logo`);
      if (logo.moved) {
        await adminUpdate(`brands/${id}`, { logo: logo.value });
        moved += 1;
      }
    }

    const categories = (await adminGet<Record<string, Category>>("categories")) ?? {};
    for (const [id, category] of Object.entries(categories)) {
      const image = await dataUrlToMedia(category?.image, `${category?.name ?? id} cover`);
      if (image.moved) {
        await adminUpdate(`categories/${id}`, { image: image.value });
        moved += 1;
      }
    }

    const banners = (await adminGet<Record<string, Banner>>("banners")) ?? {};
    for (const [id, banner] of Object.entries(banners)) {
      const image = await dataUrlToMedia(banner?.image, `${banner?.title ?? id} banner`);
      if (image.moved) {
        await adminUpdate(`banners/${id}`, { image: image.value });
        moved += 1;
      }
    }

    const products = (await adminGet<Record<string, Product>>("products")) ?? {};
    for (const [id, product] of Object.entries(products)) {
      if (!product) continue;
      const patch: Record<string, unknown> = {};
      const images: string[] = [];
      let changed = false;
      for (const [index, src] of (Array.isArray(product.images) ? product.images : []).entries()) {
        const next = await dataUrlToMedia(src, `${product.name} ${index + 1}`);
        if (next.moved) {
          changed = true;
          moved += 1;
        }
        images.push(String(next.value));
      }
      if (changed) patch.images = images;
      const cutout = await dataUrlToMedia(product.image_cutout, `${product.name} cut-out`);
      if (cutout.moved) {
        patch.image_cutout = cutout.value;
        moved += 1;
      }
      if (Object.keys(patch).length) await adminUpdate(`products/${id}`, patch);

      // A local path that is not a stored photo was never uploaded anywhere.
      const broken = images.some((src) => src.startsWith("/") && !isMediaUrl(src));
      if (broken) missing.push(product.name || id);
    }

    revalidateTag("catalog", { expire: 0 });
    return json({ ok: true, moved, missing });
  } catch (error) {
    console.error("Picture move failed:", error);
    return json({ ok: false, error: "The move stopped part-way. It is safe to run it again." }, 500);
  }
}
