"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { CategorySearch } from "@/components/category-search";
import { fetchCategories, fetchProducts } from "@/lib/firebase";
import { collectionImages } from "@/lib/config";
import type { Category, Product } from "@/lib/types";
import {
  buildSeedCategories,
  categoryDescendantSlugs,
  childrenOf,
  normaliseCategory,
  topLevelCategories,
} from "@/lib/categories";
import { cn } from "@/lib/utils";

/**
 * "Shop by Category" — Men / Women / Kids, each with the collections beneath
 * it, a live product count and its own search bar.
 */
export function ShopByCategory() {
  const reduceMotion = useReducedMotion();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCategories(), fetchProducts()])
      .then(([categoryList, productList]) => {
        if (cancelled) return;
        // Nothing seeded yet? Show the built-in departments rather than nothing.
        setCategories(
          categoryList.length ? categoryList.map(normaliseCategory) : buildSeedCategories(),
        );
        setProducts(productList.filter((product) => product.status === "active"));
      })
      .catch(() => {
        if (cancelled) return;
        setCategories(buildSeedCategories());
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const departments = useMemo(() => topLevelCategories(categories), [categories]);

  const countFor = useMemo(() => {
    return (slug: string) => {
      const slugs = categoryDescendantSlugs(categories, slug);
      return products.filter(
        (product) => product.category_slug && slugs.includes(product.category_slug),
      ).length;
    };
  }, [categories, products]);

  const defaultDepartment = useMemo(() => {
    const stocked = departments.find((department) => countFor(department.slug) > 0);
    return (
      stocked ??
      departments.find((department) => department.slug === "kids") ??
      departments[0]
    );
  }, [departments, countFor]);

  const active = departments.find((department) => department.slug === activeSlug) ?? defaultDepartment;
  const collections = active ? childrenOf(categories, active.slug) : [];

  if (!ready || !active) {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-9 w-64 animate-pulse rounded bg-muted" />
          <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="aspect-[4/5] animate-pulse rounded-lg bg-muted" />
            <div className="space-y-4">
              <div className="h-12 animate-pulse rounded-full bg-muted" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div data-reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage">Shop by Category</p>
            <h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">Find Their Style</h2>
          </div>
          <Link
            href="/collections"
            className="hidden items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            All categories <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {/* Departments */}
        <div className="mb-8 flex flex-wrap items-center gap-2 border-b border-border pb-3">
          {departments.map((department) => {
            const isActive = department.slug === active.slug;
            return (
              <button
                key={department.slug}
                type="button"
                onClick={() => setActiveSlug(department.slug)}
                aria-pressed={isActive}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  isActive ? "text-sage" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId="shop-category-tab"
                    className="absolute inset-0 rounded-full bg-sage/10"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <span className="relative">{department.name}</span>
              </button>
            );
          })}
          <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
            {countFor(active.slug)} product{countFor(active.slug) === 1 ? "" : "s"} in {active.name}
          </span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.slug}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"
          >
            {/* Department image */}
            <Link
              href={`/products?category=${active.slug}`}
              className="group relative block aspect-[4/5] overflow-hidden rounded-lg bg-muted sm:aspect-[16/10] lg:aspect-[4/5]"
            >
              <Image
                src={active.image || collectionImages[active.slug] || collectionImages.kids}
                alt={active.name}
                fill
                unoptimized={Boolean(active.image?.startsWith("data:"))}
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="font-serif text-3xl font-medium text-white">{active.name}</h3>
                <p className="mt-1 text-sm text-white/80">
                  {countFor(active.slug)} product{countFor(active.slug) === 1 ? "" : "s"}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm text-white/90 transition-colors group-hover:text-white">
                  Explore {active.name}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </div>
            </Link>

            {/* Search + collections inside the department */}
            <div>
              <CategorySearch
                categorySlug={active.slug}
                categoryName={active.name}
                placeholder={`Search ${active.name}…`}
              />

              {collections.length ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {collections.map((collection, index) => {
                    const count = countFor(collection.slug);
                    const thumb =
                      collection.image || collectionImages[collection.slug] || collectionImages.kids;
                    return (
                      <motion.div
                        key={collection.slug}
                        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: reduceMotion ? 0 : index * 0.05 }}
                      >
                        <Link
                          href={`/products?category=${collection.slug}`}
                          className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:border-sage/50 hover:shadow-sm"
                        >
                          <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded bg-muted">
                            <Image
                              src={thumb}
                              alt=""
                              fill
                              unoptimized={thumb.startsWith("data:")}
                              sizes="48px"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{collection.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {count} product{count === 1 ? "" : "s"}
                            </p>
                          </div>
                          <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                  Collections for {active.name} are on their way. Search above, or{" "}
                  <Link href={`/products?category=${active.slug}`} className="font-medium text-sage hover:underline">
                    browse everything in {active.name}
                  </Link>
                  .
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
