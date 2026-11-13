import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private or per-customer pages. They also send a noindex header.
        disallow: ["/admin", "/admin/", "/api/", "/account", "/checkout", "/invoice", "/cart", "/wishlist", "/track-order"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
