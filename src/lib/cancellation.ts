/**
 * The money side of cancelling some or all of an order's items.
 *
 * Pure (no database), so the cancel route and the tests use the same maths:
 *  · totals follow the items still on the order;
 *  · a coupon discount shrinks in proportion to what is left;
 *  · the delivery charge stays as it was charged, unless everything is
 *    cancelled, when the whole amount paid comes back.
 */
import type { Order, OrderItem } from "./types";

export const lineValue = (item: Pick<OrderItem, "price" | "quantity">) =>
  Math.max(0, Math.round(Number(item.price) || 0)) * Math.max(0, Math.floor(Number(item.quantity) || 0));

export type CancellationMoney = {
  fullCancel: boolean;
  subtotal: number;
  discount: number;
  taxableBase: number;
  tax: number;
  /** The order's new total (unchanged figure kept for a full cancellation). */
  total: number;
  /** Rupees to hand back for this cancellation. */
  refund: number;
};

export function cancellationMoney(
  order: Pick<Order, "subtotal" | "discount" | "shipping" | "total" | "tax_rate">,
  cancelled: Array<Pick<OrderItem, "price" | "quantity">>,
  remainingCount: number,
): CancellationMoney {
  const oldSubtotal = Math.max(0, Number(order.subtotal) || 0);
  const oldDiscount = Math.max(0, Number(order.discount) || 0);
  const shipping = Math.max(0, Number(order.shipping) || 0);
  const oldTotal = Math.max(0, Number(order.total) || 0);
  const rate = Math.max(0, Number(order.tax_rate) || 0);
  // Inclusive pricing puts tax inside the price, so the stored total has none added.
  const taxInclusive = Math.abs(oldSubtotal - oldDiscount + shipping - oldTotal) < 1;
  const fullCancel = remainingCount === 0;

  const cancelledValue = cancelled.reduce((sum, item) => sum + lineValue(item), 0);
  const subtotal = Math.max(0, oldSubtotal - cancelledValue);
  const discount = oldSubtotal > 0 ? Math.round((oldDiscount * subtotal) / oldSubtotal) : 0;
  const taxableBase = Math.max(0, subtotal - discount);
  const tax = taxInclusive
    ? Math.round(taxableBase - taxableBase / (1 + rate))
    : Math.round(taxableBase * rate);
  const newTotal = taxInclusive ? taxableBase + shipping : taxableBase + tax + shipping;

  return {
    fullCancel,
    subtotal,
    discount,
    taxableBase,
    tax,
    total: fullCancel ? oldTotal : newTotal,
    refund: fullCancel ? oldTotal : Math.max(0, oldTotal - newTotal),
  };
}
