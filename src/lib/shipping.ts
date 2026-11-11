/**
 * Delivery charges by distance.
 *
 * The store sets a few distance bands in Admin → Settings → Delivery charges
 * ("up to 10 km ₹30, up to 50 km ₹60 …"). The distance is the straight line
 * between the store's PIN code and the customer's PIN code. When distance
 * pricing is switched off, or a PIN code cannot be located, the flat fee from
 * the same screen is used, so checkout never stalls on a lookup.
 *
 * Free delivery above the order threshold applies whatever the distance.
 *
 * This file is pure (no network), so the admin screen, the checkout page and
 * the server all agree on the fee for a given distance.
 */
import type { StoreSettings } from "./types";

export type DistanceSlab = {
  /** This band covers deliveries up to and including this many km. */
  upToKm: number;
  /** Delivery charge in rupees for the band. */
  fee: number;
};

export type ShippingRules = {
  distanceEnabled: boolean;
  /** Six-digit PIN code of the store — the point distances are measured from. */
  storePincode: string;
  slabs: DistanceSlab[];
  /** Charge beyond the last band. */
  beyondFee: number;
};

export const DEFAULT_SLABS: DistanceSlab[] = [
  { upToKm: 10, fee: 30 },
  { upToKm: 50, fee: 60 },
  { upToKm: 300, fee: 90 },
  { upToKm: 1000, fee: 120 },
];
export const DEFAULT_BEYOND_FEE = 150;
export const MAX_SLABS = 8;

const money = (value: unknown, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : fallback;
};

/** Cleans whatever is saved into rules that are always safe to price with. */
export function normalizeShipping(settings?: Pick<StoreSettings, "shipping"> | null): ShippingRules {
  const saved = settings?.shipping ?? {};
  const slabs = (Array.isArray(saved.slabs) ? saved.slabs : [])
    .map((slab) => ({ upToKm: Number(slab?.upToKm), fee: money(slab?.fee, -1) }))
    .filter((slab) => Number.isFinite(slab.upToKm) && slab.upToKm > 0 && slab.fee >= 0)
    .sort((a, b) => a.upToKm - b.upToKm)
    .slice(0, MAX_SLABS);

  const storePincode = String(saved.storePincode ?? "").replace(/\D/g, "").slice(0, 6);

  return {
    // Distance pricing needs somewhere to measure from.
    distanceEnabled: Boolean(saved.distanceEnabled) && storePincode.length === 6,
    storePincode,
    slabs: slabs.length ? slabs : DEFAULT_SLABS,
    beyondFee: money(saved.beyondFee, DEFAULT_BEYOND_FEE),
  };
}

/** The charge for a delivery this far away. */
export function feeForDistance(rules: ShippingRules, distanceKm: number): number {
  const slab = rules.slabs.find((entry) => distanceKm <= entry.upToKm);
  return slab ? slab.fee : rules.beyondFee;
}

/** Straight-line distance between two points on the earth, in km. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type ShippingQuote = {
  /** Delivery charge before the free-delivery threshold is considered. */
  fee: number;
  /** Null when distance pricing is off or the PIN code could not be located. */
  distanceKm: number | null;
  mode: "distance" | "flat";
};
