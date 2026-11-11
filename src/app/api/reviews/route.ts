/**
 * Verified-buyer reviews.
 *
 * POST /api/reviews  { productId, rating, text }   (signed-in caller)
 *
 * A review is only accepted from an account that has a *delivered* order
 * containing the product. The server checks that itself, writes the review
 * (one per customer per product — posting again edits it) and recomputes the
 * product's average. Browsers cannot write reviews directly: the database
 * rules keep the node read-only, so a rating on this site always traces back
 * to a real purchase.
 */
import {
  clientIp,
  crossOriginResponse,
  isSameOrigin,
  rateLimit,
  tooManyRequestsResponse,
} from "@/lib/server/http";
import { callerFrom } from "@/lib/server/id-token";
import { adminGet, adminSet, adminUpdate, isSecureCheckout } from "@/lib/server/rtdb-admin";
import type { Order, Review } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_TEXT = 1000;
const MAX_ORDERS_CHECKED = 60;

const json = (data: unknown, status = 200) => Response.json(data, { status });

/** "Priya Shah" → "Priya S." — enough to feel real, not enough to identify. */
function publicName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Verified buyer";
  const first = parts[0].slice(0, 24);
  const initial = parts.length > 1 ? ` ${parts[parts.length - 1][0].toUpperCase()}.` : "";
  return `${first}${initial}`;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse();

  const gate = await rateLimit(`reviews:${clientIp(request)}`, 10, 10 * 60 * 1000);
  if (!gate.ok) return tooManyRequestsResponse(gate.retryAfter);

  if (!isSecureCheckout()) {
    return json({ ok: false, error: "Reviews are not available right now." }, 503);
  }

  const caller = await callerFrom(request);
  if (!caller) return json({ ok: false, error: "Please sign in to write a review." }, 401);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Could not read the review." }, 400);

  const productId = String(body.productId ?? "").trim();
  const rating = Math.round(Number(body.rating));
  const text = String(body.text ?? "").trim().slice(0, MAX_TEXT);

  if (!/^[A-Za-z0-9_-]{1,120}$/.test(productId)) {
    return json({ ok: false, error: "Unknown product." }, 400);
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return json({ ok: false, error: "Choose a rating from 1 to 5 stars." }, 400);
  }

  try {
    const productName = await adminGet<string>(`products/${productId}/name`);
    if (!productName) return json({ ok: false, error: "Unknown product." }, 404);

    // Find a delivered order of this product on the caller's own account.
    const index = (await adminGet<Record<string, unknown>>(`ordersByUser/${caller.uid}`)) ?? {};
    const orderIds = Object.keys(index).slice(-MAX_ORDERS_CHECKED).reverse();
    let purchase: { order: Order; size: string | null } | null = null;

    for (const orderId of orderIds) {
      const order = await adminGet<Order>(`orders/${orderId}`);
      if (!order || order.user_id !== caller.uid || order.order_status !== "delivered") continue;
      const line = (Array.isArray(order.items) ? order.items : []).find(
        (item) => item?.productId === productId && !item.cancelled,
      );
      if (line) {
        purchase = { order, size: line.size || null };
        break;
      }
    }

    if (!purchase) {
      return json(
        {
          ok: false,
          error: "Reviews are open to customers once their order of this item has been delivered.",
        },
        403,
      );
    }

    const path = `reviews/${productId}/${caller.uid}`;
    const existing = await adminGet<Review>(path);
    const now = new Date().toISOString();

    const review: Review = {
      uid: caller.uid,
      name: publicName(caller.name || purchase.order.customer_name),
      rating,
      text,
      size: purchase.size,
      order_number: purchase.order.order_number,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    await adminSet(path, review);

    // Recompute from the full set so an edit never double counts.
    const all = Object.values((await adminGet<Record<string, Review>>(`reviews/${productId}`)) ?? {});
    const ratings = all.map((entry) => Number(entry?.rating)).filter((value) => value >= 1 && value <= 5);
    const average = ratings.length
      ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
      : 0;
    await adminUpdate(`products/${productId}`, { rating: average, rating_count: ratings.length });

    return json({ ok: true, review, rating: average, rating_count: ratings.length });
  } catch (error) {
    console.error("Review submission failed:", error);
    return json({ ok: false, error: "We could not save your review. Please try again." }, 500);
  }
}
