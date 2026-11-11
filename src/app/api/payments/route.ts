/**
 * Starts an online payment.
 *
 * GET  → whether online payment is usable right now (admin toggle + keys +
 *        secure checkout), and the public key id.
 * POST → prices the bag from the database, then opens a Razorpay order for
 *        exactly that amount. No order is written here: nothing is recorded
 *        until `/api/checkout` has verified the payment.
 */
import {
  clientIp,
  crossOriginResponse,
  isSameOrigin,
  rateLimit,
  tooManyRequestsResponse,
} from "@/lib/server/http";
import { adminSet, isSecureCheckout } from "@/lib/server/rtdb-admin";
import { pendingPath, type PendingCheckout } from "@/lib/server/create-order";
import { callerFrom } from "@/lib/server/id-token";
import { digits, orderNumber, priceCart, type CartRequest } from "@/lib/server/price-cart";
import {
  createRazorpayOrder,
  razorpayConfigured,
  razorpayPublicKey,
} from "@/lib/server/razorpay";

export const dynamic = "force-dynamic";

/** Razorpay's floor for an INR order, in paise. */
const MIN_AMOUNT_PAISE = 100;

export async function GET() {
  const configured = razorpayConfigured();
  const secure = isSecureCheckout();
  return Response.json(
    {
      ok: true,
      configured,
      secure,
      available: configured, // Razorpay is available whenever API keys are configured
      keyId: configured ? razorpayPublicKey() : null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse();

  // Every call creates a real gateway order against the store's account, so an
  // unthrottled loop here is somebody else spending our API quota.
  const gate = await rateLimit(`payments:${clientIp(request)}`, 15, 10 * 60 * 1000);
  if (!gate.ok) return tooManyRequestsResponse(gate.retryAfter);

  if (!razorpayConfigured()) {
    return Response.json(
      { ok: false, error: "Online payment is not configured yet." },
      { status: 503 },
    );
  }

  let body: CartRequest;
  try {
    body = (await request.json()) as CartRequest;
  } catch {
    return Response.json({ ok: false, error: "Could not read the order." }, { status: 400 });
  }

  // The token's uid, when present, drives the once-per-customer coupon check.
  const caller = await callerFrom(request);
  const priced = await priceCart(body, caller?.uid ?? null);
  if (!priced.ok) {
    return Response.json({ ok: false, error: priced.error }, { status: priced.status });
  }

  const amountPaise = Math.round(priced.cart.totals.total * 100);
  if (amountPaise < MIN_AMOUNT_PAISE) {
    return Response.json(
      { ok: false, error: "This order total is too small for online payment." },
      { status: 400 },
    );
  }

  const receipt = orderNumber();
  try {
    const order = await createRazorpayOrder({
      amountPaise,
      receipt,
      notes: {
        receipt,
        items: String(priced.cart.orderItems.length),
        ...(priced.cart.totals.couponCode ? { coupon: priced.cart.totals.couponCode } : {}),
      },
    });

    // Save what is needed to write the order later. If the customer pays and
    // their browser never reports back, the gateway webhook finishes the order
    // from this record. Skipped when the delivery details are incomplete — the
    // browser path still works, only the safety net is missing.
    const customer = body.customer ?? {};
    const complete =
      Boolean(customer.name?.trim() && customer.address?.trim() && customer.city?.trim() && customer.state?.trim()) &&
      digits(customer.phone ?? "").length >= 10 &&
      digits(customer.pincode ?? "").length === 6;

    if (caller && complete && isSecureCheckout()) {
      const { totals, config, orderItems, appliedCoupon, couponKey, distanceKm } = priced.cart;
      const pending: PendingCheckout = {
        uid: caller.uid,
        amount_paise: amountPaise,
        customer: {
          name: (customer.name ?? "").trim(),
          phone: digits(customer.phone ?? ""),
          email: customer.email?.trim() || null,
          address: (customer.address ?? "").trim(),
          city: (customer.city ?? "").trim(),
          state: (customer.state ?? "").trim(),
          pincode: digits(customer.pincode ?? ""),
        },
        orderItems,
        totals,
        taxRate: config.tax.enabled ? config.tax.rate : 0,
        notes: body.notes?.trim() || null,
        distanceKm,
        coupon: appliedCoupon
          ? {
              code: appliedCoupon.code,
              key: couponKey,
              maxUses: typeof appliedCoupon.max_uses === "number" ? appliedCoupon.max_uses : 0,
            }
          : null,
        created_at: new Date().toISOString(),
      };
      try {
        await adminSet(pendingPath(order.id), pending);
      } catch (error) {
        console.error("Could not save the pending checkout:", error);
      }
    }

    return Response.json(
      {
        ok: true,
        keyId: razorpayPublicKey(),
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt,
        totals: priced.cart.totals,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    return Response.json(
      { ok: false, error: "We could not start the payment. Please try again." },
      { status: 502 },
    );
  }
}
