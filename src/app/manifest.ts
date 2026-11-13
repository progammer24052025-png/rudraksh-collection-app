import type { MetadataRoute } from "next";

import { storeConfig } from "@/lib/config";

/**
 * Makes the shop installable as an app (Android, desktop Chrome/Edge; iPhone
 * via Share → Add to Home Screen). The installed app always loads the live
 * site, so every deploy reaches it; see public/sw.js for how updates apply.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: storeConfig.name,
    short_name: "Rudraksh",
    description: "Everyday and ethnic wear for men, women and kids — shop online or visit us in Vadodara.",
    // Tagged so app opens show up as their own source in Admin → Analytics.
    start_url: "/?utm_source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF7F2",
    theme_color: "#FAF7F2",
    categories: ["shopping", "lifestyle"],
    lang: "en-IN",
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Shop all", url: "/products?utm_source=app", icons: [{ src: "/app-icon/192", sizes: "192x192" }] },
      { name: "Offers", url: "/offers?utm_source=app", icons: [{ src: "/app-icon/192", sizes: "192x192" }] },
      { name: "My orders", url: "/account?utm_source=app", icons: [{ src: "/app-icon/192", sizes: "192x192" }] },
      { name: "Cart", url: "/cart?utm_source=app", icons: [{ src: "/app-icon/192", sizes: "192x192" }] },
    ],
  };
}
