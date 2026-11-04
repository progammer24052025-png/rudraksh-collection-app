import type { MetadataRoute } from "next";
import { brands, collections, siteUrl } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPaths: Array<[string, number]> = [
    ["", 1],
    ["/products", 0.9],
    ["/collections", 0.8],
    ["/brands", 0.8],
    ["/story", 0.6],
    ["/visit", 0.6],
    ["/contact", 0.6],
    ["/faq", 0.6],
    ["/track-order", 0.5],
    ["/shipping", 0.4],
    ["/returns", 0.4],
    ["/privacy", 0.3],
    ["/terms", 0.3],
  ];

  return [
    ...staticPaths.map(([path, priority]) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: (path === "" ? "daily" : "weekly") as "daily" | "weekly",
      priority,
    })),
    ...brands.map((brand) => ({
      url: `${siteUrl}/brands/${brand.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...collections.map((collection) => ({
      url: `${siteUrl}/products?category=${collection.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
