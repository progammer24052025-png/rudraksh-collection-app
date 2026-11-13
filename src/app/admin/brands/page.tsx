"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Search,
  Upload,
  Image as ImageIcon,
  Check,
  Eye,
  EyeOff,
  Layers,
  ArrowUpDown,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AdminNav } from "@/components/admin-nav";
import { BrandLogoBadge } from "@/components/brand-logo-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteBrand,
  saveBrand,
  subscribeBrands,
  subscribeCategories,
  subscribeProducts,
} from "@/lib/firebase";
import { activeCategories, detectBrandCategories, sortCategories } from "@/lib/categories";
import { brands as defaultBrands } from "@/lib/config";
import type { Brand, Category, Product } from "@/lib/types";

import { Spinner } from "@/components/ui/spinner";
import { SealLoader } from "@/components/kit/brand-mark";
type BrandDraft = {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  status: "active" | "hidden";
  sort_order: number;
  category_names: string[];
};

const EMPTY_DRAFT: BrandDraft = {
  id: "",
  name: "",
  slug: "",
  logo: "",
  description: "",
  status: "active",
  sort_order: 0,
  category_names: [],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<BrandDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [source, setSource] = useState<Brand["category_source"]>(null);

  useEffect(() => {
    const offBrands = subscribeBrands((list) => {
      setBrands(list);
      setLoading(false);
    });
    const offProducts = subscribeProducts(setProducts);
    const offCategories = subscribeCategories(setCategories);
    return () => {
      offBrands();
      offProducts();
      offCategories();
    };
  }, []);

  // Compute products count per brand
  const productCountByBrand = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      if (p.brand_slug) counts[p.brand_slug] = (counts[p.brand_slug] || 0) + 1;
      if (p.brand_id) counts[p.brand_id] = (counts[p.brand_id] || 0) + 1;
    }
    return counts;
  }, [products]);

  const filteredBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        (b.description || "").toLowerCase().includes(q),
    );
  }, [brands, search]);

  const openNew = () => {
    setDraft({
      ...EMPTY_DRAFT,
      sort_order: brands.length,
    });
    setSource(null);
    setDialogOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setDraft({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo || "",
      description: brand.description || "",
      status: brand.status,
      sort_order: brand.sort_order ?? 0,
      category_names: brand.category_names ?? [],
    });
    setSource(brand.category_source ?? (brand.category_slugs?.length ? "manual" : null));
    setDialogOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, SVG, WebP)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file is too large (max 2MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setDraft((prev) => ({ ...prev, logo: result }));
        toast.success("Logo file loaded");
      }
    };
    reader.readAsDataURL(file);
  };

  const categoryOptions = useMemo(
    () => sortCategories(activeCategories(categories)),
    [categories],
  );

  // Products already filed under this brand are the strongest signal of all.
  const productCategorySlugs = useMemo(() => {
    const slug = draft.slug || draft.id;
    if (!slug) return [];
    return products
      .filter((product) => product.brand_slug === slug || product.brand_id === slug)
      .map((product) => product.category_slug || product.category_id)
      .filter((value): value is string => Boolean(value));
  }, [products, draft.slug, draft.id]);

  const suggestions = useMemo(
    () =>
      detectBrandCategories(
        { name: draft.name, description: draft.description, productCategorySlugs },
        categories,
      ),
    [draft.name, draft.description, productCategorySlugs, categories],
  );

  const toggleCategory = (name: string) => {
    setDraft((prev) => ({
      ...prev,
      category_names: prev.category_names.includes(name)
        ? prev.category_names.filter((value) => value !== name)
        : [...prev.category_names, name],
    }));
    setSource("manual");
  };

  const applySuggestions = () => {
    if (!suggestions.length) {
      toast.info("Nothing in the bio points at a category yet");
      return;
    }
    setDraft((prev) => ({
      ...prev,
      category_names: [...new Set([...prev.category_names, ...suggestions.map((item) => item.name)])],
    }));
    setSource("manual");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      toast.error("Brand name is required");
      return;
    }

    setSaving(true);
    try {
      const slug = (draft.slug.trim() || slugify(draft.name)).toLowerCase();
      const chosen = draft.category_names
        .map((label) => categories.find((category) => category.name === label))
        .filter((category): category is Category => Boolean(category));
      // Nothing picked by hand: fall back to what the bio points at.
      const auto = chosen.length
        ? []
        : suggestions
            .map((suggestion) => categories.find((category) => category.slug === suggestion.slug))
            .filter((category): category is Category => Boolean(category));
      const resolved = chosen.length ? chosen : auto;
      const resolvedSource: Brand["category_source"] = chosen.length
        ? source ?? "manual"
        : resolved.length
          ? "auto"
          : null;
      const previous = brands.find((brand) => brand.id === draft.id);
      const now = new Date().toISOString();

      await saveBrand({
        id: draft.id || slug,
        name: draft.name.trim(),
        slug,
        logo: draft.logo.trim() || null,
        description: draft.description.trim() || null,
        status: draft.status,
        sort_order: Number(draft.sort_order) || 0,
        category_slugs: resolved.map((category) => category.slug),
        category_names: resolved.map((category) => category.name),
        category_source: resolvedSource,
        category_updated_at: resolved.length ? now : previous?.category_updated_at,
      });

      toast.success(draft.id ? "Brand updated" : "Brand created");
      setDialogOpen(false);
      setDraft(EMPTY_DRAFT);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save brand");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      // Removing a brand removes its products with it, so the catalogue can
      // never point at a partner that no longer exists.
      const { deletedProducts } = await deleteBrand(deleteTarget.id);
      toast.success(
        deletedProducts
          ? `Deleted brand "${deleteTarget.name}" and ${deletedProducts} product${deletedProducts === 1 ? "" : "s"}`
          : `Deleted brand "${deleteTarget.name}"`,
      );
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete brand");
    }
  };

  const toggleStatus = async (brand: Brand) => {
    const nextStatus = brand.status === "active" ? "hidden" : "active";
    try {
      await saveBrand({
        ...brand,
        status: nextStatus,
      });
      toast.success(`Brand marked as ${nextStatus}`);
    } catch (error) {
      toast.error("Could not update brand status");
    }
  };

  const seedDefaults = async () => {
    setSeeding(true);
    try {
      for (let i = 0; i < defaultBrands.length; i++) {
        const item = defaultBrands[i];
        await saveBrand({
          id: item.slug,
          name: item.name,
          slug: item.slug,
          logo: null,
          description: null,
          status: "active",
          sort_order: i,
        });
      }
      toast.success(`Successfully populated ${defaultBrands.length} brands`);
    } catch (error) {
      toast.error("Failed to seed brands");
    } finally {
      setSeeding(false);
    }
  };

  const activeCount = brands.filter((b) => b.status === "active").length;
  const withLogoCount = brands.filter((b) => Boolean(b.logo)).length;

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                Brand Management
              </h1>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Add and manage brand partners, official logos, display order, and visibility across the store.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {brands.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={seedDefaults}
                disabled={seeding}
                className="gap-1.5"
              >
                <RefreshCw className={`h-4 w-4 ${seeding ? "animate-spin" : ""}`} />
                Restore Default Brands
              </Button>
            )}
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Add Brand
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Brands</p>
            <p className="mt-2 text-2xl font-bold">{brands.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Active in Store</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Custom Logos</p>
            <p className="mt-2 text-2xl font-bold text-primary">{withLogoCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Products Linked</p>
            <p className="mt-2 text-2xl font-bold">{products.length}</p>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by brand name, slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {filteredBrands.length} of {brands.length} brand{brands.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Brand Grid / List */}
        {loading ? (
          <div className="mt-12 flex items-center justify-center py-16">
            <SealLoader size={56} showLabel={false} />
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center bg-card">
            <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-serif text-lg font-medium">No brands found</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              {search
                ? "No brands match your search query."
                : "You have not added any brands yet. Get started by adding a brand or restoring default partners."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              {brands.length === 0 && (
                <Button variant="outline" onClick={seedDefaults} disabled={seeding}>
                  Restore 12 Curated Brands
                </Button>
              )}
              <Button onClick={openNew}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Brand
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBrands.map((brand) => {
              const productCount =
                productCountByBrand[brand.slug] || productCountByBrand[brand.id] || 0;
              const isHidden = brand.status === "hidden";

              return (
                <div
                  key={brand.id}
                  className={`group relative flex flex-col justify-between rounded-xl border bg-card p-5 transition-all hover:shadow-md ${
                    isHidden ? "opacity-60 border-dashed" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      {/* Circular Emblem Preview: enlarged, clean single border, spacious */}
                      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white p-1.5 shadow-sm transition-transform duration-300 group-hover:scale-105 overflow-hidden">
                        <BrandLogoBadge
                          slug={brand.slug}
                          name={brand.name}
                          logo={brand.logo}
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleStatus(brand)}
                          title={isHidden ? "Make Active" : "Hide from store"}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          {isHidden ? <EyeOff className="h-4 w-4 text-amber-600" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(brand)}
                          title="Edit Brand"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(brand)}
                          title="Delete Brand"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Brand Info */}
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg font-semibold leading-tight">
                          {brand.name}
                        </h3>
                        {isHidden && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            Hidden
                          </span>
                        )}
                        {brand.logo && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            Logo
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                        /brands/{brand.slug}
                      </p>
                      {brand.description ? (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {brand.description}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs italic text-muted-foreground/60">
                          No description provided
                        </p>
                      )}
                      {(brand.category_names ?? []).length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(brand.category_names ?? []).slice(0, 4).map((name) => (
                            <span
                              key={name}
                              className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-foreground/70"
                            >
                              {name}
                            </span>
                          ))}
                          {brand.category_source === "auto" ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                              auto
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Footer Meta */}
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {productCount} product{productCount === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      Order: {brand.sort_order ?? 0}
                    </span>
                    <Link
                      href={`/brands/${brand.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      Store page <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {draft.id ? "Edit Brand" : "Add New Brand"}
            </DialogTitle>
            <DialogDescription>
              Configure the brand details, official logo emblem, and storefront visibility.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {/* Live Preview Box */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
              <Label className="text-xs text-muted-foreground block mb-2">
                Live Emblem Preview (Circular)
              </Label>
              <div className="flex items-center justify-center">
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-border/70 bg-white p-2 shadow-sm overflow-hidden">
                  <BrandLogoBadge
                    slug={draft.slug || slugify(draft.name) || "sample"}
                    name={draft.name || "Brand Name"}
                    logo={draft.logo || null}
                  />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {draft.logo
                  ? "Showing uploaded / linked logo inside the circular emblem."
                  : "Showing custom monogram & accent styling (auto-used when no image is uploaded)."}
              </p>
            </div>

            {/* Name & Slug */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="brand-name">Brand Name *</Label>
                <Input
                  id="brand-name"
                  placeholder="e.g. James & Harper"
                  value={draft.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setDraft((prev) => ({
                      ...prev,
                      name,
                      slug: prev.id ? prev.slug : slugify(name),
                    }));
                  }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brand-slug">URL Slug *</Label>
                <Input
                  id="brand-slug"
                  placeholder="e.g. james-harper"
                  value={draft.slug}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, slug: slugify(e.target.value) }))
                  }
                  required
                />
              </div>
            </div>

            {/* Brand Logo URL & Device Upload */}
            <div className="space-y-2">
              <Label htmlFor="brand-logo">Brand Logo (Image URL or Upload)</Label>
              <div className="flex gap-2">
                <Input
                  id="brand-logo"
                  placeholder="https://... or upload below"
                  value={draft.logo.startsWith("data:") ? "Image loaded from computer" : draft.logo}
                  onChange={(e) => setDraft((prev) => ({ ...prev, logo: e.target.value }))}
                  className="font-mono text-xs"
                />
                {draft.logo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDraft((prev) => ({ ...prev, logo: "" }))}
                  >
                    Clear
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                  <Upload className="h-3.5 w-3.5" /> Upload Image File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-muted-foreground">
                  PNG, SVG, or JPG (max 2MB, transparent works best)
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="brand-desc">Short Description / Bio</Label>
              <Textarea
                id="brand-desc"
                placeholder="e.g. Casual denim, cotton staples and playful everyday outfits for kids."
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Categories */}
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Categories this brand sells</Label>
                {suggestions.length ? (
                  <button
                    type="button"
                    onClick={applySuggestions}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Apply {suggestions.length} detected
                  </button>
                ) : null}
              </div>

              {draft.category_names.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {draft.category_names.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleCategory(name)}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      {name} <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Nothing chosen yet — the bio fills these in when you save, or pick them below.
                </p>
              )}

              {suggestions.length ? (
                <ul className="space-y-1 rounded-lg bg-muted/40 p-2">
                  <li className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                    <Sparkles className="h-3 w-3" aria-hidden /> Detected from the bio
                  </li>
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.slug} className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{suggestion.name}</span> —{" "}
                      {suggestion.reasons.join(", ")}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {categoryOptions.length ? (
                  categoryOptions.map((category) => {
                    const selected = draft.category_names.includes(category.name);
                    return (
                      <button
                        key={category.slug}
                        type="button"
                        onClick={() => toggleCategory(category.name)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {category.name}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    No categories exist yet — create them in Catalog → Collections.
                  </p>
                )}
              </div>

              {source === "auto" ? (
                <p className="text-[11px] text-muted-foreground">
                  Currently filled automatically from the bio. Pick any category to take over.
                </p>
              ) : null}
            </div>

            {/* Sort Order & Status */}
            <div className="grid grid-cols-2 gap-4 items-center border-t border-border pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="brand-sort">Display Sort Order</Label>
                <Input
                  id="brand-sort"
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))
                  }
                />
                <span className="text-[10px] text-muted-foreground">
                  Lower numbers appear first in the carousel
                </span>
              </div>

              <div className="flex items-center justify-between space-x-2 pt-4">
                <Label htmlFor="brand-status" className="cursor-pointer">
                  Active in Store
                </Label>
                <Switch
                  id="brand-status"
                  checked={draft.status === "active"}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({ ...prev, status: checked ? "active" : "hidden" }))
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner className="mr-1.5 h-4 w-4" />}
                {draft.id ? "Save Changes" : "Create Brand"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Brand?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete brand{" "}
              <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>?{" "}
              {(() => {
                const count =
                  productCountByBrand[deleteTarget?.slug ?? ""] ??
                  productCountByBrand[deleteTarget?.id ?? ""] ??
                  0;
                return count ? (
                  <>
                    Its <strong>{count} product{count === 1 ? "" : "s"}</strong> will be deleted too — a
                    product is not kept without its brand. This cannot be undone.
                  </>
                ) : (
                  <>It has no products filed under it.</>
                );
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

