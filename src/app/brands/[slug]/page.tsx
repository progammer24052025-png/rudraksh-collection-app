"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { CartProvider } from "@/lib/cart-context";
import { fetchProducts, type Product } from "@/lib/store-data";
import { brands } from "@/lib/config";

export default function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const brand = brands.find(b => b.slug === slug);

  useEffect(() => {
    setLoading(true);
    fetchProducts({ brand: slug }).then(r => {
      setProducts(r.products);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/brands"
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> All Brands
          </Link>

          <div className="mb-8">
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">
              {brand?.name || slug.replace(/-/g, " ")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? "Loading..." : `${products.length} product${products.length !== 1 ? "s" : ""}`}
            </p>
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
    </CartProvider>
  );
}
