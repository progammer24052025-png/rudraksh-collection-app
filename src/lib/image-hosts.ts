/**
 * Hosts the Next.js image optimizer is allowed to fetch from.
 *
 * The optimizer downloads, resizes and caches whatever URL it is given, on our
 * bill. Allowing every host turns the site into a free image proxy for anyone,
 * so only the hosts the catalogue really uses are listed. Add more with a
 * comma-separated `IMAGE_HOSTS` environment variable (e.g. `cdn.example.com`).
 *
 * An image from any other https host still shows: `StoreImage` hands it to the
 * browser directly instead of sending it through the optimizer.
 */
const DEFAULT_IMAGE_HOSTS = [
  "images.unsplash.com",
  "lh3.googleusercontent.com", // Google account photos
  "firebasestorage.googleapis.com",
];

export const imageHosts: string[] = Array.from(
  new Set([
    ...DEFAULT_IMAGE_HOSTS,
    ...(process.env.IMAGE_HOSTS ?? "")
      .split(/[\s,]+/)
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  ]),
);

/** True when `src` can go through the optimizer: a local file or a listed host. */
export function isOptimizableImage(src: string): boolean {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return false;
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && imageHosts.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
