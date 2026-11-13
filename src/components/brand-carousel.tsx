"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Marquee from "react-fast-marquee";
import { brands as fallbackBrands } from "@/lib/config";
import { subscribeBrands } from "@/lib/firebase";
import type { Brand } from "@/lib/types";
import { BrandLogoBadge } from "./brand-logo-badge";

export { BrandLogoBadge };

export function BrandCarousel() {
  const [brandsList, setBrandsList] = useState<Brand[]>([]);

  useEffect(() => {
    return subscribeBrands((list) => {
      const active = list.filter((b) => b.status !== "hidden");
      if (active.length > 0) {
        setBrandsList(active);
      }
    });
  }, []);

  const displayBrands =
    brandsList.length > 0
      ? brandsList
      : fallbackBrands.map((b) => ({
        id: b.slug,
        name: b.name,
        slug: b.slug,
        status: "active" as const,
        created_at: "",
      }));

  return (
    <section className="relative border-y border-border/80 bg-secondary/20 py-14 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-8 text-center">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-primary">
          Our Brand Collection
        </p>
        <h2 className="mt-2 font-serif text-2xl font-medium sm:text-3xl lg:text-4xl">
          Curated for the Whole Family
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
          Explore the trusted brands we stock for men, women and kids. Hover or click any brand to explore its collection.
        </p>
      </div>

      {/* Slow continuous horizontal marquee */}
      <Marquee
        speed={26}
        pauseOnHover={true}
        pauseOnClick={true}
        autoFill={true}
        gradient={true}
        gradientColor="hsl(var(--background))"
        gradientWidth={60}
        className="py-3"
      >
        {displayBrands.map((brand) => (
          <Link
            key={brand.slug}
            href={`/brands/${brand.slug}`}
            className="group mx-4 sm:mx-6 flex flex-col items-center text-center cursor-pointer select-none"
          >
            {/* Circular Logo Container: spacious, subtle single border, maximum room for logo */}
            <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full border border-border/70 bg-white p-2 shadow-sm transition-all duration-300 ease-out group-hover:scale-105 group-hover:border-primary group-hover:shadow-md overflow-hidden">
              <BrandLogoBadge
                slug={brand.slug}
                name={brand.name}
                logo={"logo" in brand ? (brand.logo as string | null) : null}
              />
            </div>

            {/* Brand Title below circle */}
            <span className="mt-3 text-xs sm:text-sm font-medium text-foreground/90 transition-colors group-hover:text-primary">
              {brand.name}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground transition-colors group-hover:text-foreground">
              View Collection →
            </span>
          </Link>
        ))}
      </Marquee>
    </section>
  );
}
