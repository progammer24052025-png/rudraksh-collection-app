"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "@/components/store-image";
import { ArrowRight } from "lucide-react";

import { fetchCategories } from "@/lib/firebase";
import { buildSeedCategories, childrenOf, normaliseCategory, topLevelCategories } from "@/lib/categories";
import { collectionImages } from "@/lib/config";
import type { Category } from "@/lib/types";

const FALLBACK_IMAGE = collectionImages.kids;

/**
 * Departments first, collections beneath them. Reads the live category
 * tree once on mount and falls back to the starter set, so the section is
 * never empty and never blocks the first paint.
 */
export function ShopByCategory() {
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((list) => {
        if (cancelled) return;
        setCategories(list.length ? list.map(normaliseCategory) : buildSeedCategories().map(normaliseCategory));
      })
      .catch(() => {
        if (!cancelled) setCategories(buildSeedCategories().map(normaliseCategory));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const departments = useMemo(
    () => (categories ? topLevelCategories(categories) : []),
    [categories],
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div data-reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage">Categories</p>
          <h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">Shop by Category</h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Start with who you are dressing, then narrow down to the occasion.
          </p>
        </div>
        <Link
          href="/collections"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          All collections <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {!categories ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="aspect-[4/5] animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((department) => {
            const children = childrenOf(categories, department.slug);
            const image = department.image || collectionImages[department.slug] || FALLBACK_IMAGE;

            return (
              <div
                key={department.slug}
                className="group overflow-hidden rounded-lg border border-border bg-card"
              >
                <Link
                  href={`/products?category=${department.slug}`}
                  className="relative block aspect-[4/5] overflow-hidden bg-muted"
                >
                  <Image
                    src={image}
                    alt={department.name}
                    fill
                    unoptimized={image.startsWith("data:")}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-serif text-xl font-medium text-white">{department.name}</h3>
                    <span className="mt-1 block text-xs text-white/80">
                      {children.length
                        ? `${children.length} collection${children.length === 1 ? "" : "s"} · Explore →`
                        : "Explore →"}
                    </span>
                  </div>
                </Link>

                {children.length ? (
                  <div className="flex flex-wrap gap-1.5 p-4">
                    {children.slice(0, 6).map((child) => (
                      <Link
                        key={child.slug}
                        href={`/products?category=${child.slug}`}
                        className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-sage hover:text-foreground"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
