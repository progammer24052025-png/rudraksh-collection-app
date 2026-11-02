import type { MetadataRoute } from "next";
import { brands, collections } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://rudrakshcollection.in"; // TODO: update with actual domain

  const staticPages = [
    "",
    "/products",
    "/collections",
    "/brands",
    "/story",
    "/visit",
    "/shipping",
    "/returns",
    "/privacy",
    "/terms",
  ].map(path => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const brandPages = brands.map(brand => ({
    url: `${baseUrl}/brands/${brand.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const collectionPages = collections.map(col => ({
    url: `${baseUrl}/products?category=${col.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...brandPages, ...collectionPages];
}
