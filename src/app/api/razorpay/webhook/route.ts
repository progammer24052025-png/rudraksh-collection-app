/**
 * Razorpay webhook — the safety net for paid orders.
 *
 * Normally the customer's browser reports a successful payment to
 * `/api/checkout`, which writes the order. If the tab is closed, the phone
 * loses signal or the app is killed in that moment, the money has moved and
 * nothing was recorded. Razorpay calls this route itself for every successful
 * payment, so the order is written either way.
 *
 * Setup (Razorpay Dashboard → Settings → Webhooks):
 *   URL     https://<your-domain>/api/razorpay/webhook
 *   Secret  the value of RAZORPAY_WEBHOOK_SECRET
 *   Events  payment.captured, payment.authorized, order.paid
 *
 * Trust comes only from the signature over the raw body. The bag, the customer
 * and the amount come from the record saved when the gateway order was opened
 * (`pendingPayments/{razorpay order id}`), never from the webhook payload.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import {
  claimPayment,
  clearPendingCheckout,
  pendingPath,
  recordOrder,
  releasePayment,
  type PendingCheckout,
} from "@/lib/server/create-order";
import { captureRazorpayPayment } from "@/lib/server/razorpay";
import { adminGet, isSecureCheckout } from "@/lib/server/rtdb-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HANDLED = new Set(["payment.captured", "payment.authorized", "order.paid"]);

type WebhookPayment = {
  id?: string;
  order_id?: string | null;
  amount?: number;
  currency?: string;
  status?: string;
};

type WebhookBody = {
  event?: string;
  payload?: { payment?: { entity?: WebhookPayment } };
};

const ack = (detail: Record<string, unknown> = {}) => Response.json({ ok: true, ...detail });

function signatureValid(raw: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    return Response.json({ ok: false, error: "Webhook is not configured." }, { status: 503 });
  }

  const raw = await request.text();
  const signature = (request.headers.get("x-razorpay-signature") ?? "").trim();
  if (!signature || !signatureValid(raw, signature, secret)) {
    return Response.json({ ok: false, error: "Invalid signature." }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(raw) as WebhookBody;
  } catch {
    return Response.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }

  // Anything we do not act on is acknowledged, otherwise Razorpay keeps retrying.
  if (!body.event || !HANDLED.has(body.event)) return ack({ ignored: "event" });

  const payment = body.payload?.payment?.entity;
  const paymentId = (payment?.id ?? "").trim();
  const razorpayOrderId = (payment?.order_id ?? "").trim();
  if (!paymentId || !razorpayOrderId) return ack({ ignored: "no-payment" });
  if (payment?.status !== "captured" && payment?.status !== "authorized") {
    return ack({ ignored: "status" });
  }

  // Without the service account the server cannot write orders at all.
  if (!isSecureCheckout()) return ack({ ignored: "insecure" });

  let pending: PendingCheckout | null;
  try {
    pending = await adminGet<PendingCheckout>(pendingPath(razorpayOrderId));
  } catch (error) {
    console.error("Webhook: could not read pending checkout:", error);
    return Response.json({ ok: false }, { status: 500 }); // retry later
  }
  // No record means the browser already finished this checkout (the record is
  // removed on success) or the payment was not started from this store.
  if (!pending) return ack({ ignored: "no-pending" });

  if (payment.amount !== pending.amount_paise || (payment.currency ?? "INR") !== "INR") {
    console.error(
      `Webhook: payment ${paymentId} amount ${payment.amount} does not match the expected ${pending.amount_paise}. No order written.`,
    );
    return ack({ ignored: "amount-mismatch" });
  }

  let claim;
  try {
    claim = await claimPayment(paymentId, { uid: pending.uid, razorpayOrderId });
  } catch (error) {
    console.error("Webhook: payment claim failed:", error);
    return Response.json({ ok: false }, { status: 500 });
  }
  // The browser got here first — its request is writing (or has written) the order.
  if (!claim.claimed) return ack({ already: true });

  if (payment.status === "authorized") {
    try {
      await captureRazorpayPayment(paymentId, pending.amount_paise);
    } catch (error) {
      console.error("Webhook: capture failed (order still recorded):", error);
    }
  }

  try {
    let result = await recordOrder({
      uid: pending.uid,
      customer: pending.customer,
      orderItems: pending.orderItems,
      totals: pending.totals,
      taxRate: pending.taxRate,
      method: "razorpay",
      payment: { orderId: razorpayOrderId, paymentId },
      notes: pending.notes ?? null,
      distanceKm: pending.distanceKm ?? null,
      coupon: pending.coupon ?? null,
    });

    if (!result.ok) {
      // The customer has already paid the discounted amount, so the order is
      // honoured even though the coupon filled up meanwhile; it is simply not
      // counted against the limit a second time.
      console.warn(`Webhook: coupon exhausted for paid payment ${paymentId}; recording the order anyway.`);
      result = await recordOrder({
        uid: pending.uid,
        customer: pending.customer,
        orderItems: pending.orderItems,
        totals: pending.totals,
        taxRate: pending.taxRate,
        method: "razorpay",
        payment: { orderId: razorpayOrderId, paymentId },
        notes: pending.notes ?? null,
        coupon: pending.coupon ? { ...pending.coupon, key: null, maxUses: 0 } : null,
      });
    }

    await clearPendingCheckout(razorpayOrderId);
    return ack(result.ok ? { order_number: result.orderNumber } : {});
  } catch (error) {
    console.error("Webhook: order write failed:", error);
    await releasePayment(paymentId);
    return Response.json({ ok: false }, { status: 500 }); // Razorpay retries
  }
}
