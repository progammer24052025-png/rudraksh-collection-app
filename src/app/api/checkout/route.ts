import {
  adminAdjustNumber,
  adminGet,
  adminPush,
  adminSet,
  adminUpdate,
  isSecureCheckout,
} from "@/lib/server/rtdb-admin";
import {
  clientIp,
  crossOriginResponse,
  isSameOrigin,
  rateLimit,
  tooManyRequestsResponse,
} from "@/lib/server/http";
import { callerFrom } from "@/lib/server/id-token";
import { digits, orderNumber, priceCart, type CartRequest } from "@/lib/server/price-cart";
import {
  captureRazorpayPayment,
  fetchRazorpayPayment,
  isPaidStatus,
  razorpayConfigured,
  verifyPaymentSignature,
} from "@/lib/server/razorpay";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

type PaymentProof = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

type CheckoutBody = CartRequest & {
  payment_method?: "cod" | "razorpay";
  notes?: string | null;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  payment_proof?: PaymentProof;
};

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse();

  // An order costs a database write and, for COD, a fulfilment task. Six per
  // ten minutes is far more than a real customer needs and far less than a
  // script wants.
  const gate = rateLimit(`checkout:${clientIp(request)}`, 6, 10 * 60 * 1000);
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

  const customer = body.customer ?? {};

  if (!customer.name?.trim() || digits(customer.phone ?? "").length < 10) {
    return Response.json(
      { ok: false, error: "A name and a 10-digit phone are required." },
      { status: 400 },
    );
  }
  if (!customer.address?.trim() || !customer.city?.trim() || !customer.state?.trim()) {
    return Response.json(
      { ok: false, error: "A complete delivery address is required." },
      { status: 400 },
    );
  }
  if (digits(customer.pincode ?? "").length !== 6) {
    return Response.json({ ok: false, error: "A 6-digit PIN code is required." }, { status: 400 });
  }

  const priced = await priceCart(body);
  if (!priced.ok) {
    return Response.json(
      { ok: false, error: priced.error, totals: priced.totals },
      { status: priced.status },
    );
  }

  const { totals, config, orderItems, appliedCoupon, couponKey } = priced.cart;
  const method = body.payment_method === "razorpay" ? "razorpay" : "cod";
  const secure = isSecureCheckout();

  // ── Online payment ────────────────────────────────────────────────────────
  // The order is only written once the gateway has confirmed that this exact
  // amount was paid. Any doubt means no order and no charge.
  let payment: { orderId: string; paymentId: string } | null = null;

  if (method === "razorpay") {
    if (!razorpayConfigured()) {
      return Response.json(
        { ok: false, error: "Online payment is not configured yet." },
        { status: 503 },
      );
    }
    if (!secure) {
      return Response.json(
        { ok: false, error: "Online payment is unavailable right now. Please choose Cash on Delivery." },
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

    const expectedPaise = Math.round(totals.total * 100);
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

    // A payment id may only ever produce one order — blocks a replayed proof.
    try {
      const used = await adminGet<{ order_number?: string }>(`payments/${paymentId}`);
      if (used) {
        return Response.json(
          {
            ok: false,
            error: `This payment is already recorded${used.order_number ? ` as ${used.order_number}` : ""}.`,
          },
          { status: 409 },
        );
      }
    } catch (error) {
      console.error("Payment idempotency check failed:", error);
      return Response.json(
        { ok: false, error: "We could not confirm that payment. Please contact us before paying again." },
        { status: 502 },
      );
    }

    if (gatewayPayment.status === "authorized") {
      // Account-level manual capture: settle now, but never block the order on it.
      try {
        await captureRazorpayPayment(paymentId, expectedPaise);
      } catch (error) {
        console.error("Razorpay capture failed (order still recorded):", error);
      }
    }

    payment = { orderId, paymentId };
  }

  if (!secure) {
    // Totals are still server-computed; the order write itself stays client-side
    // until the service-account secret is configured. COD only — online payment
    // is refused above.
    return Response.json({
      ok: true,
      secure: false,
      totals,
      order: null,
    });
  }

  // Claim one use of a limited coupon before writing the order, and give it back
  // if the order never lands. Counting after the write would let two concurrent
  // checkouts spend the last use twice.
  let couponReserved = false;
  if (appliedCoupon && couponKey) {
    const maxUses = typeof appliedCoupon.max_uses === "number" ? appliedCoupon.max_uses : 0;
    if (maxUses > 0) {
      try {
        const used = await adminAdjustNumber(`coupons/${couponKey}/used_count`, 1);
        if (used !== null && used > maxUses) {
          await adminAdjustNumber(`coupons/${couponKey}/used_count`, -1);
          return Response.json(
            { ok: false, error: "That code has just been fully redeemed.", totals },
            { status: 409 },
          );
        }
        couponReserved = used !== null;
      } catch (error) {
        console.error("Coupon reservation failed:", error);
      }
    }
  }

  const now = new Date();
  const iso = now.toISOString();
  const history = [
    { status: "placed" as const, at: iso },
    ...(payment ? [{ status: "confirmed" as const, at: iso }] : []),
  ];

  const order: Omit<Order, "id"> = {
    order_number: orderNumber(now),
    user_id: uid,
    customer_name: customer.name.trim(),
    phone: digits(customer.phone ?? ""),
    email: customer.email?.trim() || null,
    address: customer.address.trim(),
    city: customer.city.trim(),
    state: customer.state.trim(),
    pincode: digits(customer.pincode ?? ""),
    items: orderItems,
    subtotal: totals.subtotal,
    discount: totals.discount,
    taxable_base: totals.taxableBase,
    tax: totals.tax,
    tax_rate: config.tax.enabled ? config.tax.rate : 0,
    coupon_code: totals.couponCode,
    shipping: totals.shipping,
    total: totals.total,
    payment_method: method,
    payment_status: payment ? "paid" : "pending",
    order_status: payment ? "confirmed" : "placed",
    razorpay_order_id: payment?.orderId ?? null,
    razorpay_payment_id: payment?.paymentId ?? null,
    notes: body.notes?.trim() || null,
    status_history: history,
    created_at: iso,
    updated_at: iso,
  };

  try {
    const orderId = await adminPush("orders", order);

    await adminSet(`ordersByUser/${uid ?? "guest"}/${orderId}`, {
      order_number: order.order_number,
    });
    await adminSet(`tracking/${order.order_number}`, {
      order_number: order.order_number,
      order_status: order.order_status,
      payment_status: order.payment_status,
      status_history: history,
      phone_last4: order.phone.slice(-4),
      total: order.total,
      created_at: iso,
      updated_at: iso,
    });

    // Recorded after the order exists so a failed write leaves the proof unused
    // and the customer's payment can be matched by hand.
    if (payment) {
      await adminSet(`payments/${payment.paymentId}`, {
        order_id: orderId,
        order_number: order.order_number,
        razorpay_order_id: payment.orderId,
        amount: order.total,
        at: iso,
      });
    }

    // Take the stock out now that the order exists. A line whose product has no
    // numeric stock is left alone (unlimited), and a failed adjustment never
    // fails the order — the customer has already paid or committed to pay.
    let stockTaken = false;
    for (const line of orderItems) {
      if (!line.productId) continue;
      try {
        const left = await adminAdjustNumber(`products/${line.productId}/stock`, -line.quantity);
        if (left !== null) stockTaken = true;
      } catch (error) {
        console.warn("Stock adjustment failed:", line.productId, error);
      }
    }
    if (stockTaken) {
      // Only orders that actually moved stock may put it back on cancellation.
      await adminUpdate(`orders/${orderId}`, { stock_decremented: true });
    }

    // Unlimited coupons were already incremented above only when limited.
    if (couponKey && !couponReserved) {
      try {
        await adminAdjustNumber(`coupons/${couponKey}/used_count`, 1);
      } catch (error) {
        console.warn("Coupon usage increment failed:", couponKey, error);
      }
    }

    if (uid) {
      await adminPush(`activity/${uid}`, {
        type: "order",
        label: `Order ${order.order_number} placed`,
        meta: `₹${order.total.toLocaleString("en-IN")}`,
        href: "/track-order",
        at: iso,
      });
    }

    return Response.json({
      ok: true,
      secure: true,
      totals,
      order: { id: orderId, order_number: order.order_number },
      payment: payment ? { id: payment.paymentId, status: "paid" as const } : null,
    });
  } catch (error) {
    console.error("Secure checkout failed:", error);
    // The order did not land, so the coupon use we claimed must go back.
    if (couponReserved && couponKey) {
      try {
        await adminAdjustNumber(`coupons/${couponKey}/used_count`, -1);
      } catch {
        /* the counter can be corrected by hand from the coupon screen */
      }
    }
    if (payment) {
      // Money has moved but the order does not exist yet: surface the payment id
      // so the customer can quote it and we can reconcile instead of re-charging.
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
      { ok: false, secure: true, totals, error: "We could not record the order. Please try again." },
      { status: 500 },
    );
  }
}
