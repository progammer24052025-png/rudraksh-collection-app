"use client";

import { Suspense, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Filter, X, ChevronDown } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CartProvider } from "@/lib/cart-context";
import { products, categories, subCategories } from "@/lib/store-data";

function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const subParam = searchParams.get("sub");
  const filterParam = searchParams.get("filter");

  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 6000]);
  const [sortBy, setSortBy] = useState("popular");

  const allSizes = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (subParam) {
      filtered = filtered.filter((p) => p.subCategory === subParam);
    }

    if (filterParam === "trending") {
      filtered = filtered.filter((p) => p.isTrending);
    } else if (filterParam === "budget") {
      filtered = filtered.filter((p) => p.isBudgetPick);
    } else if (filterParam === "new") {
      filtered = filtered.filter((p) => p.isNew);
    }

    if (selectedSizes.length > 0) {
      filtered = filtered.filter((p) => p.sizes.some((s) => selectedSizes.includes(s)));
    }

    filtered = filtered.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "new":
        filtered.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      case "popular":
      default:
        filtered.sort((a, b) => b.reviews - a.reviews);
    }

    return filtered;
  }, [selectedCategory, subParam, filterParam, selectedSizes, priceRange, sortBy]);

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedSizes([]);
    setPriceRange([0, 6000]);
  };

  const FilterSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 font-semibold">Categories</h3>
        <div className="space-y-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              !selectedCategory ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <div key={cat.id}>
              <button
                onClick={() => setSelectedCategory(cat.id)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {cat.name}
              </button>
              {selectedCategory === cat.id && (
                <div className="ml-3 mt-1 space-y-1">
                  {subCategories
                    .filter((sub) => sub.parentId === cat.id)
                    .map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/products?category=${cat.id}&sub=${sub.id}`}
                        className={`block rounded px-3 py-1 text-sm ${
                          subParam === sub.id ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {sub.name}
                      </Link>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold">Price Range</h3>
        <Slider
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number, number])}
          max={6000}
          step={100}
          className="mb-2"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>₹{priceRange[0]}</span>
          <span>₹{priceRange[1]}</span>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold">Size</h3>
        <div className="flex flex-wrap gap-2">
          {allSizes.map((size) => (
            <button
              key={size}
              onClick={() => toggleSize(size)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                selectedSizes.includes(size)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <Button variant="outline" onClick={clearFilters} className="w-full">
        Clear Filters
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold sm:text-3xl">
            {selectedCategory
              ? categories.find((c) => c.id === selectedCategory)?.name
              : filterParam === "trending"
              ? "Trending Products"
              : filterParam === "budget"
              ? "Budget Picks"
              : "All Products"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredProducts.length} products found
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 lg:hidden">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterSidebar />
              </div>
            </SheetContent>
          </Sheet>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="new">Newest</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <FilterSidebar />
        </aside>

        <div className="flex-1">
          {filteredProducts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product, idx) => (
                <ProductCard key={product.id} product={product} index={idx} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-medium">No products found</p>
              <p className="mt-2 text-muted-foreground">Try adjusting your filters</p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <main>
          <Suspense fallback={<div className="flex h-96 items-center justify-center">Loading...</div>}>
            <ProductsContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
