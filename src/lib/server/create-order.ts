/**
 * The one place an order is written by the server.
 *
 * Two callers reach it: `/api/checkout` (the customer's browser, for COD and
 * for a payment it has just completed) and `/api/razorpay/webhook` (the gateway
 * itself, for a payment whose browser never came back). Sharing the writer is
 * what guarantees both produce the same order for the same bag.
 *
 * "One payment, one order" is enforced by `claimPayment`: whoever creates
 * `payments/{paymentId}` first owns the order, and the other caller reads the
 * result instead of writing a second one.
 */
import {
  adminAdjustNumber,
  adminCreateIfAbsent,
  adminDelete,
  adminGet,
  adminPush,
  adminSet,
  adminUpdate,
} from "@/lib/server/rtdb-admin";
import { orderPlacedEmail, ownerNewOrderEmail, toEmailOrder } from "@/lib/server/email-templates";
import { orderNumber, publicGet } from "@/lib/server/price-cart";
import { isMailConfigured, mailSender, sendMail } from "@/lib/server/smtp";
import { resolveAutomation } from "@/lib/automation";
import type { Totals } from "@/lib/pricing";
import type { Order, StoreSettings } from "@/lib/types";

export type OrderCustomer = {
  name: string;
  /** Digits only. */
  phone: string;
  email: string | null;
  address: string;
  city: string;
  state: string;
  /** Digits only. */
  pincode: string;
};

export type OrderCoupon = {
  /** The coupon's own `code` field — redemption records are keyed by it. */
  code: string;
  /** The database key the coupon lives under — the usage counter is there. */
  key: string | null;
  maxUses: number;
};

export type RecordOrderInput = {
  uid: string;
  customer: OrderCustomer;
  orderItems: Order["items"];
  totals: Totals;
  taxRate: number;
  method: "cod" | "razorpay";
  payment: { orderId: string; paymentId: string } | null;
  notes: string | null;
  coupon: OrderCoupon | null;
  /** Km from the store when delivery was priced by distance. */
  distanceKm?: number | null;
};

export type RecordOrderResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; reason: "coupon_exhausted" };

// ── Payment claims ──────────────────────────────────────────────────────────

export type PaymentRecord = {
  status?: "claiming" | "recorded";
  uid?: string;
  order_id?: string;
  order_number?: string;
  razorpay_order_id?: string;
  amount?: number;
  at?: string;
};

/** A claim with no order after this long belongs to a request that died. */
const STALE_CLAIM_MS = 2 * 60 * 1000;

/**
 * Tries to become the writer for this payment. `claimed: false` means another
 * request already is (or was) — `record` says how far it got.
 */
export async function claimPayment(
  paymentId: string,
  meta: { uid: string; razorpayOrderId: string },
): Promise<{ claimed: true } | { claimed: false; record: PaymentRecord | null }> {
  const path = `payments/${paymentId}`;
  const claim: PaymentRecord = {
    status: "claiming",
    uid: meta.uid,
    razorpay_order_id: meta.razorpayOrderId,
    at: new Date().toISOString(),
  };

  if (await adminCreateIfAbsent(path, claim)) return { claimed: true };

  const record = await adminGet<PaymentRecord>(path);
  if (!record) {
    // Released between our two reads — one more attempt settles it.
    return (await adminCreateIfAbsent(path, claim))
      ? { claimed: true }
      : { claimed: false, record: await adminGet<PaymentRecord>(path) };
  }

  const age = record.at ? Date.now() - Date.parse(record.at) : Number.POSITIVE_INFINITY;
  if (!record.order_number && age > STALE_CLAIM_MS) {
    await adminSet(path, claim);
    return { claimed: true };
  }
  return { claimed: false, record };
}

/** Gives the payment back so a retry (or the webhook) can record it. */
export async function releasePayment(paymentId: string): Promise<void> {
  try {
    await adminDelete(`payments/${paymentId}`);
  } catch (error) {
    console.error("Could not release payment claim:", paymentId, error);
  }
}

