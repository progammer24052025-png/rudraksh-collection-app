/**
 * Merchandising signals shown on cards and product pages.
 *
 * Every one of these is derived from real store data — actual stock, actual
 * prices, actual sales and dates. Nothing here invents urgency or popularity:
 * a signal that is not true for a product is simply not shown.
 */
import { effectivePrice } from "./pricing";
import type { Product } from "./types";

/** Stock at or below this is called out as "Only N left". */
export const LOW_STOCK_THRESHOLD = 5;
/** Units sold before a product may be called a bestseller. */
export const BESTSELLER_MIN_SOLD = 5;
/** A product counts as new for this many days after it was added. */
const NEW_FOR_DAYS = 30;
/** The server refuses more than this many of one item per order. */
export const MAX_PER_ORDER = 20;

/** Whole-number percentage off the list price, or 0 when there is no discount. */
export function discountPercent(product: Pick<Product, "price" | "sale_price">): number {
  const price = effectivePrice(product);
  if (!(product.price > 0) || price >= product.price) return 0;
  return Math.round(((product.price - price) / product.price) * 100);
}

/** Rupees saved per unit against the list price. */
export function savingsPerUnit(product: Pick<Product, "price" | "sale_price">): number {
  return Math.max(0, product.price - effectivePrice(product));
}

const numericStock = (product: Pick<Product, "stock">): number | null =>
  typeof product.stock === "number" && Number.isFinite(product.stock) ? product.stock : null;

/** Units left when the product is genuinely running low, otherwise null. */
export function lowStockCount(product: Pick<Product, "stock">): number | null {
  const stock = numericStock(product);
  return stock !== null && stock > 0 && stock <= LOW_STOCK_THRESHOLD ? stock : null;
}

/** The most one customer can add: what is in stock, capped by the order limit. */
export function maxQuantity(product: Pick<Product, "stock">): number {
  const stock = numericStock(product);
  return Math.max(1, Math.min(MAX_PER_ORDER, stock ?? MAX_PER_ORDER));
}

export function isBestseller(product: Pick<Product, "sold_count">): boolean {
  return (product.sold_count ?? 0) >= BESTSELLER_MIN_SOLD;
}

export function isNewArrival(product: Pick<Product, "is_new" | "created_at">): boolean {
  if (product.is_new) return true;
  const created = Date.parse(product.created_at || "");
  return Number.isFinite(created) && Date.now() - created < NEW_FOR_DAYS * 86_400_000;
}

export function hasRating(product: Pick<Product, "rating" | "rating_count">): boolean {
  return (product.rating_count ?? 0) > 0 && typeof product.rating === "number";
}

// ── Delivery estimate ───────────────────────────────────────────────────────

const SUNDAY = 0;

/** Adds business days (Mon–Sat; couriers do not deliver here on Sundays). */
function addBusinessDays(from: Date, days: number): Date {
  const date = new Date(from);
  let left = days;
  while (left > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== SUNDAY) left -= 1;
  }
  return date;
}

const dayLabel = (date: Date) =>
  date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/**
 * The delivery window quoted on the shipping page (3–7 business days), as
 * dates. It is an estimate and is always labelled as one.
 */
export function deliveryWindow(now: Date = new Date()): { from: string; to: string } {
  return { from: dayLabel(addBusinessDays(now, 3)), to: dayLabel(addBusinessDays(now, 7)) };
}

/** Indian PIN codes are six digits and never start with 0 or 9. */
export const isValidPincode = (pincode: string) => /^[1-8]\d{5}$/.test(pincode);
