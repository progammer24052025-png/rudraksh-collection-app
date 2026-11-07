"use client";

import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { brands } from "@/lib/config";
import { motion } from "framer-motion";
import { BrandLogoBadge } from "@/components/brand-logo-badge";

export default function BrandsPage() {
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
                key={brand.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
              >
                <Link
                  href={`/brands/${brand.slug}`}
                  className="group flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-border/80 bg-background p-1.5 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:border-primary">
                    <BrandLogoBadge slug={brand.slug} name={brand.name} />
                  </div>
                  <span className="font-serif text-xl font-medium transition-colors group-hover:text-primary">
                    {brand.name}
                  </span>
                  <span className="mt-2 text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                    View Collection →
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