/** Waits briefly for the other writer to finish and returns what it recorded. */
export async function waitForPaymentOrder(
  paymentId: string,
  attempts = 6,
  delayMs = 700,
): Promise<PaymentRecord | null> {
  let record: PaymentRecord | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    record = await adminGet<PaymentRecord>(`payments/${paymentId}`);
    if (record?.order_number) return record;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return record;
}

// ── Pending online checkouts ────────────────────────────────────────────────

/**
 * Everything needed to write the order later, saved when the gateway order is
 * opened. If the customer pays and their browser never reports back, the
 * webhook rebuilds the order from this instead of losing it.
 */
export type PendingCheckout = {
  uid: string;
  amount_paise: number;
  customer: OrderCustomer;
  orderItems: Order["items"];
  totals: Totals;
  taxRate: number;
  notes: string | null;
  coupon: OrderCoupon | null;
  distanceKm?: number | null;
  created_at: string;
};

export const pendingPath = (razorpayOrderId: string) => `pendingPayments/${razorpayOrderId}`;

export async function clearPendingCheckout(razorpayOrderId: string): Promise<void> {
  try {
    await adminDelete(pendingPath(razorpayOrderId));
  } catch {
    /* a leftover record is harmless: its payment id is already claimed */
  }
}

// ── The writer ──────────────────────────────────────────────────────────────

/**
 * Writes the order and everything that hangs off it. Throws when the order
 * itself could not be written; by then any coupon use it claimed is returned.
 */
