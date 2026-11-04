import type { Coupon } from "@/lib/types";

/**
 * One price engine, used by the checkout UI *and* by the server route.
 * The server recomputes everything from database prices — the browser never
 * gets to dictate a total.
 */

export const DEFAULT_FREE_SHIPPING_THRESHOLD = 999;
export const DEFAULT_SHIPPING_FEE = 99;
export const DEFAULT_TAX_RATE = 0.05;

export interface PricingLine {
  productId: string;
  name: string;
  /** Effective unit price (sale price wins over MRP). */
  price: number;
  quantity: number;
}

export interface PricingConfig {
  freeShippingThreshold: number;
  shippingFee: number;
  tax: {
    enabled: boolean;
    /** Fraction, e.g. 0.05 for 5%. */
    rate: number;
    /** True when displayed prices already include GST. */
    inclusive: boolean;
    label: string;
  };
}

export interface Totals {
  subtotal: number;
  discount: number;
  /** Amount GST is calculated on, after discount. */
  taxableBase: number;
  /** GST portion. When inclusive this is contained in the price, not added. */
  tax: number;
  shipping: number;
  total: number;
  couponCode: string | null;
  /** How much more the customer must spend for free shipping (0 when reached). */
  freeShippingRemaining: number;
}

export const DEFAULT_PRICING: PricingConfig = {
  freeShippingThreshold: DEFAULT_FREE_SHIPPING_THRESHOLD,
  shippingFee: DEFAULT_SHIPPING_FEE,
  tax: { enabled: true, rate: DEFAULT_TAX_RATE, inclusive: true, label: "GST" },
};

export function normalizePricing(input?: {
  freeShippingThreshold?: number | null;
  shippingFee?: number | null;
  tax?: Partial<PricingConfig["tax"]> | null;
}): PricingConfig {
  const tax = input?.tax ?? {};
  const rate = typeof tax.rate === "number" && tax.rate >= 0 && tax.rate < 1 ? tax.rate : DEFAULT_TAX_RATE;
  return {
    freeShippingThreshold:
      typeof input?.freeShippingThreshold === "number" && input.freeShippingThreshold >= 0
        ? input.freeShippingThreshold
        : DEFAULT_FREE_SHIPPING_THRESHOLD,
    shippingFee:
      typeof input?.shippingFee === "number" && input.shippingFee >= 0
        ? input.shippingFee
        : DEFAULT_SHIPPING_FEE,
    tax: {
      enabled: tax.enabled ?? true,
      rate,
      inclusive: tax.inclusive ?? true,
      label: tax.label?.trim() || "GST",
    },
  };
}

export type CouponCheck = { ok: true } | { ok: false; reason: string };

/** Validates a coupon against a subtotal. Never mutates the coupon. */
export function validateCoupon(
  coupon: Coupon | null | undefined,
  subtotal: number,
  now: Date = new Date(),
): CouponCheck {
  if (!coupon) return { ok: false, reason: "That code does not exist." };
  if (!coupon.active) return { ok: false, reason: "That code is no longer active." };

  const stamp = now.getTime();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > stamp) {
    return { ok: false, reason: "That code is not active yet." };
  }
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < stamp) {
    return { ok: false, reason: "That code has expired." };
  }
  if (typeof coupon.max_uses === "number" && coupon.max_uses > 0) {
    if ((coupon.used_count ?? 0) >= coupon.max_uses) {
      return { ok: false, reason: "That code has been fully redeemed." };
    }
  }
  if ((coupon.min_order ?? 0) > subtotal) {
    return {
      ok: false,
      reason: `Add ₹${Math.ceil(coupon.min_order - subtotal).toLocaleString("en-IN")} more to use this code.`,
    };
  }
  return { ok: true };
}

/** True when a code should be shown to customers at all. */
export function isCouponLive(coupon: Coupon, now: Date = new Date()): boolean {
  if (!coupon.active) return false;
  const stamp = now.getTime();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > stamp) return false;
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < stamp) return false;
  if (typeof coupon.max_uses === "number" && coupon.max_uses > 0 && (coupon.used_count ?? 0) >= coupon.max_uses) {
    return false;
  }
  return true;
}

export function couponDiscount(coupon: Coupon, subtotal: number): number {
  const raw =
    coupon.type === "percent" ? (subtotal * coupon.value) / 100 : Math.max(0, coupon.value);
  // Never discount past the goods value, and never round up.
  return Math.min(subtotal, Math.max(0, Math.round(raw)));
}

export function computeTotals({
  lines,
  coupon = null,
  config = DEFAULT_PRICING,
  now = new Date(),
}: {
  lines: PricingLine[];
  coupon?: Coupon | null;
  config?: PricingConfig;
  now?: Date;
}): Totals {
  const subtotal = lines.reduce(
    (sum, line) => sum + Math.max(0, Math.round(line.price)) * Math.max(0, Math.floor(line.quantity)),
    0,
  );

  let discount = 0;
  let couponCode: string | null = null;
  if (coupon && validateCoupon(coupon, subtotal, now).ok) {
    discount = couponDiscount(coupon, subtotal);
    couponCode = coupon.code;
  }

  const taxableBase = Math.max(0, subtotal - discount);

  const rate = config.tax.enabled ? config.tax.rate : 0;
  const tax = config.tax.inclusive
    ? Math.round(taxableBase - taxableBase / (1 + rate))
    : Math.round(taxableBase * rate);

  // Free shipping is judged on the pre-discount subtotal. Charging it after the
  // discount lets a small coupon push the order back under the threshold and
  // make the customer pay more with the coupon than without it.
  const shipping =
    subtotal >= config.freeShippingThreshold || subtotal === 0
      ? 0
      : Math.round(config.shippingFee);

  const total = config.tax.inclusive ? taxableBase + shipping : taxableBase + tax + shipping;

  const freeShippingRemaining =
    subtotal >= config.freeShippingThreshold
      ? 0
      : Math.max(0, Math.ceil(config.freeShippingThreshold - subtotal));

  return {
    subtotal,
    discount,
    taxableBase,
    tax,
    shipping,
    total,
    couponCode,
    freeShippingRemaining,
  };
}
