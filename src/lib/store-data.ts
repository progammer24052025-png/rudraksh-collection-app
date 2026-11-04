"use client";

// Compatibility facade over the Firebase Realtime Database layer.
// Storefront pages import from here; all reads/writes hit RTDB only.

import {
  effectivePrice,
  fetchProductBySlug,
  fetchProducts as fetchAllProducts,
  formatPrice,
  placeOrder,
  type NewOrderInput,
} from "./firebase";
import type { CartItem, Order, Product } from "./types";

export type { CartItem, Order, Product };
export { effectivePrice, formatPrice };

export interface ProductFilters {
  brand?: string;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  featured?: boolean;
  inStock?: boolean;
  limit?: number;
  offset?: number;
}

const isActive = (product: Product) => product.status === "active";

export function filterProducts(products: Product[], filters: ProductFilters = {}): Product[] {
  let list = products.filter(isActive);

  if (filters.brand) {
    list = list.filter((p) => p.brand_slug === filters.brand || p.brand_id === filters.brand);
  }
  if (filters.category) {
    list = list.filter((p) => p.category_slug === filters.category || p.category_id === filters.category);
  }
  if (filters.search) {
    const term = filters.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.brand_name ?? "").toLowerCase().includes(term) ||
        (p.category_name ?? "").toLowerCase().includes(term) ||
        (p.description ?? "").toLowerCase().includes(term) ||
        (p.tags ?? []).some((tag) => tag.toLowerCase().includes(term)),
    );
  }
  if (filters.minPrice != null) list = list.filter((p) => effectivePrice(p) >= filters.minPrice!);
  if (filters.maxPrice != null) list = list.filter((p) => effectivePrice(p) <= filters.maxPrice!);
  if (filters.sizes?.length) {
    list = list.filter((p) => p.sizes?.some((size) => filters.sizes!.includes(size)));
  }
  if (filters.featured) list = list.filter((p) => p.is_featured);
  if (filters.inStock) list = list.filter((p) => (p.stock ?? 0) > 0);

  list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? list.length;
  return list.slice(offset, offset + limit);
}

export async function fetchProducts(
  filters: ProductFilters = {},
): Promise<{ products: Product[]; total: number }> {
  const all = await fetchAllProducts();
  const filtered = filterProducts(all, filters);
  return { products: filtered, total: filtered.length };
}

export async function fetchProduct(slug: string): Promise<Product | null> {
  return fetchProductBySlug(slug);
}

export interface CreateOrderResult {
  ok: boolean;
  order?: { id: string; order_number: string };
  error?: string;
}

export async function createOrder(
  data: Omit<NewOrderInput, "payment_method"> & { payment_method?: "cod" | "razorpay" },
): Promise<CreateOrderResult> {
  try {
    const order = await placeOrder({
      ...data,
      payment_method: data.payment_method === "razorpay" ? "razorpay" : "cod",
    });
    return { ok: true, order: { id: order.id, order_number: order.order_number } };
  } catch (error) {
    console.error("Order creation failed:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not place the order. Please try again.",
    };
  }
}

/** @deprecated Seeding is handled by `npm run seed`, kept for API compatibility. */
export async function seedDatabase(): Promise<void> {
  console.warn("Seeding runs from the command line: npm run seed");
}
