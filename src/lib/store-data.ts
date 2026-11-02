"use client";

export type Product = {
  id: string;
  name: string;
  slug: string;
  brand_id: string | null;
  category_id: string | null;
  description: string;
  price: number;
  sale_price: number | null;
  sku: string | null;
  sizes: string[];
  colors: { name: string; hex: string }[];
  images: string[];
  fabric: string | null;
  care: string | null;
  stock: number;
  status: string;
  is_sample: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  brand_name?: string;
  brand_slug?: string;
  category_name?: string;
  category_slug?: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
  size: string;
  color: string;
};

export const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(price);
};

// ── API fetchers ────────────────────────────────────────
export async function fetchProducts(params: Record<string, string> = {}): Promise<{ products: Product[]; total: number }> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/products${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
}

export async function fetchProduct(slug: string): Promise<Product | null> {
  const res = await fetch(`/api/products/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load product");
  return res.json();
}

export async function createOrder(data: Record<string, unknown>): Promise<{ ok: boolean; order?: { id: string; order_number: string }; error?: string }> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function seedDatabase(): Promise<void> {
  await fetch("/api/seed", { method: "POST" });
}
