/**
 * Delivery charge for a PIN code.
 *
 *   GET /api/shipping?pincode=390019
 *
 * Used by checkout and the product page so the customer sees the same charge
 * the server will apply to the order. It reveals nothing private: the fee
 * bands are the store's public price list.
 */
import { normalizePricing } from "@/lib/pricing";
import { isPincode, quoteShipping } from "@/lib/server/geo";
import { clientIp, rateLimit, tooManyRequestsResponse } from "@/lib/server/http";
import { publicGet } from "@/lib/server/price-cart";
import type { StoreSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // A new PIN code can cost one outside lookup, so this is throttled.
  const gate = await rateLimit(`shipping:${clientIp(request)}`, 40, 10 * 60 * 1000);
  if (!gate.ok) return tooManyRequestsResponse(gate.retryAfter);

  const pincode = (new URL(request.url).searchParams.get("pincode") ?? "").replace(/\D/g, "");
  if (!isPincode(pincode)) {
    return Response.json({ ok: false, error: "Enter a valid 6-digit PIN code." }, { status: 400 });
  }

  const settings = (await publicGet<StoreSettings>("settings").catch(() => null)) ?? {};
  const pricing = normalizePricing({
    freeShippingThreshold: settings.freeShippingThreshold,
    shippingFee: settings.shippingFee,
    tax: settings.tax,
  });
  const quote = await quoteShipping(settings, pincode, pricing.shippingFee);

  return Response.json(
    {
      ok: true,
      pincode,
      fee: quote.fee,
      distanceKm: quote.distanceKm,
      mode: quote.mode,
      freeAbove: pricing.freeShippingThreshold,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
