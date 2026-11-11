/**
 * Where a PIN code is, and what delivery to it costs.
 *
 * PIN codes are located with OpenStreetMap's free Nominatim search. Each PIN
 * code is looked up once and then remembered (in the database when the service
 * account is configured, otherwise in memory), so normal trading makes almost
 * no outside requests. Only the six-digit PIN code is ever sent — never a name,
 * phone number or street address.
 *
 * Every failure (service down, unknown PIN code, slow network) falls back to
 * the flat delivery fee. A lookup problem must never block an order.
 */
import {
  feeForDistance,
  haversineKm,
  normalizeShipping,
  type ShippingQuote,
} from "@/lib/shipping";
import { adminGet, adminSet, isSecureCheckout } from "@/lib/server/rtdb-admin";
import type { StoreSettings } from "@/lib/types";

type Point = { lat: number; lng: number };

const LOOKUP_TIMEOUT_MS = 4000;
/** India's bounding box — a result outside it is a wrong match, not a location. */
const inIndia = (point: Point) =>
  point.lat > 6 && point.lat < 37.5 && point.lng > 68 && point.lng < 97.5;

const memory = new Map<string, Point | null>();

export const isPincode = (value: string) => /^[1-8]\d{5}$/.test(value);

async function lookUp(pincode: string): Promise<Point | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&postalcode=${pincode}`;
    const response = await fetch(url, {
      headers: { "user-agent": "store-delivery-calculator/1.0", accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const results = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const first = results?.[0];
    const point = { lat: Number(first?.lat), lng: Number(first?.lon) };
    return Number.isFinite(point.lat) && Number.isFinite(point.lng) && inIndia(point) ? point : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Coordinates for a PIN code, or null when it cannot be located. */
export async function locatePincode(pincode: string): Promise<Point | null> {
  if (!isPincode(pincode)) return null;
  if (memory.has(pincode)) return memory.get(pincode) ?? null;

  const secure = isSecureCheckout();
  if (secure) {
    try {
      const saved = await adminGet<Point>(`pincodeGeo/${pincode}`);
      if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lng)) {
        memory.set(pincode, saved);
        return saved;
      }
    } catch {
      /* fall through to a fresh lookup */
    }
  }

  const point = await lookUp(pincode);
  // A miss is remembered for this instance only, so a temporary outage is
  // retried later instead of being stored as "unknown" for good.
  if (memory.size > 5000) memory.clear();
  memory.set(pincode, point);
  if (point && secure) {
    adminSet(`pincodeGeo/${pincode}`, { ...point, at: new Date().toISOString() }).catch(() => {});
  }
  return point;
}

/**
 * The delivery charge for an order going to `pincode`, before the
 * free-delivery threshold is applied.
 */
export async function quoteShipping(
  settings: StoreSettings | null | undefined,
  pincode: string | null | undefined,
  flatFee: number,
): Promise<ShippingQuote> {
  const flat: ShippingQuote = { fee: flatFee, distanceKm: null, mode: "flat" };
  const rules = normalizeShipping(settings);
  const destination = String(pincode ?? "").replace(/\D/g, "");
  if (!rules.distanceEnabled || !isPincode(destination)) return flat;

  // Same PIN code as the store: no lookup needed.
  if (destination === rules.storePincode) {
    return { fee: feeForDistance(rules, 0), distanceKm: 0, mode: "distance" };
  }

  const [from, to] = await Promise.all([locatePincode(rules.storePincode), locatePincode(destination)]);
  if (!from || !to) return flat;

  const distanceKm = Math.round(haversineKm(from, to));
  return { fee: feeForDistance(rules, distanceKm), distanceKm, mode: "distance" };
}
