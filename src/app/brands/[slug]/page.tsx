"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { fetchProducts, type Product } from "@/lib/store-data";
import { brands as fallbackBrands } from "@/lib/config";
import { subscribeBrands } from "@/lib/firebase";
import type { Brand } from "@/lib/types";
import { BrandLogoBadge } from "@/components/brand-logo-badge";

export default function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [products, setProducts] = useState<Product[]>([]);
  const [brandRecord, setBrandRecord] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeBrands((list) => {
      const match = list.find((b) => b.slug === slug || b.id === slug);
      if (match) setBrandRecord(match);
    });
  }, [slug]);
  const fallback = fallbackBrands.find((b) => b.slug === slug);
  const brandName = brandRecord?.name || fallback?.name || slug.replace(/-/g, " ");
  const brandDescription = brandRecord?.description ?? null;
  const brandLogo = brandRecord?.logo ?? null;

  useEffect(() => {
    setLoading(true);
    fetchProducts({ brand: slug }).then(r => {
      setProducts(r.products);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  return (
    <>
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/brands"
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> All Brands
          </Link>

          <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-full border border-border/70 bg-white p-2 shadow-sm overflow-hidden">
              <BrandLogoBadge slug={slug} name={brandName} logo={brandLogo} />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-medium sm:text-4xl">
                {brandName}
              </h1>
              {brandDescription && (
                <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                  {brandDescription}
                </p>
              )}
              {(brandRecord?.category_names ?? []).length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(brandRecord?.category_names ?? []).map((category) => (
                    <span
                      key={category}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground/75"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="mt-1.5 text-xs text-muted-foreground/80">
                {loading ? "Loading..." : `${products.length} product${products.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] rounded-lg bg-muted" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p, idx) => (
                <ProductCard key={p.id} product={p} index={idx} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-lg font-medium">No products found</p>
              <p className="mt-2 text-muted-foreground">Check back soon for new arrivals from this brand.</p>
              <Link href="/products" className="mt-4 inline-block text-sm text-primary hover:underline">
                Browse all products →
              </Link>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
