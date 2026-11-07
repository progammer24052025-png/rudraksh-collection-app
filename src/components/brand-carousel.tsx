"use client";

import Link from "next/link";
import Marquee from "react-fast-marquee";
import { brands } from "@/lib/config";
import { BrandLogoBadge } from "./brand-logo-badge";

export { BrandLogoBadge };

export function BrandCarousel() {
  return (
    <section className="relative border-y border-border/80 bg-secondary/20 py-14 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-8 text-center">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-primary">
          Our Brand Partners
        </p>
        <h2 className="mt-2 font-serif text-2xl font-medium sm:text-3xl lg:text-4xl">
          Curated for Little Ones
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
          Explore trusted children&apos;s apparel brands. Hover or click any brand to explore its collection.
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
        {brands.map((brand) => (
          <Link
            key={brand.slug}
            href={`/brands/${brand.slug}`}
            className="group mx-4 sm:mx-6 flex flex-col items-center text-center cursor-pointer select-none"
          >
            {/* Circular Logo Container with hover interaction */}
            <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full border-2 border-border/80 bg-card p-1.5 shadow-sm transition-all duration-300 ease-out group-hover:scale-110 group-hover:border-primary group-hover:shadow-md">
              <BrandLogoBadge slug={brand.slug} name={brand.name} />
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
