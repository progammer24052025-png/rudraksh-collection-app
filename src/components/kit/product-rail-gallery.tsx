"use client";

import Image from "@/components/store-image";
import Link from "next/link";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type RailProduct = {
  id: string;
  name: string;
  subtitle?: string;
  price: number;
  image: string;
  href: string;
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Reference #11 — Product rail gallery.
 *
 * Our stand-in for real 3D until the 3D references arrive: garments hang from
 * a rail in perspective, angle away from the viewer, and turn to face you on
 * hover or focus. Clicking opens the detail lightbox.
 */
export function ProductRailGallery({
  products,
  className,
}: {
  products: RailProduct[];
  className?: string;
}) {
  const [active, setActive] = useState<RailProduct | null>(null);

  return (
    <div className={cn("w-full", className)}>
      <div style={{ perspective: "1200px" }} className="overflow-x-auto pb-4">
        <div className="flex min-w-max items-start gap-5 px-1">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => setActive(product)}
              className="group flex w-[190px] shrink-0 flex-col items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* hanger lines */}
              <span className="flex w-full justify-between px-10" aria-hidden>
                <span className="kit-hanger h-6 w-px" />
                <span className="kit-hanger h-6 w-px" />
              </span>

              <span
                className={cn(
                  "block w-full origin-top overflow-hidden rounded-xl border border-border bg-card shadow-sm",
                  "transition-transform duration-500 ease-out will-change-transform",
                  "[transform:rotateX(9deg)_rotateY(-14deg)_translateZ(-24px)]",
                  "group-hover:[transform:rotateX(0deg)_rotateY(0deg)_translateZ(0px)]",
                  "group-focus-visible:[transform:rotateX(0deg)_rotateY(0deg)_translateZ(0px)]",
                )}
                style={{ transformStyle: "preserve-3d" }}
              >
                <span className="relative block aspect-[3/4] overflow-hidden bg-secondary">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="190px"
                    className="object-cover"
                  />
                </span>
                <span className="block px-3 py-3 text-left">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {product.name}
                  </span>
                  {product.subtitle ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {product.subtitle}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-sm text-foreground">{inr.format(product.price)}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="kit-rail mt-1 h-2 rounded-full" aria-hidden />

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-lg overflow-hidden border-border bg-card p-0">
          {active ? (
            <>
              <div className="relative aspect-[4/5] w-full bg-secondary">
                <Image
                  src={active.image}
                  alt={active.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 512px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col gap-2 p-5">
                <DialogHeader className="gap-1 text-left">
                  <DialogTitle className="font-serif text-xl text-foreground">{active.name}</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    {active.subtitle ?? "Rudraksh Collection"}
                  </DialogDescription>
                </DialogHeader>
                <p className="text-lg font-semibold text-foreground">{inr.format(active.price)}</p>
                <Link
                  href={active.href}
                  className="mt-1 inline-flex w-fit items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  View product
                </Link>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
