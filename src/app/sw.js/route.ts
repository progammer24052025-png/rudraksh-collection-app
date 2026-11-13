/**
 * The service worker, served from the site root so it can control every page.
 *
 * Built so the installed app is never stale:
 *  · Pages are always fetched fresh from the network and never stored — so a
 *    deploy shows up on the next screen, and no customer's account, cart or
 *    checkout page is ever kept on the device.
 *  · Only build files with a content hash in their name (/_next/static/…) and
 *    the app icons are cached, which makes repeat visits fast and is safe
 *    because a changed file gets a new name.
 *  · With no connection, a friendly offline screen is shown instead of the
 *    browser's error page.
 *  · The file embeds the deploy's id, so every deploy installs a new worker,
 *    which takes over immediately and clears the previous deploy's cache.
 */
export const dynamic = "force-static";

const VERSION = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "dev").slice(0, 12);

const source = `
const VERSION = ${JSON.stringify(VERSION)};
const STATIC_CACHE = "rc-static-" + VERSION;
const OFFLINE_CACHE = "rc-offline-" + VERSION;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" }))).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("rc-") && !key.endsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Firebase, Razorpay, images: untouched
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  // Pages: always the network, never cached. Offline screen when there is none.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.open(OFFLINE_CACHE).then((cache) => cache.match(OFFLINE_URL))),
    );
    return;
  }

  // Hashed build files and icons: cache first, they never change in place.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/app-icon/") || url.pathname === "/icon.svg") {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok && response.type === "basic") cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
`;

export function GET() {
  return new Response(source, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      // Browsers must re-check the worker on every visit so updates arrive.
      "cache-control": "no-cache, no-store, must-revalidate",
      "service-worker-allowed": "/",
    },
  });
}
