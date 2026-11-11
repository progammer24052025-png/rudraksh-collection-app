// ─────────────────────────────────────────────────────────────
// Order documents: the **bill** and the **receipt**.
//
// These are two different papers and the difference matters:
//
//   · A bill is issued for every order the moment it is placed. It says what
//     was bought, what it costs and who pays — money need not have moved.
//   · A receipt is proof that money *did* move. An offline order (cash on
//     delivery) has no receipt when it is placed, so we never issue one.
//
// `hasReceipt()` is the single gate. Nothing in the app prints a receipt
// without asking it first, so a COD order cannot accidentally claim "paid".
//
// Pure and dependency-free: the same rules run in the browser, in route
// handlers and in the email templates.
// ─────────────────────────────────────────────────────────────

import type { Order } from "./types";

export type BillItem = {
  name: string;
  brand?: string | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
  price: number;
};

export type BillOrder = {
  order_number: string;
  created_at?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  items?: BillItem[];
  subtotal?: number;
  discount?: number;
  taxable_base?: number;
  tax?: number;
  tax_rate?: number;
  coupon_code?: string | null;
  shipping?: number;
  total: number;
  payment_method: "cod" | "razorpay";
  payment_status?: Order["payment_status"] | null;
  razorpay_payment_id?: string | null;
};

export type BillLine = { label: string; value: string; muted?: boolean };

/** Rupee amounts, grouped the Indian way: ₹1,348. */
export const money = (value: number | null | undefined): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);

/** Cash on delivery — no money has moved at the time of ordering. */
export const isOfflinePayment = (order: Pick<BillOrder, "payment_method">): boolean =>
  order.payment_method === "cod";

/**
 * Whether a receipt may be issued for this order.
 *
 * Requires BOTH an online payment method and a settled payment: asking for a
 * receipt must never be enough on its own. A cash order is excluded even when
 * an admin has marked it paid, because the customer holds a bill, not proof
 * of an electronic transfer.
 */
export function hasReceipt(
  order: Pick<BillOrder, "payment_method" | "payment_status" | "razorpay_payment_id">,
): boolean {
  if (isOfflinePayment(order)) return false;
  return order.payment_status === "paid";
}

/** "Bill" for cash, "Bill" for online too — the bill is never optional. */
export const documentTitle = (): string => "Bill";

/** The itemised money rows every bill carries. */
export function billLines(order: BillOrder): BillLine[] {
  const lines: BillLine[] = [];

  if (typeof order.subtotal === "number") {
    lines.push({ label: "Subtotal", value: money(order.subtotal) });
  }
  if (order.discount) {
    lines.push({
      label: order.coupon_code ? `Discount (${order.coupon_code})` : "Discount",
      value: `− ${money(order.discount)}`,
    });
  }
  if (order.tax) {
    const rate = order.tax_rate ? ` ${order.tax_rate}%` : "";
    lines.push({ label: `GST${rate}`, value: money(order.tax), muted: true });
  }
  if (typeof order.shipping === "number") {
    lines.push({
      label: "Delivery",
      value: order.shipping > 0 ? money(order.shipping) : "Free",
      muted: order.shipping === 0,
    });
  }

  lines.push({ label: "Total", value: money(order.total) });
  return lines;
}

/**
 * Receipt rows — empty for an offline order, so callers can simply skip the
 * block when the list is empty.
 */
export function receiptLines(order: BillOrder): BillLine[] {
  if (!hasReceipt(order)) return [];

  const lines: BillLine[] = [
    { label: "Payment received", value: money(order.total) },
    { label: "Method", value: "Razorpay (online)" },
  ];

  if (order.razorpay_payment_id) {
    lines.push({ label: "Reference", value: order.razorpay_payment_id });
  }
  if (order.created_at) {
    lines.push({
      label: "Paid on",
      value: new Date(order.created_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    });
  }

  return lines;
}

/**
 * How the bill describes payment. Cash orders say what is still owed; nothing
 * here may read like a confirmation that money arrived.
 */
export function paymentSummary(order: BillOrder): { label: string; value: string } {
  if (hasReceipt(order)) {
    return {
      label: "Payment",
      value: order.razorpay_payment_id
        ? `Paid online · ${order.razorpay_payment_id}`
        : "Paid online",
    };
  }
  if (isOfflinePayment(order)) {
    return {
      label: "Payment",
      value: `Cash on delivery · ${money(order.total)} due at delivery`,
    };
  }
  // Online order that is not settled (failed, refunded, or still pending).
  return { label: "Payment", value: `Online · ${order.payment_status ?? "pending"}` };
}

/** Narrows a stored order to the shape the document renderers use. */
export function toBillOrder(order: Order): BillOrder {
  return {
    order_number: order.order_number,
    created_at: order.created_at,
    customer_name: order.customer_name,
    phone: order.phone,
    email: order.email,
    address: order.address,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    // A bill lists what is actually being supplied.
    items: Array.isArray(order.items) ? order.items.filter((item) => item && !item.cancelled) : [],
    subtotal: order.subtotal,
    discount: order.discount,
    taxable_base: order.taxable_base,
    tax: order.tax,
    tax_rate: order.tax_rate,
    coupon_code: order.coupon_code,
    shipping: order.shipping,
    total: order.total,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    razorpay_payment_id: order.razorpay_payment_id,
  };
}
