/**
 * The shop's live Google rating.
 *
 * Read from Google's Places API (New) Place Details endpoint, asking only for
 * the three fields shown on the site, so each lookup is billed at a single
 * Place Details request. The result is refreshed at most once every
 * `REFRESH_SECONDS` (shared across all visitors by Next's data cache): roughly
 * 360 requests a month, inside Google's free monthly allowance for this SKU.
 *
 * Needs two server-only environment variables:
 *   GOOGLE_PLACES_API_KEY  an API key restricted to "Places API (New)"
 *   GOOGLE_PLACE_ID        the shop's place ID
 *
 * Without them, or if Google cannot be reached, this returns null and the
 * site simply shows no rating. It never falls back to a typed-in number.
 */

const REFRESH_SECONDS = 2 * 60 * 60;
const TIMEOUT_MS = 4000;

export type GoogleRating = {
  /** Average star rating, 1.0–5.0, as Google reports it. */
  rating: number;
  /** Number of Google reviews behind the average. */
  count: number;
  /** The shop's page on Google Maps, where the reviews can be read. */
  mapsUrl: string | null;
};

export async function getGoogleRating(): Promise<GoogleRating | null> {
  const key = (process.env.GOOGLE_PLACES_API_KEY ?? "").trim();
  const placeId = (process.env.GOOGLE_PLACE_ID ?? "").trim();
  if (!key || !/^[A-Za-z0-9_-]{10,300}$/.test(placeId)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri",
      },
      signal: controller.signal,
      next: { revalidate: REFRESH_SECONDS, tags: ["google-rating"] },
    });
    if (!response.ok) {
      console.warn(`Google rating lookup failed (${response.status}).`);
      return null;
    }
    const data = (await response.json()) as {
      rating?: number;
      userRatingCount?: number;
      googleMapsUri?: string;
    };
    const rating = Number(data.rating);
    const count = Number(data.userRatingCount);
    // A place with no reviews has no rating; showing "0.0" would be misleading.
    if (!Number.isFinite(rating) || rating < 1 || rating > 5 || !Number.isFinite(count) || count < 1) {
      return null;
    }
    const mapsUrl =
      typeof data.googleMapsUri === "string" && /^https:\/\/(maps\.google\.com|www\.google\.com\/maps|maps\.app\.goo\.gl)\b/.test(data.googleMapsUri)
        ? data.googleMapsUri
        : null;
    return { rating: Math.round(rating * 10) / 10, count: Math.floor(count), mapsUrl };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
