"use client";

import Image from "@/components/store-image";
import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight, Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OfferProduct = {
  id: string;
  name: string;
  subtitle?: string;
  price: number;
  /** Only pass a real, higher original price — never invent one. */
  mrp?: number;
  image: string;
  href: string;
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Reference #10 — Offers promo banner, re-skinned.
 * `#161616` → cream card. No rating pill, no invented strikethroughs:
 * a discount badge renders only when `mrp` is genuinely above `price`.
 */
export function OffersBanner({
  eyebrow = "Festive offer",
  title,
  description,
  code,
  ctaHref = "/products",
  ctaLabel = "View all offers",
  products,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  code?: string;
  ctaHref?: string;
  ctaLabel?: string;
  products: OfferProduct[];
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: 1 | -1) {
    trackRef.current?.scrollBy({ left: direction * 280, behavior: "smooth" });
  }

  return (
    <section
      className={cn(
        "grid gap-0 overflow-hidden rounded-2xl border border-border bg-cream lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]",
        className,
      )}
    >
      <div className="flex flex-col justify-center gap-3 border-b border-border px-7 py-8 lg:border-b-0 lg:border-r">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-sage/15 text-sage">
          <Gift className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="font-serif text-2xl leading-tight text-foreground sm:text-3xl">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        {code ? (
          <p className="text-xs text-muted-foreground">
            Use code{" "}
            <span className="rounded-md border border-dashed border-sage/60 bg-white px-2 py-0.5 font-mono text-[11px] text-foreground">
              {code}
            </span>{" "}
            at checkout
          </p>
        ) : null}
        <Button
          asChild
          variant="outline"
          className="mt-1 w-fit rounded-full border-sage/60 px-5 text-foreground hover:bg-sage/10"
        >
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      </div>

      <div className="relative min-w-0 px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          aria-label="Scroll offers"
          className="absolute right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-secondary sm:flex"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          aria-label="Scroll offers back"
          className="absolute left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-secondary sm:flex"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>

        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-color:var(--sage)_transparent] [scrollbar-width:thin]"
        >
          {products.map((product) => {
            const hasDiscount = typeof product.mrp === "number" && product.mrp > product.price;
            const percent = hasDiscount
              ? Math.round(((product.mrp! - product.price) / product.mrp!) * 100)
              : 0;

            return (
              <Link
                key={product.id}
                href={product.href}
                className="group w-[210px] shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="210px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  {hasDiscount ? (
                    <span className="absolute left-2 top-2 rounded-full bg-sage px-2 py-0.5 text-[11px] font-semibold text-white">
                      {percent}% off
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1 px-3 py-3">
                  <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                  {product.subtitle ? (
                    <p className="truncate text-xs text-muted-foreground">{product.subtitle}</p>
                  ) : null}
                  <p className="flex items-baseline gap-2 pt-0.5">
                    <span className="text-sm font-semibold text-foreground">{inr.format(product.price)}</span>
                    {hasDiscount ? (
                      <span className="text-xs text-muted-foreground line-through">
                        {inr.format(product.mrp!)}
                      </span>
                    ) : null}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
