"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "@/components/store-image";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Search,
  Upload,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Loader2,
  Package,
} from "lucide-react";
import { toast } from "sonner";

import { AdminNav } from "@/components/admin-nav";
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
  deleteCategory,
  saveCategory,
  subscribeCategories,
  subscribeProducts,
} from "@/lib/firebase";
import { collectionImages } from "@/lib/config";
import { buildSeedCategories, parentSlugsOf, sortCategories, topLevelCategories } from "@/lib/categories";
import type { Category, Product } from "@/lib/types";

type CategoryDraft = {
  id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  status: "active" | "hidden";
  sort_order: number;
  /** Departments this collection hangs under; empty means it is a department. */
  parent_slugs: string[];
};

const EMPTY_DRAFT: CategoryDraft = {
  id: "",
  name: "",
  slug: "",
  image: "",
  description: "",
  status: "active",
  sort_order: 0,
  parent_slugs: [],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminCollectionsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CategoryDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const offCats = subscribeCategories((list) => {
      setCategories(list);
      setLoading(false);
    });
    const offProducts = subscribeProducts(setProducts);
    return () => {
      offCats();
      offProducts();
    };
  }, []);

  const productCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      if (p.category_slug) counts[p.category_slug] = (counts[p.category_slug] || 0) + 1;
      if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1;
    }
    return counts;
  }, [products]);

  // Departments first, then everything nested beneath them.
  const orderedCategories = useMemo(() => {
    const departments = topLevelCategories(categories);
    const departmentSlugs = new Set(departments.map((category) => category.slug));
    return [...departments, ...sortCategories(categories).filter((category) => !departmentSlugs.has(category.slug))];
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orderedCategories;
    return orderedCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q),
    );
  }, [orderedCategories, search]);

  const openNew = () => {
    setDraft({
      ...EMPTY_DRAFT,
      sort_order: categories.length,
    });
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setDraft({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      image: cat.image || "",
      description: cat.description || "",
      status: cat.status,
      sort_order: cat.sort_order ?? 0,
      parent_slugs: parentSlugsOf(cat),
    });
    setDialogOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image file is too large (max 3MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setDraft((prev) => ({ ...prev, image: result }));
        toast.success("Cover image file loaded");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    setSaving(true);
    try {
      const slug = (draft.slug.trim() || slugify(draft.name)).toLowerCase();
      await saveCategory({
        id: draft.id || slug,
        name: draft.name.trim(),
        slug,
        image: draft.image.trim() || null,
        description: draft.description.trim() || null,
        status: draft.status,
        sort_order: Number(draft.sort_order) || 0,
        parent_slugs: draft.parent_slugs,
      });

      toast.success(draft.id ? "Collection updated" : "Collection created");
      setDialogOpen(false);
      setDraft(EMPTY_DRAFT);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save collection");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory(deleteTarget.id);
      toast.success(`Deleted collection "${deleteTarget.name}"`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete collection");
    }
  };

  const toggleStatus = async (cat: Category) => {
    const nextStatus = cat.status === "active" ? "hidden" : "active";
    try {
      await saveCategory({
        ...cat,
        status: nextStatus,
      });
      toast.success(`Collection marked as ${nextStatus}`);
    } catch (error) {
      toast.error("Could not update collection status");
    }
  };

  /**
   * Merges the starter set in rather than replacing anything: missing
   * departments and collections are created, and collections that already
   * exist loose at the top level get nested under their department. Anything
   * with parents already set is left exactly as it is.
   */
  const seedDefaults = async () => {
    setSeeding(true);
    try {
      const existing = new Map(categories.map((category) => [category.slug, category]));
      let created = 0;
      let nested = 0;
      for (const seed of buildSeedCategories()) {
        const current = existing.get(seed.slug);
        if (!current) {
          await saveCategory({
            ...seed,
            image: collectionImages[seed.slug] || null,
          });
          created += 1;
          continue;
        }
        if (!parentSlugsOf(current).length && (seed.parent_slugs ?? []).length) {
          await saveCategory({ ...current, parent_slugs: seed.parent_slugs });
          nested += 1;
        }
      }
      toast.success(
        created || nested
          ? `Added ${created} collection${created === 1 ? "" : "s"}${
              nested ? `, nested ${nested} under their departments` : ""
            }`
          : "Every starter collection already exists",
      );
    } catch (error) {
      toast.error("Failed to seed collections");
    } finally {
      setSeeding(false);
    }
  };

  const activeCount = categories.filter((c) => c.status === "active").length;

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Layers className="h-5 w-5" />
              </span>
              <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                Collection Management
              </h1>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Manage store categories, promotional cover photos, display order, and storefront visibility.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={seedDefaults}
              disabled={seeding || loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${seeding ? "animate-spin" : ""}`} />
              {categories.length === 0 ? "Create starter collections" : "Add missing starters"}
            </Button>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Add Collection
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Collections</p>
            <p className="mt-2 text-2xl font-bold">{categories.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Active in Store</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Catalog Products Linked</p>
            <p className="mt-2 text-2xl font-bold">{products.length}</p>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by collection name, slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {filteredCategories.length} of {categories.length} collection{categories.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Collection Grid */}
        {loading ? (
          <div className="mt-12 flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center bg-card">
            <Layers className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-serif text-lg font-medium">No collections found</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              {search
                ? "No collections match your search query."
                : "No collections yet. Create the starter set — Men, Women and Kids with the six collections nested beneath."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={seedDefaults} disabled={seeding}>
                Create starter collections
              </Button>
              <Button onClick={openNew}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Collection
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map((cat) => {
              const productCount =
                productCountByCategory[cat.slug] || productCountByCategory[cat.id] || 0;
              const isHidden = cat.status === "hidden";
              const coverSrc = cat.image || collectionImages[cat.slug] || collectionImages["boys-wear"];

              return (
                <div
                  key={cat.id}
                  className={`group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg ${
                    isHidden ? "opacity-60 border-dashed" : "border-border hover:border-primary/50"
                  }`}
                >
                  {/* Card Visual Header */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                    {coverSrc ? (
                      <Image
                        src={coverSrc}
                        alt={cat.name}
                        fill
                        unoptimized={coverSrc.startsWith("data:")}
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <Layers className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Quick Action Buttons in Top Right */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-black/40 backdrop-blur-md p-1 border border-white/10">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleStatus(cat)}
                        title={isHidden ? "Make Active" : "Hide from store"}
                        className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
                      >
                        {isHidden ? <EyeOff className="h-3.5 w-3.5 text-amber-300" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(cat)}
                        title="Edit Collection"
                        className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(cat)}
                        title="Delete Collection"
                        className="h-7 w-7 text-white/80 hover:text-rose-400 hover:bg-rose-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Bottom Title on Image */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-xl font-bold leading-tight">
                          {cat.name}
                        </h3>
                        {isHidden && (
                          <span className="rounded bg-amber-500/80 backdrop-blur px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/70 font-mono">
                        /products?category={cat.slug}
                      </p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4">
                    {cat.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {cat.description}
                      </p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground/60">
                        No description provided
                      </p>
                    )}

                    {parentSlugsOf(cat).length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {parentSlugsOf(cat).map((slug) => (
                          <span
                            key={slug}
                            className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-foreground/70"
                          >
                            {categories.find((category) => category.slug === slug)?.name ?? slug}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Department
                      </span>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <Package className="h-3.5 w-3.5" />
                        {productCount} product{productCount === 1 ? "" : "s"}
                      </span>
                      <span className="font-mono text-[11px]">
                        Sort: {cat.sort_order ?? 0}
                      </span>
                      <Link
                        href={`/products?category=${cat.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        Store link <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
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
              {draft.id ? "Edit Collection" : "Add New Collection"}
            </DialogTitle>
            <DialogDescription>
              Set the collection title, cover photo, description, and sort order.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {/* Live Preview Card */}
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <Label className="text-xs text-muted-foreground block mb-2">
                Card Preview (Store Appearance)
              </Label>
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-card">
                {draft.image ? (
                  <Image
                    src={draft.image}
                    alt={draft.name || "Preview"}
                    fill
                    unoptimized={draft.image.startsWith("data:")}
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-xs">
                    No cover image selected
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h4 className="font-serif text-lg font-bold">
                    {draft.name || "Collection Title"}
                  </h4>
                  <span className="text-[11px] text-white/80">Explore Collection →</span>
                </div>
              </div>
            </div>

            {/* Name & Slug */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Collection Name *</Label>
                <Input
                  id="cat-name"
                  placeholder="e.g. Occasion Wear"
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
                <Label htmlFor="cat-slug">URL Slug *</Label>
                <Input
                  id="cat-slug"
                  placeholder="e.g. occasion-wear"
                  value={draft.slug}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, slug: slugify(e.target.value) }))
                  }
                  required
                />
              </div>
            </div>

            {/* Cover Image URL & File Upload */}
            <div className="space-y-2">
              <Label htmlFor="cat-image">Cover Image (URL or Upload)</Label>
              <div className="flex gap-2">
                <Input
                  id="cat-image"
                  placeholder="https://images.unsplash.com/... or upload"
                  value={draft.image.startsWith("data:") ? "Image loaded from computer" : draft.image}
                  onChange={(e) => setDraft((prev) => ({ ...prev, image: e.target.value }))}
                  className="font-mono text-xs"
                />
                {draft.image && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDraft((prev) => ({ ...prev, image: "" }))}
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
                  JPG, PNG, or WebP (portrait / landscape, max 3MB)
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                placeholder="e.g. Special festive and party outfits made for weddings and celebrations."
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Departments */}
            <div className="space-y-2 border-t border-border pt-3">
              <Label>Show under</Label>
              <div className="flex flex-wrap gap-1.5">
                {topLevelCategories(categories)
                  .filter((department) => department.id !== draft.id && department.slug !== draft.slug)
                  .map((department) => {
                    const selected = draft.parent_slugs.includes(department.slug);
                    return (
                      <button
                        key={department.slug}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            parent_slugs: prev.parent_slugs.includes(department.slug)
                              ? prev.parent_slugs.filter((value) => value !== department.slug)
                              : [...prev.parent_slugs, department.slug],
                          }))
                        }
                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {department.name}
                      </button>
                    );
                  })}
                {topLevelCategories(categories).length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    No departments yet — press &ldquo;Add starter collections&rdquo; to create Men, Women and Kids.
                  </p>
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pick every department this collection belongs to. Leave empty and it becomes a
                top-level department itself.
              </p>
            </div>

            {/* Sort Order & Status */}
            <div className="grid grid-cols-2 gap-4 items-center border-t border-border pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="cat-sort">Display Sort Order</Label>
                <Input
                  id="cat-sort"
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))
                  }
                />
                <span className="text-[10px] text-muted-foreground">
                  Lower numbers appear first on homepage
                </span>
              </div>

              <div className="flex items-center justify-between space-x-2 pt-4">
                <Label htmlFor="cat-status" className="cursor-pointer">
                  Active in Store
                </Label>
                <Switch
                  id="cat-status"
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
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {draft.id ? "Save Changes" : "Create Collection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Collection?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete collection{" "}
              <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>? Products linked to this collection will remain in your catalog but will no longer have this category.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

