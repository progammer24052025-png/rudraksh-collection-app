"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminNav } from "@/components/admin-nav";
import { ImageDropzone } from "@/components/kit/image-dropzone";
import { RailCutoutField } from "@/components/kit/rail-cutout-field";
import {
  getFirebaseAuth,
  readValue,
  subscribeBrands,
  subscribeCategories,
  writeValue,
} from "@/lib/firebase";
import type { Brand, Category, Product, ProductColor } from "@/lib/types";

type FormState = {
  name: string;
  slug: string;
  brand_id: string;
  category_id: string;
  description: string;
  price: string;
  sale_price: string;
  sku: string;
  sizes: string[];
  colors: ProductColor[];
  images: string[];
  image_cutout: string;
  fabric: string;
  care: string;
  stock: string;
  status: string;
  is_featured: boolean;
  is_new: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  brand_id: "",
  category_id: "",
  description: "",
  price: "",
  sale_price: "",
  sku: "",
  sizes: [],
  colors: [],
  images: [],
  image_cutout: "",
  fabric: "",
  care: "",
  stock: "0",
  status: "active",
  is_featured: false,
  is_new: true,
};

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function AdminProductEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "new";
  const isNew = id === "new";
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [inheritedFrom, setInheritedFrom] = useState<string | null>(null);
  const [newSize, setNewSize] = useState("");
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");

  useEffect(() => {
    const offBrands = subscribeBrands(setBrands);
    const offCategories = subscribeCategories(setCategories);
    return () => {
      offBrands();
      offCategories();
    };
  }, []);

  const loadProduct = useCallback(async () => {
    if (isNew) {
      setLoading(false);
      return;
    }
    const product = await readValue<Product>(["products", id]);
    if (!product) {
      toast.error("Product not found");
      router.replace("/admin/products");
      return;
    }
    setForm({
      name: product.name ?? "",
      slug: product.slug ?? "",
      brand_id: product.brand_id ?? "",
      category_id: product.category_id ?? "",
      description: product.description ?? "",
      price: String(product.price ?? ""),
      sale_price: product.sale_price != null ? String(product.sale_price) : "",
      sku: product.sku ?? "",
      sizes: Array.isArray(product.sizes) ? product.sizes : [],
      colors: Array.isArray(product.colors) ? product.colors : [],
      images: Array.isArray(product.images) ? product.images : [],
      image_cutout: product.image_cutout ?? "",
      fabric: product.fabric ?? "",
      care: product.care ?? "",
      stock: String(product.stock ?? 0),
      status: product.status ?? "active",
      is_featured: Boolean(product.is_featured),
      is_new: Boolean(product.is_new),
    });
    setLoading(false);
  }, [id, isNew, router]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) {
      toast.error("Product name and price are required");
      return;
    }

    const brand = brands.find((item) => item.id === form.brand_id || item.slug === form.brand_id);
    const category = categories.find((item) => item.id === form.category_id || item.slug === form.category_id);

    const now = new Date().toISOString();
    const productId = isNew ? `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` : id;
    const existing = isNew ? null : await readValue<Product>(["products", id]);

    const payload: Product = {
      id: productId,
      name: form.name.trim(),
      slug: (form.slug || slugify(form.name)).trim(),
      brand_id: brand?.id ?? (form.brand_id || null),
      brand_name: brand?.name ?? "Rudraksh",
      brand_slug: brand?.slug ?? "",
      category_id: category?.id ?? (form.category_id || null),
      category_name: category?.name ?? "",
      category_slug: category?.slug ?? "",
      description: form.description.trim(),
      price: Number(form.price),
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      sku: form.sku.trim() || null,
      sizes: form.sizes,
      colors: form.colors,
      images: form.images,
      image_cutout: form.image_cutout || null,
      fabric: form.fabric.trim() || null,
      care: form.care.trim() || null,
      stock: Number(form.stock) || 0,
      status: (form.status as Product["status"]) ?? "active",
      is_featured: form.is_featured,
      is_new: form.is_new,
      // Written by the server (reviews and orders); a save from this form must
      // carry them over or every edit would wipe a product's rating and sales.
      ...(typeof existing?.rating === "number" ? { rating: existing.rating } : {}),
      ...(typeof existing?.rating_count === "number" ? { rating_count: existing.rating_count } : {}),
      ...(typeof existing?.sold_count === "number" ? { sold_count: existing.sold_count } : {}),
      ...(existing?.announced_at ? { announced_at: existing.announced_at } : {}),
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    const restocked = !isNew && (existing?.stock ?? 0) <= 0 && payload.stock > 0 && payload.status === "active";

    setSaving(true);
    try {
      await writeValue(["products", productId], payload);
      toast.success(isNew ? "Product created" : "Product updated");
      if (restocked) void notifyRestock(productId);
      router.push("/admin/products");
    } catch (error) {
      console.error(error);
      toast.error("Could not save the product");
    } finally {
      setSaving(false);
    }
  };

  /** Emails customers who asked to hear when this product is back. */
  async function notifyRestock(id: string) {
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      if (!token) return;
      const response = await fetch("/api/stock-alerts", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: id }),
      });
      const data = (await response.json()) as { ok?: boolean; sent?: number };
      if (data.ok && data.sent) {
        toast.success(`Back-in-stock email sent to ${data.sent} waiting customer${data.sent === 1 ? "" : "s"}`);
      }
    } catch (error) {
      console.warn("Back-in-stock alert failed:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <AdminNav />
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/products"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="font-serif text-2xl font-medium">{isNew ? "Add Product" : "Edit Product"}</h1>
        </div>

        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                    slug: isNew ? slugify(event.target.value) : form.slug,
                  })
                }
                placeholder="Boys' Cotton Casual Shirt"
              />
            </div>
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <Input
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
                placeholder="auto-generated"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={3}
              placeholder="Fabric, fit and styling notes"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select
                value={form.brand_id}
                onValueChange={(value) => {
                  // A blank category inherits the brand's primary category.
                  const brand = brands.find((item) => item.id === value);
                  const inheritedSlug = brand?.category_slugs?.[0];
                  const inherited = inheritedSlug
                    ? categories.find(
                        (category) => category.slug === inheritedSlug || category.id === inheritedSlug,
                      )
                    : undefined;
                  if (!form.category_id && inherited) {
                    setInheritedFrom(inherited.name);
                    setForm({ ...form, brand_id: value, category_id: inherited.id });
                    return;
                  }
                  setForm({ ...form, brand_id: value });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <Label>Collection</Label>
                {inheritedFrom ? (
                  <span className="text-[11px] text-muted-foreground">from {inheritedFrom}</span>
                ) : null}
              </div>
              <Select
                value={form.category_id}
                onValueChange={(value) => {
                  setInheritedFrom(null);
                  setForm({ ...form, category_id: value });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select collection" /></SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} placeholder="RC-0001" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Price (₹) *</Label>
              <Input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Sale Price (₹)</Label>
              <Input type="number" value={form.sale_price} onChange={(event) => setForm({ ...form, sale_price: event.target.value })} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sizes</Label>
            <div className="flex flex-wrap gap-2">
              {form.sizes.map((size) => (
                <span key={size} className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-sm">
                  {size}
                  <button type="button" onClick={() => setForm({ ...form, sizes: form.sizes.filter((item) => item !== size) })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSize}
                onChange={(event) => setNewSize(event.target.value)}
                placeholder="e.g. 4-5Y"
                className="w-40"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (newSize && !form.sizes.includes(newSize)) {
                      setForm({ ...form, sizes: [...form.sizes, newSize] });
                      setNewSize("");
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (newSize && !form.sizes.includes(newSize)) {
                    setForm({ ...form, sizes: [...form.sizes, newSize] });
                    setNewSize("");
                  }
                }}
              >
                <Plus className="h-4 w-4" /> Add size
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Colours</Label>
            <div className="flex flex-wrap gap-2">
              {form.colors.map((color) => (
                <span key={color.name} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-sm">
                  <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: color.hex }} />
                  {color.name}
                  <button type="button" onClick={() => setForm({ ...form, colors: form.colors.filter((item) => item.name !== color.name) })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newColorName} onChange={(event) => setNewColorName(event.target.value)} placeholder="Colour name" className="w-36" />
              <input
                type="color"
                value={newColorHex}
                onChange={(event) => setNewColorHex(event.target.value)}
                className="h-9 w-10 cursor-pointer rounded border"
                aria-label="Colour swatch"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (newColorName && !form.colors.some((item) => item.name === newColorName)) {
                    setForm({ ...form, colors: [...form.colors, { name: newColorName, hex: newColorHex }] });
                    setNewColorName("");
                  }
                }}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Product images</Label>
            {/* Files land in the category → brand → product folder; only the path is stored. */}
            <ImageDropzone
              value={form.images}
              onChange={(images) => setForm({ ...form, images })}
              folder={`resources/products/${
                (brands.find((brand) => brand.id === form.brand_id)?.slug ?? "unbranded")
              }/${form.slug || "product"}`}
              name={form.slug || "product"}
              max={8}
            />
          </div>

          <RailCutoutField
            images={form.images}
            folder={`resources/products/${
              (brands.find((brand) => brand.id === form.brand_id)?.slug ?? "unbranded")
            }/${form.slug || "product"}`}
            name={form.slug || "product"}
            value={form.image_cutout}
            onChange={(image_cutout) => setForm({ ...form, image_cutout })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fabric</Label>
              <Input value={form.fabric} onChange={(event) => setForm({ ...form, fabric: event.target.value })} placeholder="100% cotton" />
            </div>
            <div className="space-y-2">
              <Label>Care</Label>
              <Input value={form.care} onChange={(event) => setForm({ ...form, care: event.target.value })} placeholder="Machine wash cold" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(event) => setForm({ ...form, is_featured: event.target.checked })}
                  className="accent-primary"
                />
                Featured on homepage
              </label>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_new}
                  onChange={(event) => setForm({ ...form, is_new: event.target.checked })}
                  className="accent-primary"
                />
                Show as new arrival
              </label>
            </div>
          </div>

          <div className="flex gap-3 border-t border-border pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> {isNew ? "Create Product" : "Save Changes"}</>
              )}
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/products">Cancel</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
