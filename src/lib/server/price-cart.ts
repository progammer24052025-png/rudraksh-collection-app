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
  effectivePrice,
  normalizePricing,
  type PricingConfig,
  type PricingLine,
  type Totals,
} from "@/lib/pricing";
import { DB_ROOT, adminGet, isSecureCheckout } from "@/lib/server/rtdb-admin";
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
  notes?: string | null;
  items?: CartItemInput[];
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
};

export type PricedCart = {
  totals: Totals;
  config: PricingConfig;
  orderItems: Order["items"];
  coupon: Coupon | null;
  /** The coupon that actually applied — null when none was sent or it was rejected. */
  appliedCoupon: Coupon | null;
  /** The database key `appliedCoupon` lives under, which is not always its `code`. */
  couponKey: string | null;
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

/**
 * Order numbers double as the guest tracking secret, so the suffix must not be
 * guessable: eight characters from a 32-symbol alphabet (≈10¹² per day) drawn
 * from the CSPRNG. The alphabet drops 0/O/1/I so a customer can read it aloud.
 */
const ORDER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Reads a coupon redemption record. These nodes hold customer phone numbers, so
 * the database rules refuse anonymous reads — an unauthenticated fetch comes
 * back "permission denied", which must never be mistaken for "not used yet".
 * With the service account the read is authoritative; without it the server
 * cannot know, and the signed-in browser check in checkout is the only guard.
 */
async function redemptionExists(path: string): Promise<boolean> {
  if (!isSecureCheckout()) return false;
  return (await adminGet<unknown>(path)) !== null;
}

export function orderNumber(now = new Date()): string {
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes, (byte) => ORDER_ALPHABET[byte % ORDER_ALPHABET.length]).join("");
  return `RC-${date}-${random}`;
}

export const digits = (value: string) => value.replace(/\D/g, "");

/**
 * `verifiedUid` is the uid from the caller's ID token. When a route passes it,
 * the once-per-customer coupon check uses it instead of the body's `user_id`,
 * which a caller could change to dodge the check.
 */
export async function priceCart(
  body: CartRequest,
  verifiedUid?: string | null,
): Promise<PricedCartResult> {
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
    // Same helper the cart uses, so what the customer saw is what is charged.
    const price = effectivePrice(product);

    // Stock is enforced here because this is the only place both money paths
    // (COD and Razorpay) agree on what the bag contains. A product without a
    // numeric stock is treated as unlimited rather than unsellable.
    const stock = typeof product.stock === "number" ? product.stock : null;
    if (stock !== null && stock <= 0) {
      return {
        ok: false,
        status: 409,
        error: `“${product.name}” is sold out. Please remove it from your bag.`,
      };
    }
    if (stock !== null && quantity > stock) {
      return {
        ok: false,
        status: 409,
        error: `Only ${stock} left of “${product.name}”. Please lower the quantity.`,
      };
    }

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
  let couponKey: string | null = null;
  const code = (body.coupon_code ?? "").trim().toUpperCase();
  if (code) {
    const coupons = (await publicGet<Record<string, Coupon>>("coupons")) ?? {};
    if (coupons[code]) {
      coupon = coupons[code];
      couponKey = code;
    } else {
      // Case-insensitive fallback for codes stored with mixed case. The key we
      // found is what the usage counter must be written to — writing to the
      // coupon's own `code` field would create a second, empty node.
      const match = Object.entries(coupons).find(([key]) => key.toUpperCase() === code);
      if (match) {
        coupon = match[1];
        couponKey = match[0];
      }
    }

    if (coupon) {
      const uid = (verifiedUid ?? body.user_id ?? "").trim();
      const phone10 = digits(body.customer?.phone ?? "").slice(-10);
      const withoutCoupon = () => computeTotals({ lines, coupon: null, config });

      try {
        if (uid && uid !== "guest" && (await redemptionExists(`couponRedemptions/${coupon.code}/${uid}`))) {
          return {
            ok: false,
            status: 409,
            error: `You have already used coupon code ${coupon.code}. Coupons can only be redeemed once per customer.`,
            totals: withoutCoupon(),
          };
        }
        if (
          phone10.length === 10 &&
          (await redemptionExists(`couponRedemptionsByPhone/${coupon.code}/${phone10}`))
        ) {
          return {
            ok: false,
            status: 409,
            error: `Coupon code ${coupon.code} has already been redeemed for this mobile number.`,
            totals: withoutCoupon(),
          };
        }
      } catch (error) {
        // Fail closed: an unreadable history must not hand out a second discount.
        console.error("Coupon redemption check failed:", error);
        return {
          ok: false,
          status: 503,
          error: "We could not check that coupon right now. Please try again in a moment.",
          totals: withoutCoupon(),
        };
      }
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

  return {
    ok: true,
    cart: { totals, config, orderItems, coupon, appliedCoupon, couponKey, settings },
  };
}
