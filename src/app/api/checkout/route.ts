import {
  adminGet,
  adminPush,
  adminSet,
  adminUpdate,
  isSecureCheckout,
} from "@/lib/server/rtdb-admin";
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
  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return Response.json({ ok: false, error: "Could not read the order." }, { status: 400 });
  }

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

  const { totals, config, orderItems, appliedCoupon } = priced.cart;
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

  const now = new Date();
  const iso = now.toISOString();
  const history = [
    { status: "placed" as const, at: iso },
    ...(payment ? [{ status: "confirmed" as const, at: iso }] : []),
  ];

  const order: Omit<Order, "id"> = {
    order_number: orderNumber(now),
    user_id: body.user_id ?? null,
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
    const uid = body.user_id ?? "guest";

    await adminSet(`ordersByUser/${uid}/${orderId}`, { order_number: order.order_number });
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

    if (appliedCoupon) {
      await adminUpdate(`coupons/${appliedCoupon.code}`, {
        used_count: (appliedCoupon.used_count ?? 0) + 1,
        updated_at: iso,
      });
    }

    if (body.user_id) {
      await adminPush(`activity/${body.user_id}`, {
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
