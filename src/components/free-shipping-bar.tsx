"use client";

import { Truck } from "lucide-react";

import { formatPrice } from "@/lib/store-data";
import { cn } from "@/lib/utils";

/** How far the bag is from free delivery, as a bar instead of small print. */
export function FreeShippingBar({
  subtotal,
  threshold,
  className,
}: {
  subtotal: number;
  threshold: number;
  className?: string;
}) {
  if (!(threshold > 0)) return null;
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(100, Math.round((subtotal / threshold) * 100));
  const unlocked = remaining === 0;

  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <p className="flex items-center gap-2 text-sm">
        <Truck className={cn("h-4 w-4 shrink-0", unlocked ? "text-sage-ink" : "text-muted-foreground")} />
        {unlocked ? (
          <span>
            <span className="font-medium text-sage-ink">You have free delivery</span> on this order.
          </span>
        ) : (
          <span>
            Add <span className="font-semibold">{formatPrice(remaining)}</span> more for{" "}
            <span className="font-medium">free delivery</span>
          </span>
        )}
      </p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Progress towards free delivery"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", unlocked ? "bg-sage" : "bg-primary")}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
