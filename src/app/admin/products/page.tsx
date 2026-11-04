"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminNav } from "@/components/admin-nav";
import { toast } from "sonner";
import { formatPrice, removeValue, subscribeProducts } from "@/lib/firebase";
import type { Product } from "@/lib/types";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeProducts((list) => {
      setProducts(list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        (product.brand_name ?? "").toLowerCase().includes(term) ||
        (product.category_name ?? "").toLowerCase().includes(term) ||
        (product.sku ?? "").toLowerCase().includes(term),
    );
  }, [products, search]);

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
    setDeleting(product.id);
    try {
      await removeValue(["products", product.id]);
      toast.success("Product deleted");
    } catch (error) {
      console.error(error);
      toast.error("Could not delete the product");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-medium">Products</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Connecting…" : `${products.length} products · live`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-56 pl-9"
              />
            </div>
            <Button asChild>
              <Link href="/admin/products/new"><Plus className="mr-2 h-4 w-4" /> Add Product</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Product</th>
                  <th className="p-3 text-left font-medium">Brand</th>
                  <th className="p-3 text-left font-medium">Price</th>
                  <th className="p-3 text-left font-medium">Stock</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded bg-muted">
                          {product.images?.[0] ? (
                            <Image src={product.images[0]} alt="" fill className="object-cover" sizes="32px" />
                          ) : null}
                        </div>
                        <div>
                          <p className="line-clamp-1 font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku || product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{product.brand_name || "—"}</td>
                    <td className="p-3 font-medium">
                      {formatPrice(product.sale_price ?? product.price)}
                      {product.sale_price ? (
                        <span className="ml-2 text-xs text-muted-foreground line-through">
                          {formatPrice(product.price)}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <span className={(product.stock ?? 0) > 0 ? "text-sage" : "text-destructive"}>
                        {product.stock ?? 0}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          product.status === "active"
                            ? "bg-sage/10 text-sage"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/products/${product.id}`}><Pencil className="h-4 w-4" /></Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(product)}
                          disabled={deleting === product.id}
                        >
                          {deleting === product.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No products found. Add your first product to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
