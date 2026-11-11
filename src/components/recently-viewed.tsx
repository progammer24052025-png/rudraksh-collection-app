"use client";

import { useEffect, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { fetchProducts, type Product } from "@/lib/store-data";

const STORAGE_KEY = "rudraksh-recently-viewed";
const MAX_REMEMBERED = 12;

function readIds(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Remembers a product the shopper opened. Kept on this device only. */
export function rememberViewed(productId: string) {
  try {
    const next = [productId, ...readIds().filter((id) => id !== productId)].slice(0, MAX_REMEMBERED);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage may be disabled */
  }
}

/** A row of the shopper's own recently opened products. Renders nothing when empty. */
export function RecentlyViewed({
  excludeIds = [],
  title = "Recently viewed",
  limit = 4,
}: {
  excludeIds?: string[];
  title?: string;
  limit?: number;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const excludeKey = excludeIds.join(",");

  useEffect(() => {
    const exclude = new Set(excludeKey ? excludeKey.split(",") : []);
    const ids = readIds().filter((id) => !exclude.has(id));
    if (!ids.length) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    fetchProducts()
      .then(({ products: all }) => {
        if (cancelled) return;
        const byId = new Map(all.map((product) => [product.id, product]));
        setProducts(
          ids
            .map((id) => byId.get(id))
            .filter((product): product is Product => Boolean(product))
            .slice(0, limit),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [excludeKey, limit]);

  if (!products.length) return null;

  return (
    <section className="mt-16">
      <h2 className="font-serif text-2xl font-medium">{title}</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </section>
  );
}
