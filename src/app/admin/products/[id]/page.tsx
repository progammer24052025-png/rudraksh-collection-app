"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Plus, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminNav } from "@/components/admin-nav";
import { toast } from "sonner";
import { brands, collections } from "@/lib/config";

interface ProductForm {
  id?: string;
  name: string;
  slug: string;
  brand_id: string;
  category_id: string;
  description: string;
  price: string;
  sale_price: string;
  sku: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  images: string[];
  fabric: string;
  care: string;
  stock: string;
  status: string;
  is_sample: boolean;
  is_featured: boolean;
}

const EMPTY_FORM: ProductForm = {
  name: "", slug: "", brand_id: "", category_id: "", description: "",
  price: "", sale_price: "", sku: "", sizes: [], colors: [], images: [],
  fabric: "", care: "", stock: "0", status: "active", is_sample: false, is_featured: false,
};

export default function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [newSize, setNewSize] = useState("");
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [newImage, setNewImage] = useState("");
  const [brandList, setBrandList] = useState<Array<{ id: string; name: string }>>([]);
  const [catList, setCatList] = useState<Array<{ id: string; name: string }>>([]);

  const loadOptions = useCallback(async () => {
    // Fetch brands and categories from API
    try {
      const [bRes, cRes] = await Promise.all([
        fetch("/api/products?limit=1"),
        fetch("/api/products?limit=1"),
      ]);
      // We'll use the config lists as fallback and map by slug
      setBrandList(brands.map(b => ({ id: b.slug, name: b.name })));
      setCatList(collections.map(c => ({ id: c.slug, name: c.name })));
    } catch {
      setBrandList(brands.map(b => ({ id: b.slug, name: b.name })));
      setCatList(collections.map(c => ({ id: c.slug, name: c.name })));
    }
  }, []);

  const loadProduct = useCallback(async () => {
    if (isNew) {
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/products/${id}`);
    if (res.ok) {
      const p = await res.json();
      setForm({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand_id: p.brand_slug || "",
        category_id: p.category_slug || "",
        description: p.description,
        price: String(p.price),
        sale_price: p.sale_price ? String(p.sale_price) : "",
        sku: p.sku || "",
        sizes: p.sizes || [],
        colors: p.colors || [],
        images: p.images || [],
        fabric: p.fabric || "",
        care: p.care || "",
        stock: String(p.stock),
        status: p.status,
        is_sample: !!p.is_sample,
        is_featured: !!p.is_featured,
      });
    } else {
      toast.error("Product not found");
      router.replace("/admin/products");
    }
    setLoading(false);
  }, [id, isNew, router]);

  useEffect(() => {
    loadOptions();
    loadProduct();
  }, [loadOptions, loadProduct]);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast.error("Name and price are required");
      return;
    }
    setSaving(true);
    try {
      // Resolve brand/category IDs from slugs
      const brandObj = brands.find(b => b.slug === form.brand_id);
      const catObj = collections.find(c => c.slug === form.category_id);

      const payload = {
        id: form.id,
        name: form.name,
        slug: form.slug || generateSlug(form.name),
        brand_id: brandObj?.slug || null,
        category_id: catObj?.slug || null,
        description: form.description,
        price: Number(form.price),
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        sku: form.sku || null,
        sizes: form.sizes,
        colors: form.colors,
        images: form.images,
        fabric: form.fabric || null,
        care: form.care || null,
        stock: Number(form.stock) || 0,
        status: form.status,
        is_sample: form.is_sample,
        is_featured: form.is_featured,
      };

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(isNew ? "Product created" : "Product updated");
        router.push("/admin/products");
      } else {
        toast.error("Failed to save product");
      }
    } catch {
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

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
          <div>
            <h1 className="font-serif text-2xl font-medium">{isNew ? "Add Product" : "Edit Product"}</h1>
          </div>
        </div>

        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: isNew ? generateSlug(e.target.value) : form.slug })}
                placeholder="e.g. Boys' Cotton Shirt" />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto-generated" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Product description..." rows={3} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                <SelectContent>
                  {brandList.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Collection</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select collection" /></SelectTrigger>
                <SelectContent>
                  {catList.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Price (₹) *</Label>
              <Input type="number" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="599" />
            </div>
            <div className="space-y-2">
              <Label>Sale Price (₹)</Label>
              <Input type="number" value={form.sale_price}
                onChange={(e) => setForm({ ...form, sale_price: e.target.value })} placeholder="Leave empty if no sale" />
            </div>
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input type="number" value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
          </div>

          {/* Sizes */}
          <div className="space-y-2">
            <Label>Sizes</Label>
            <div className="flex flex-wrap gap-2">
              {form.sizes.map(s => (
                <span key={s} className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-sm">
                  {s}
                  <button onClick={() => setForm({ ...form, sizes: form.sizes.filter(x => x !== s) })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newSize} onChange={(e) => setNewSize(e.target.value)}
                placeholder="e.g. 4-5Y" className="w-40"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newSize && !form.sizes.includes(newSize)) {
                      setForm({ ...form, sizes: [...form.sizes, newSize] });
                      setNewSize("");
                    }
                  }
                }} />
              <Button variant="outline" size="sm" onClick={() => {
                if (newSize && !form.sizes.includes(newSize)) {
                  setForm({ ...form, sizes: [...form.sizes, newSize] });
                  setNewSize("");
                }
              }}>
                <Plus className="h-4 w-4" /> Add Size
              </Button>
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <Label>Colors</Label>
            <div className="flex flex-wrap gap-2">
              {form.colors.map(c => (
                <span key={c.name} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-sm">
                  <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: c.hex }} />
                  {c.name}
                  <button onClick={() => setForm({ ...form, colors: form.colors.filter(x => x.name !== c.name) })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newColorName} onChange={(e) => setNewColorName(e.target.value)}
                placeholder="Color name" className="w-32" />
              <input type="color" value={newColorHex}
                onChange={(e) => setNewColorHex(e.target.value)}
                className="h-9 w-10 cursor-pointer rounded border" />
              <Button variant="outline" size="sm" onClick={() => {
                if (newColorName && !form.colors.find(c => c.name === newColorName)) {
                  setForm({ ...form, colors: [...form.colors, { name: newColorName, hex: newColorHex }] });
                  setNewColorName("");
                }
              }}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label>Image URLs</Label>
            <div className="space-y-2">
              {form.images.map((img, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={img} readOnly className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() =>
                    setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) })
                  }>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newImage} onChange={(e) => setNewImage(e.target.value)}
                placeholder="https://example.com/image.jpg" className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => {
                if (newImage && !form.images.includes(newImage)) {
                  setForm({ ...form, images: [...form.images, newImage] });
                  setNewImage("");
                }
              }}>
                <Plus className="h-4 w-4" /> Add Image
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fabric</Label>
              <Input value={form.fabric} onChange={(e) => setForm({ ...form, fabric: e.target.value })}
                placeholder="e.g. 100% Cotton" />
            </div>
            <div className="space-y-2">
              <Label>Care Instructions</Label>
              <Input value={form.care} onChange={(e) => setForm({ ...form, care: e.target.value })}
                placeholder="e.g. Machine wash cold" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
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
                <input type="checkbox" checked={form.is_sample}
                  onChange={(e) => setForm({ ...form, is_sample: e.target.checked })}
                  className="accent-primary" />
                Mark as SAMPLE
              </label>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_featured}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                  className="accent-primary" />
                Featured on homepage
              </label>
            </div>
          </div>

          <div className="flex gap-3 border-t border-border pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> :
                <><Save className="mr-2 h-4 w-4" /> {isNew ? "Create Product" : "Save Changes"}</>}
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
