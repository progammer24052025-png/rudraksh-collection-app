"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { brands as fallbackBrands } from "@/lib/config";
import { fetchBrands } from "@/lib/firebase";
import type { Brand } from "@/lib/types";
import { motion } from "framer-motion";
import { BrandLogoBadge } from "@/components/brand-logo-badge";

const FALLBACK: Brand[] = fallbackBrands.map((brand) => ({
  id: brand.slug,
  slug: brand.slug,
  name: brand.name,
  status: "active",
  created_at: "",
}));

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>(FALLBACK);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchBrands()
      .then((list) => {
        if (cancelled) return;
        const visible = list.filter((brand) => brand.status !== "hidden");
        if (visible.length) setBrands(visible);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage">Our Brands</p>
            <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">Trusted Names in Children&apos;s Wear</h1>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              We carry a carefully selected range of children&apos;s clothing brands, chosen for
              quality, comfort, and style.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand, idx) => (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(idx, 6) * 0.05, duration: 0.4 }}
              >
                <Link
                  href={`/brands/${brand.slug}`}
                  className="group flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="relative mb-4 flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full border border-border/70 bg-white p-2 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-primary group-hover:shadow-md overflow-hidden">
                    <BrandLogoBadge
                      slug={brand.slug}
                      name={brand.name}
                      logo={"logo" in brand ? (brand.logo as string | null) : null}
                    />
                  </div>
                  <span className="font-serif text-xl font-medium transition-colors group-hover:text-primary">
                    {brand.name}
                  </span>
                  {(brand.category_names ?? []).length ? (
                    <span className="mt-3 flex flex-wrap justify-center gap-1">
                      {(brand.category_names ?? []).slice(0, 3).map((category) => (
                        <span
                          key={category}
                          className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-foreground/70"
                        >
                          {category}
                        </span>
                      ))}
                    </span>
                  ) : null}
                  <span className="mt-3 text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                    View Collection →
                  </span>
                </Link>
              </motion.div>
            ))}
            {!ready && brands.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading brands…</p>
            ) : null}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