export async function recordOrder(input: RecordOrderInput): Promise<RecordOrderResult> {
  const { uid, customer, orderItems, totals, payment, coupon } = input;

  // Claim one use of a limited coupon before writing the order, and give it back
  // if the order never lands. Counting after the write would let two concurrent
  // checkouts spend the last use twice.
  let couponReserved = false;
  if (coupon?.key && coupon.maxUses > 0) {
    try {
      const used = await adminAdjustNumber(`coupons/${coupon.key}/used_count`, 1, 3, {
        createIfMissing: true,
      });
      if (used !== null && used > coupon.maxUses) {
        await adminAdjustNumber(`coupons/${coupon.key}/used_count`, -1);
        return { ok: false, reason: "coupon_exhausted" };
      }
      couponReserved = used !== null;
    } catch (error) {
      console.error("Coupon reservation failed:", error);
    }
  }

  // The owner's automation switches (Admin → Settings). Unreadable settings
  // mean the defaults, never a failed order.
  const automation = resolveAutomation(
    await publicGet<StoreSettings>("settings").catch(() => null),
  );
  // A paid order is confirmed by the payment itself. A COD order is confirmed
  // straight away only when the owner has chosen to skip that manual step.
  const confirmed = Boolean(payment) || (input.method === "cod" && automation.autoConfirmCod);

  const now = new Date();
  const iso = now.toISOString();
  const history = [
    { status: "placed" as const, at: iso },
    ...(confirmed
      ? [{ status: "confirmed" as const, at: iso, ...(payment ? {} : { note: "Confirmed automatically" }) }]
      : []),
  ];

  const order: Omit<Order, "id"> = {
    order_number: orderNumber(now),
    user_id: uid,
    customer_name: customer.name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    pincode: customer.pincode,
    items: orderItems,
    subtotal: totals.subtotal,
    discount: totals.discount,
    taxable_base: totals.taxableBase,
    tax: totals.tax,
    tax_rate: input.taxRate,
    coupon_code: totals.couponCode,
    shipping: totals.shipping,
    total: totals.total,
    payment_method: input.method,
    payment_status: payment ? "paid" : "pending",
    order_status: confirmed ? "confirmed" : "placed",
    razorpay_order_id: payment?.orderId ?? null,
    razorpay_payment_id: payment?.paymentId ?? null,
    notes: input.notes,
    ...(typeof input.distanceKm === "number" ? { delivery_distance_km: input.distanceKm } : {}),
    status_history: history,
    created_at: iso,
    updated_at: iso,
  };

  let orderId: string;
  try {
    orderId = await adminPush("orders", order);
  } catch (error) {
    if (couponReserved && coupon?.key) {
      try {
        await adminAdjustNumber(`coupons/${coupon.key}/used_count`, -1);
      } catch {
        /* the counter can be corrected by hand from the coupon screen */
      }
    }
    throw error;
  }

  // The order exists from here on. Nothing below may fail the request: the
  // customer has paid or committed to pay, and a second attempt would only
  // create a duplicate.
  const step = async (label: string, work: () => Promise<unknown>) => {
    try {
      await work();
    } catch (error) {
      console.error(`Order ${order.order_number}: ${label} failed:`, error);
    }
  };

  await step("user index", () =>
    adminSet(`ordersByUser/${uid}/${orderId}`, { order_number: order.order_number }),
  );
  await step("tracking record", () =>
    adminSet(`tracking/${order.order_number}`, {
      order_number: order.order_number,
      order_status: order.order_status,
      payment_status: order.payment_status,
      status_history: history,
      phone_last4: order.phone.slice(-4),
      total: order.total,
      created_at: iso,
      updated_at: iso,
    }),
  );

  if (payment) {
    await step("payment record", () =>
      adminSet(`payments/${payment.paymentId}`, {
        status: "recorded",
        uid,
        order_id: orderId,
        order_number: order.order_number,
        razorpay_order_id: payment.orderId,
        amount: order.total,
        at: iso,
      } satisfies PaymentRecord),
    );
  }

  // One redemption per user and per phone, keyed by the verified uid.
  if (coupon) {
    const phone10 = customer.phone.slice(-10);
    const record = {
      order_id: orderId,
      order_number: order.order_number,
      user_id: uid,
      phone: phone10,
      used_at: iso,
    };
    await step("coupon redemption", async () => {
      await adminSet(`couponRedemptions/${coupon.code}/${uid}`, record);
      await adminSet(`userCoupons/${uid}/${coupon.code}`, record);
      if (phone10.length === 10) {
        await adminSet(`couponRedemptionsByPhone/${coupon.code}/${phone10}`, record);
      }
    });

    // Limited coupons were counted by the reservation above.
    if (coupon.key && !couponReserved) {
      await step("coupon usage count", () =>
        adminAdjustNumber(`coupons/${coupon.key}/used_count`, 1, 3, { createIfMissing: true }),
      );
    }
  }

  // Take the stock out now that the order exists. A product with no numeric
  // stock is unlimited and is left alone.
  let stockTaken = false;
  for (const line of orderItems) {
    if (!line.productId) continue;
    await step(`stock for ${line.productId}`, async () => {
      const left = await adminAdjustNumber(`products/${line.productId}/stock`, -line.quantity);
      if (left !== null) stockTaken = true;
    });
  }
  // Real sales count behind the "Bestseller" badge.
  for (const line of orderItems) {
    if (!line.productId) continue;
    await step(`sales count for ${line.productId}`, () =>
      adminAdjustNumber(`products/${line.productId}/sold_count`, line.quantity, 3, {
        createIfMissing: true,
      }),
    );
  }

  if (stockTaken) {
    // Only orders that actually moved stock may put it back on cancellation.
    await step("stock flag", () => adminUpdate(`orders/${orderId}`, { stock_decremented: true }));
  }

  await step("activity entry", () =>
    adminPush(`activity/${uid}`, {
      type: "order",
      label: `Order ${order.order_number} placed`,
      meta: `₹${order.total.toLocaleString("en-IN")}`,
      href: "/track-order",
      at: iso,
    }),
  );

  if (order.email && isMailConfigured()) {
    await step("confirmation email", async () => {
      const mail = orderPlacedEmail(toEmailOrder({ ...order, id: orderId }));
      const sent = await sendMail({ to: order.email as string, ...mail });
      if (!sent.ok) throw new Error(sent.error || "mail not sent");
    });
  }

  // Tell the store. Goes to the store's own mailbox, so a new order is never
  // missed just because nobody had the admin open.
  if (automation.ownerOrderEmail && isMailConfigured() && mailSender()) {
    await step("store notification email", async () => {
      const mail = ownerNewOrderEmail(toEmailOrder({ ...order, id: orderId }));
      const sent = await sendMail({ to: mailSender(), ...mail });
      if (!sent.ok) throw new Error(sent.error || "mail not sent");
    });
  }

  return { ok: true, orderId, orderNumber: order.order_number };
}
