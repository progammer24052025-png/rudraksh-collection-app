"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "@/components/store-image";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { collectionImages } from "@/lib/config";
import { motion } from "framer-motion";
import { fetchCategories, fetchProducts } from "@/lib/firebase";
import type { Category, Product } from "@/lib/types";
import {
  buildSeedCategories,
  categoryDescendantSlugs,
  childrenOf,
  normaliseCategory,
  topLevelCategories,
} from "@/lib/categories";

export default function CollectionsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCategories(), fetchProducts()])
      .then(([list, productList]) => {
        if (cancelled) return;
        setCategories(list.length ? list.map(normaliseCategory) : buildSeedCategories());
        setProducts(productList.filter((product) => product.status === "active"));
      })
      .catch(() => {
        if (!cancelled) setCategories(buildSeedCategories());
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const departments = useMemo(() => topLevelCategories(categories), [categories]);

  const countFor = useMemo(
    () => (slug: string) => {
      const slugs = categoryDescendantSlugs(categories, slug);
      return products.filter((product) => product.category_slug && slugs.includes(product.category_slug))
        .length;
    },
    [categories, products],
  );

  return (
    <>
      <div className="min-h-screen">
        <Header />
        <main id="main" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage-ink">Categories</p>
            <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">Shop by Category</h1>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Start with Men, Women or Kids, then narrow down to the collection that fits the
              occasion.
            </p>
          </div>

          {!ready ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="aspect-[4/5] animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            departments.map((department, idx) => {
              const collections = childrenOf(categories, department.slug);
              return (
                <motion.section
                  key={department.slug}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.06, duration: 0.4 }}
                  className="mb-14"
                >
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="font-serif text-2xl font-medium">{department.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {countFor(department.slug)} product
                        {countFor(department.slug) === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Link
                      href={`/products?category=${department.slug}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Shop all {department.name} →
                    </Link>
                  </div>

                  {collections.length ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {collections.map((collection) => {
                        const thumb =
                          collection.image ||
                          collectionImages[collection.slug] ||
                          collectionImages.kids;
                        const count = countFor(collection.slug);
                        return (
                          <Link
                            key={collection.slug}
                            href={`/products?category=${collection.slug}`}
                            className="group relative block aspect-[4/5] overflow-hidden rounded-lg bg-muted"
                          >
                            <Image
                              src={thumb}
                              alt={collection.name}
                              fill
                              unoptimized={thumb.startsWith("data:")}
                              className="object-cover transition-transform duration-700 group-hover:scale-105"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-5">
                              <h3 className="font-serif text-xl font-medium text-white">
                                {collection.name}
                              </h3>
                              <span className="mt-1 block text-xs text-white/80">
                                {count} product{count === 1 ? "" : "s"} · Explore →
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                      No collections under {department.name} yet.{" "}
                      <Link
                        href={`/products?category=${department.slug}`}
                        className="font-medium text-sage-ink hover:underline"
                      >
                        Browse everything in {department.name}
                      </Link>
                      .
                    </div>
                  )}
                </motion.section>
              );
            })
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
