/**
 * Google Maps & Directions utility helpers.
 * Handles pasted iframe snippets, raw embed URLs, and standard Google Maps links.
 */

export const DEFAULT_STORE_ADDRESS =
  "125, Pancham Heights, Khodiyar Nagar, New VIP Road, Vadodara, Gujarat";

/**
 * Extracts a safe Google Maps embed URL from either:
 * - A full `<iframe src="..."></iframe>` snippet
 * - A direct embed URL
 * - Or generates an address query embed fallback
 */
export function parseGoogleMapsEmbedUrl(
  rawUrlOrSnippet?: string | null,
  fallbackAddress: string = DEFAULT_STORE_ADDRESS,
): string {
  if (!rawUrlOrSnippet) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(fallbackAddress)}&output=embed`;
  }

  const trimmed = rawUrlOrSnippet.trim();

  // 1. If user pasted the whole <iframe> tag from Google Maps
  const iframeSrcMatch = trimmed.match(/src=["'](https?:\/\/[^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    return iframeSrcMatch[1];
  }

  // 2. If it's already a direct Google Maps embed URL
  if (trimmed.startsWith("https://www.google.com/maps/embed") || trimmed.includes("output=embed")) {
    return trimmed;
  }

  // 3. If it's a regular HTTP(S) URL, check if it's a place link
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    // If it's a standard google search or place link, wrap it with embed output
    if (trimmed.includes("google.com/maps")) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(fallbackAddress)}&output=embed`;
    }
    return trimmed;
  }

  // 4. Default fallback: embed with the store's physical address query
  const query = fallbackAddress || DEFAULT_STORE_ADDRESS;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/**
 * Returns a direct Google Maps navigation URL for opening on Android / iOS / Web.
 */
export function getDirectionsUrl(
  destinationAddress?: string | null,
): string {
  const destination = destinationAddress?.trim() || DEFAULT_STORE_ADDRESS;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/**
 * Returns an Apple Maps navigation URL for iOS users.
 */
export function getAppleMapsUrl(
  destinationAddress?: string | null,
): string {
  const destination = destinationAddress?.trim() || DEFAULT_STORE_ADDRESS;
  return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}`;
}

