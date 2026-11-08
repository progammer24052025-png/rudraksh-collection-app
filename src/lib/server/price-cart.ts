/**
 * Server-side repricing of a bag.
 *
 * The COD checkout route and the Razorpay order route both price through here,
 * read-only from the Realtime Database, so the amount charged by the gateway is
 * always the amount the order records. Nothing the browser sends about money is
 * trusted.
 */
import {
  computeTotals,
  normalizePricing,
  type PricingConfig,
  type PricingLine,
  type Totals,
} from "@/lib/pricing";
import { DB_ROOT } from "@/lib/server/rtdb-admin";
import type { Coupon, Order, Product, StoreSettings } from "@/lib/types";

export type CartItemInput = {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
};

export type CartRequest = {
  user_id?: string | null;
  coupon_code?: string | null;
  items?: CartItemInput[];
};

export type PricedCart = {
  totals: Totals;
  config: PricingConfig;
  orderItems: Order["items"];
  coupon: Coupon | null;
  /** The coupon that actually applied — null when none was sent or it was rejected. */
  appliedCoupon: Coupon | null;
  settings: StoreSettings;
};

export type PricedCartResult =
  | { ok: true; cart: PricedCart }
  | { ok: false; status: number; error: string; totals?: Totals };

export function databaseUrl(): string {
  const explicit = process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : "";
}

export async function publicGet<T>(path: string): Promise<T | null> {
  const root = databaseUrl();
  if (!root) return null;
  const response = await fetch(`${root}/${DB_ROOT}/${path}.json`, { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as T | null;
}

export function orderNumber(now = new Date()): string {
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RC-${date}-${random}`;
}

export const digits = (value: string) => value.replace(/\D/g, "");

export async function priceCart(body: CartRequest): Promise<PricedCartResult> {
  const items = body.items ?? [];
  if (!items.length) {
    return { ok: false, status: 400, error: "Your bag is empty." };
  }

  // Catalogue prices come from the database, never from the request body.
  const products = (await publicGet<Record<string, Product>>("products")) ?? {};
  const lines: PricingLine[] = [];
  const orderItems: Order["items"] = [];

  for (const item of items) {
    const product = products[item.productId];
    const quantity = Math.floor(Number(item.quantity));
    if (!product || !Number.isFinite(quantity) || quantity < 1 || quantity > 20) {
      return {
        ok: false,
        status: 409,
        error: "One of the items is no longer available. Refresh your bag.",
      };
    }
    const price =
      typeof product.sale_price === "number" && product.sale_price > 0
        ? product.sale_price
        : product.price;

    lines.push({ productId: item.productId, name: product.name, price, quantity });
    orderItems.push({
      productId: item.productId,
      name: product.name,
      brand: product.brand_name ?? "",
      size: item.size ?? "",
      color: item.color ?? "",
      quantity,
      price,
      image: product.images?.[0] ?? "",
    });
  }

  const settings = (await publicGet<StoreSettings>("settings")) ?? {};
  const config = normalizePricing({
    freeShippingThreshold: settings.freeShippingThreshold,
    shippingFee: settings.shippingFee,
    tax: settings.tax,
  });

  let coupon: Coupon | null = null;
  const code = (body.coupon_code ?? "").trim().toUpperCase();
  if (code) {
    const coupons = (await publicGet<Record<string, Coupon>>("coupons")) ?? {};
    coupon = coupons[code] ?? null;
    if (!coupon) {
      // Case-insensitive fallback for codes stored with mixed case.
      const match = Object.entries(coupons).find(([key]) => key.toUpperCase() === code);
      coupon = match ? match[1] : null;
    }
  }

  const totals = computeTotals({ lines, coupon, config });
  const appliedCoupon = totals.couponCode ? coupon : null;

  if (code && !appliedCoupon) {
    return {
      ok: false,
      status: 409,
      error: "That coupon code is not valid for this order.",
      totals,
    };
  }

  return { ok: true, cart: { totals, config, orderItems, coupon, appliedCoupon, settings } };
}
