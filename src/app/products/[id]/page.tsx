import type { Metadata } from "next";

import { siteUrl, storeConfig } from "@/lib/config";
import { effectivePrice } from "@/lib/pricing";
import { getProductBySlug } from "@/lib/server/catalog";
import type { Product } from "@/lib/types";

import { ProductDetailView } from "./product-detail";

type PageProps = { params: Promise<{ id: string }> };

/** Only absolute http(s) images are usable in link previews and search results. */
const shareableImages = (product: Product) =>
  (product.images ?? []).filter((image) => /^https?:\/\//.test(image)).slice(0, 4);

const summary = (product: Product) => {
  const text = (product.description || "").replace(/\s+/g, " ").trim();
  const fallback = `Shop ${product.name}${product.brand_name ? ` by ${product.brand_name}` : ""} at ${storeConfig.name}, ${storeConfig.city}. Cash on delivery and easy returns.`;
  return (text || fallback).slice(0, 160);
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductBySlug(id);
  if (!product || product.status !== "active") {
    return { title: "Product not found", robots: { index: false, follow: true } };
  }

  const title = product.brand_name ? `${product.name} — ${product.brand_name}` : product.name;
  const description = summary(product);
  const images = shareableImages(product);
  const url = `/products/${product.slug || id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: storeConfig.name,
      locale: "en_IN",
      images,
    },
    twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images },
  };
}

/** schema.org Product data, so search results can show price, stock and rating. */
function productJsonLd(product: Product, slug: string) {
  const reviewed = (product.rating_count ?? 0) > 0 && typeof product.rating === "number";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: summary(product),
    image: shareableImages(product),
    sku: product.sku || undefined,
    brand: product.brand_name ? { "@type": "Brand", name: product.brand_name } : undefined,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${slug}`,
      priceCurrency: "INR",
      price: effectivePrice(product),
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: storeConfig.name },
    },
    // Only real, verified-buyer ratings are published; none means no rating markup.
    aggregateRating: reviewed
      ? { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.rating_count }
      : undefined,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProductBySlug(id);
  const structured =
    product && product.status === "active" ? productJsonLd(product, product.slug || id) : null;

  return (
    <>
      {structured && (
        <script
          type="application/ld+json"
          // `<` is escaped so product text can never close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }}
        />
      )}
      <ProductDetailView slug={id} />
    </>
  );
}
