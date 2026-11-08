"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Filter, X, Search } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchProducts, type Product } from "@/lib/store-data";
import { brands } from "@/lib/config";
import { fetchBrands, fetchCategories } from "@/lib/firebase";
import type { Brand, Category } from "@/lib/types";
import {
  activeCategories,
  buildSeedCategories,
  categoryMatchesSlug,
  normaliseCategory,
  sortCategories,
  topLevelCategories,
} from "@/lib/categories";
import { PageBreadcrumb } from "@/components/kit/page-breadcrumb";
import { TagSearch } from "@/components/kit/tag-search";
import { PageSpinner } from "@/components/kit/spinner";

const ALL_SIZES = ["0-6M", "6-12M", "12-18M", "18-24M", "2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y"];

function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const brandParam = searchParams.get("brand");
  const searchParam = searchParams.get("search");

  const [selectedBrand, setSelectedBrand] = useState<string | null>(brandParam);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam);
  const [searchQuery, setSearchQuery] = useState(searchParam || "");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 3000]);
  const [sortBy, setSortBy] = useState("newest");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [liveBrands, setLiveBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchProducts().then(r => {
      setProducts(r.products);
      setLoading(false);
    }).catch(() => setLoading(false));

    fetchCategories()
      .then((list) => setCategories(list.length ? list.map(normaliseCategory) : buildSeedCategories()))
      .catch(() => setCategories(buildSeedCategories()));
    fetchBrands().then(setLiveBrands).catch(() => {});
  }, []);

  const categoryTree = useMemo(
    () => (categories.length ? categories : buildSeedCategories()),
    [categories],
  );

  // Database first; the built-in list keeps the shop usable before seeding.
  const brandOptions = useMemo(
    () =>
      liveBrands.length
        ? liveBrands.map((brand) => ({ slug: brand.slug, name: brand.name }))
        : brands.map((brand) => ({ slug: brand.slug, name: brand.name })),
    [liveBrands],
  );

  const categoryOptions = useMemo(() => {
    const tree = activeCategories(categoryTree);
    const roots = topLevelCategories(categoryTree);
    const rootSlugs = new Set(roots.map((category) => category.slug));
    return [...roots, ...sortCategories(tree).filter((category) => !rootSlugs.has(category.slug))];
  }, [categoryTree]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (selectedBrand)
      filtered = filtered.filter(p => p.brand_slug === selectedBrand || p.brand_id === selectedBrand);
    if (selectedCategory)
      filtered = filtered.filter(
        p =>
          categoryMatchesSlug(categoryTree, p.category_slug, selectedCategory) ||
          categoryMatchesSlug(categoryTree, p.category_id, selectedCategory),
      );
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.brand_name || "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    }
    if (selectedTags.length > 0) {
      filtered = filtered.filter(p => {
        const haystack = [p.name, p.brand_name, p.category_name, p.description, ...(p.tags ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return selectedTags.every(tag => haystack.includes(tag.toLowerCase()));
      });
    }
    if (selectedSizes.length > 0) {
      filtered = filtered.filter(p => (p.sizes ?? []).some(s => selectedSizes.includes(s)));
    }
    filtered = filtered.filter(p => {
      const price = p.sale_price ?? p.price;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => (a.sale_price ?? a.price) - (b.sale_price ?? b.price));
        break;
      case "price-high":
        filtered.sort((a, b) => (b.sale_price ?? b.price) - (a.sale_price ?? a.price));
        break;
      case "newest":
      default:
        filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return filtered;
  }, [products, selectedBrand, selectedCategory, categoryTree, searchQuery, selectedSizes, selectedTags, priceRange, sortBy]);

  // Our own vocabulary, built from what is actually in the catalogue.
  const tagSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    const bump = (raw?: string | null) => {
      const tag = (raw ?? "").trim();
      if (tag.length < 3) return;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    };
    products.forEach(product => {
      bump(product.brand_name);
      bump(product.category_name);
      (product.tags ?? []).forEach(bump);
    });
    // Categories are always offered, even before a product uses them.
    categoryOptions.forEach(category => counts.set(category.name, (counts.get(category.name) ?? 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 24)
      .map(([tag]) => tag);
  }, [products, categoryOptions]);

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  };

  const clearFilters = () => {
    setSelectedBrand(null);
    setSelectedCategory(null);
    setSearchQuery("");
    setSelectedSizes([]);
    setSelectedTags([]);
    setPriceRange([0, 3000]);
  };

  const FilterPanel = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider">Search</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider">Brand</h3>
        <div className="space-y-1">
          <button
            onClick={() => setSelectedBrand(null)}
            className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
              !selectedBrand ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >All Brands</button>
          {brandOptions.map(b => (
            <button
              key={b.slug}
              onClick={() => setSelectedBrand(b.slug)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedBrand === b.slug ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >{b.name}</button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider">Category</h3>
        <div className="space-y-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
              !selectedCategory ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >All Categories</button>
          {categoryOptions.map(c => (
            <button
              key={c.slug}
              onClick={() => setSelectedCategory(c.slug)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedCategory === c.slug ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >{c.name}</button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider">Size</h3>
        <div className="flex flex-wrap gap-1.5">
          {ALL_SIZES.map(size => (
            <button
              key={size}
              onClick={() => toggleSize(size)}
              className={`rounded border px-2.5 py-1.5 text-xs transition-colors ${
                selectedSizes.includes(size)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary"
              }`}
            >{size}</button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider">Price</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={priceRange[0]}
            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
            className="h-9"
            placeholder="Min"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="number"
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
            className="h-9"
            placeholder="Max"
          />
        </div>
      </div>

      <Button variant="outline" onClick={clearFilters} className="w-full">Clear Filters</Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        items={[
          { label: "Shop", href: "/products" },
          ...(selectedBrand
            ? [{ label: brandOptions.find(b => b.slug === selectedBrand)?.name ?? selectedBrand }]
            : selectedCategory
            ? [{ label: categoryOptions.find(c => c.slug === selectedCategory)?.name ?? selectedCategory }]
            : []),
        ]}
        className="-mt-2"
      />
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">
          {selectedBrand
            ? brandOptions.find(b => b.slug === selectedBrand)?.name
            : selectedCategory
            ? categoryOptions.find(c => c.slug === selectedCategory)?.name
            : searchQuery
            ? `Search: "${searchQuery}"`
            : "All Products"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "Loading..." : `${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""} found`}
        </p>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <FilterPanel />
        </aside>

        <div className="flex-1">
          {tagSuggestions.length > 0 ? (
            <TagSearch
              value={selectedTags}
              onChange={setSelectedTags}
              suggestions={tagSuggestions}
              label="Filter by"
              placeholder="Filter by brand or collection…"
              max={6}
              className="mb-4"
            />
          ) : null}

          <div className="mb-6 flex items-center justify-between gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 lg:hidden">
                  <Filter className="h-4 w-4" /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterPanel />
                </div>
              </SheetContent>
            </Sheet>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] rounded-lg bg-muted" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product, idx) => (
                <ProductCard key={product.id} product={product} index={idx} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-medium">No products found</p>
              <p className="mt-2 text-muted-foreground">Try adjusting your filters</p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">Clear Filters</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <>
      <div className="min-h-screen">
        <Header />
        <main>
          <Suspense fallback={<PageSpinner label="Loading the shop" />}>
            <ProductsContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </>
  );
}
