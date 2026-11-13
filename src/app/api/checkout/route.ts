import { isSecureCheckout } from "@/lib/server/rtdb-admin";
import {
  claimPayment,
  clearPendingCheckout,
  recordOrder,
  releasePayment,
  waitForPaymentOrder,
  type OrderCustomer,
} from "@/lib/server/create-order";
import {
  clientIp,
  crossOriginResponse,
  isSameOrigin,
  rateLimit,
  tooManyRequestsResponse,
} from "@/lib/server/http";
import { callerFrom } from "@/lib/server/id-token";
import { digits, priceCart, type CartRequest } from "@/lib/server/price-cart";
import {
  captureRazorpayPayment,
  fetchRazorpayPayment,
  isPaidStatus,
  razorpayConfigured,
  verifyPaymentSignature,
} from "@/lib/server/razorpay";

export const dynamic = "force-dynamic";
// The order writer sends the confirmation email over `node:tls`.
export const runtime = "nodejs";

type PaymentProof = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

type CheckoutBody = CartRequest & {
  payment_method?: "cod" | "razorpay";
  payment_proof?: PaymentProof;
};

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse();

  // An order costs a database write and, for COD, a fulfilment task. Six per
  // ten minutes is far more than a real customer needs and far less than a
  // script wants.
  const gate = await rateLimit(`checkout:${clientIp(request)}`, 6, 10 * 60 * 1000);
  if (!gate.ok) return tooManyRequestsResponse(gate.retryAfter);

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return Response.json({ ok: false, error: "Could not read the order." }, { status: 400 });
  }

  // Ownership comes from a token Google verified, never from the body: a
  // body-supplied uid would let anyone write an order, an order index entry and
  // an activity notification into somebody else's account.
  const caller = await callerFrom(request);
  const uid = caller?.uid ?? null;

  const input = body.customer ?? {};

  // Checkout is signed-in only. The uid above is the token's, so the "please
  // sign in" rule cannot be satisfied by typing somebody else's id.
  if (!uid) {
    return Response.json(
      { ok: false, error: "Authentication required: Please sign in to place an order." },
      { status: 401 },
    );
  }

  if (!input.name?.trim() || digits(input.phone ?? "").length < 10) {
    return Response.json(
      { ok: false, error: "A name and a 10-digit phone are required." },
      { status: 400 },
    );
  }
  if (!input.address?.trim() || !input.city?.trim() || !input.state?.trim()) {
    return Response.json(
      { ok: false, error: "A complete delivery address is required." },
      { status: 400 },
    );
  }
  if (digits(input.pincode ?? "").length !== 6) {
    return Response.json({ ok: false, error: "A 6-digit PIN code is required." }, { status: 400 });
  }

  const customer: OrderCustomer = {
    name: input.name.trim(),
    phone: digits(input.phone ?? ""),
    email: input.email?.trim() || null,
    address: input.address.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: digits(input.pincode ?? ""),
  };

  const priced = await priceCart(body, uid);
  if (!priced.ok) {
    return Response.json(
      { ok: false, error: priced.error, totals: priced.totals },
      { status: priced.status },
    );
  }

  const { totals, config, orderItems, appliedCoupon, couponKey, distanceKm } = priced.cart;
  const method = body.payment_method === "razorpay" ? "razorpay" : "cod";
  const secure = isSecureCheckout();

  // ── Online payment ────────────────────────────────────────────────────────
  // The order is only written once the gateway has confirmed that this exact
  // amount was paid. Any doubt means no order and no charge.
  let payment: { orderId: string; paymentId: string } | null = null;
  let authorizedOnly = false;
  const expectedPaise = Math.round(totals.total * 100);

  if (method === "razorpay") {
    if (!razorpayConfigured()) {
      return Response.json(
        { ok: false, error: "Online payment is not configured yet." },
        { status: 503 },
      );
    }

    const proof = body.payment_proof ?? {};
    const orderId = (proof.razorpay_order_id ?? "").trim();
    const paymentId = (proof.razorpay_payment_id ?? "").trim();
    const signature = (proof.razorpay_signature ?? "").trim();

    if (!orderId || !paymentId || !signature) {
      return Response.json(
        { ok: false, error: "No completed payment was found for this order." },
        { status: 402 },
      );
    }
    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return Response.json(
        { ok: false, error: "We could not verify that payment. You have not been charged." },
        { status: 402 },
      );
    }

    let gatewayPayment;
    try {
      gatewayPayment = await fetchRazorpayPayment(paymentId);
    } catch (error) {
      console.error("Razorpay payment lookup failed:", error);
      return Response.json(
        { ok: false, error: "We could not confirm that payment with the gateway. Please contact us before paying again." },
        { status: 502 },
      );
    }

    if (
      gatewayPayment.order_id !== orderId ||
      gatewayPayment.amount !== expectedPaise ||
      gatewayPayment.currency !== "INR"
    ) {
      return Response.json(
        { ok: false, error: "The paid amount does not match this order. You have not been charged for this order." },
        { status: 402 },
      );
    }
    if (!isPaidStatus(gatewayPayment.status)) {
      return Response.json(
        { ok: false, error: `That payment is ${gatewayPayment.status}, not successful. No order was placed.` },
        { status: 402 },
      );
    }

    authorizedOnly = gatewayPayment.status === "authorized";
    payment = { orderId, paymentId };
  }

  if (!secure) {
    // Orders are written only by the server, so the amount on every order is
    // one the server worked out. Without the service account nothing can be
    // recorded safely, and the shopper is asked to contact the store instead.
    console.error("Checkout refused: FIREBASE_SERVICE_ACCOUNT is not configured.");
    return Response.json(
      {
        ok: false,
        totals,
        ...(payment ? { paid: true, payment_id: payment.paymentId } : {}),
        error: payment
          ? `Your payment was received (${payment.paymentId}) but we could not record the order. Please contact us with this reference — you will not be charged again.`
          : "Online ordering is briefly unavailable. Please try again shortly, or call or WhatsApp us to order.",
      },
      { status: 503 },
    );
  }

  // A payment id may only ever produce one order. The gateway webhook records
  // the same payment, often before this request arrives, so losing the claim is
  // normal: the order already exists (or is being written) and we report it.
  if (payment) {
    const paymentId = payment.paymentId;
    const stillRecording = () =>
      Response.json(
        {
          ok: false,
          secure: true,
          totals,
          paid: true,
          recording: true,
          payment_id: paymentId,
          error: `Your payment was received (${paymentId}) and your order is being recorded. Check My Orders in a minute — you will not be charged again.`,
        },
        { status: 409 },
      );

    let claim;
    try {
      claim = await claimPayment(paymentId, { uid, razorpayOrderId: payment.orderId });
    } catch (error) {
      console.error("Payment claim failed:", error);
      return Response.json(
        { ok: false, error: "We could not confirm that payment. Please contact us before paying again." },
        { status: 502 },
      );
    }

    if (!claim.claimed) {
      let record = claim.record;
      if (!record?.order_number) {
        try {
          record = await waitForPaymentOrder(paymentId);
        } catch {
          record = null;
        }
      }
      if (record?.uid && record.uid !== uid) {
        return Response.json(
          { ok: false, error: "This payment belongs to a different account." },
          { status: 409 },
        );
      }
      if (!record?.order_number || !record.order_id) return stillRecording();
      return Response.json({
        ok: true,
        secure: true,
        totals,
        order: { id: record.order_id, order_number: record.order_number },
        payment: { id: paymentId, status: "paid" as const },
      });
    }

    if (authorizedOnly) {
      // Account-level manual capture: settle now, but never block the order on it.
      try {
        await captureRazorpayPayment(paymentId, expectedPaise);
      } catch (error) {
        console.error("Razorpay capture failed (order still recorded):", error);
      }
    }
  }

  try {
    const result = await recordOrder({
      uid,
      customer,
      orderItems,
      totals,
      taxRate: config.tax.enabled ? config.tax.rate : 0,
      method,
      payment,
      notes: body.notes?.trim() || null,
      distanceKm,
      coupon: appliedCoupon
        ? {
            code: appliedCoupon.code,
            key: couponKey,
            maxUses: typeof appliedCoupon.max_uses === "number" ? appliedCoupon.max_uses : 0,
          }
        : null,
    });

    if (!result.ok) {
      if (payment) {
        // Paid, but the coupon ran out between pricing and now. Release the
        // claim so the gateway webhook can still record the paid order.
        await releasePayment(payment.paymentId);
        return Response.json(
          {
            ok: false,
            secure: true,
            totals,
            paid: true,
            payment_id: payment.paymentId,
            error: `Your payment was received (${payment.paymentId}) but the coupon was fully redeemed while you paid. Please contact us with this reference — you will not be charged again.`,
          },
          { status: 409 },
        );
      }
      return Response.json(
        { ok: false, error: "That code has just been fully redeemed.", totals },
        { status: 409 },
      );
    }

    if (payment) await clearPendingCheckout(payment.orderId);

    return Response.json({
      ok: true,
      secure: true,
      totals,
      order: { id: result.orderId, order_number: result.orderNumber },
      payment: payment ? { id: payment.paymentId, status: "paid" as const } : null,
    });
  } catch (error) {
    console.error("Secure checkout failed:", error);
    if (payment) {
      // Money has moved but the order does not exist yet. Release the claim so
      // the gateway webhook can record it, and surface the payment id so the
      // customer can quote it instead of paying again.
      await releasePayment(payment.paymentId);
      return Response.json(
        {
          ok: false,
          secure: true,
          totals,
          paid: true,
          payment_id: payment.paymentId,
          error: `Your payment was received (${payment.paymentId}) but we could not record the order. Please contact us with this reference — you will not be charged again.`,
        },
        { status: 500 },
      );
    }
    return Response.json(
      { ok: false, totals, error: "We could not place your order just now. Nothing was charged — please try again." },
      { status: 500 },
    );
  }
}
