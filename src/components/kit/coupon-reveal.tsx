"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Reference #8 — Peel-to-reveal coupon code, re-skinned.
 * `#2380f6` → sage, dashed underlay → warm ink dashes.
 * The sticker folds back, the code appears, clicking again copies it.
 */
export function CouponReveal({
  code,
  label = "Reveal Coupon Code",
  onReveal,
  className,
}: {
  code: string;
  label?: string;
  onReveal?: (code: string) => void;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (!revealed) {
      setRevealed(true);
      onReveal?.(code);
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the code is visible anyway */
    }
  }

  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <button
        type="button"
        onClick={() => void handleClick()}
        aria-label={revealed ? `Copy code ${code}` : label}
        className={cn(
          "relative flex h-14 w-full items-center justify-center overflow-hidden rounded-full border border-sage/30",
          "bg-sage/10 transition-colors hover:bg-sage/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        {/* dashed underlay the sticker is peeled from */}
        <span
          aria-hidden
          className="absolute inset-3 rounded-full border border-dashed border-sage/45"
        />

        <span
          className={cn(
            "relative z-10 flex items-center gap-2 text-sm font-semibold tracking-[0.12em] text-foreground transition-opacity duration-300",
            revealed ? "opacity-100" : "opacity-0",
          )}
        >
          {code}
          {copied ? (
            <Check className="h-4 w-4 text-sage" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          )}
        </span>

        {/* the sticker */}
        <span
          aria-hidden
          className={cn(
            "kit-peel-cover absolute inset-0 z-20 flex items-center justify-center gap-2 rounded-full bg-sage text-sm font-semibold text-white shadow-sm",
            revealed ? "-translate-x-[103%] -rotate-6 opacity-0" : "translate-x-0 rotate-0 opacity-100",
          )}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {label}
          {/* fold flap */}
          <span className="absolute right-0 top-0 h-full w-9 overflow-hidden rounded-r-full bg-sage">
            <span className="absolute right-0 top-1/2 h-8 w-8 -translate-y-1/2 translate-x-2 rotate-45 bg-cream/90 shadow-[inset_2px_0_0_rgba(28,25,23,0.15)]" />
          </span>
        </span>
      </button>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        {revealed ? (copied ? "Copied to clipboard" : "Tap the code to copy") : "Tap to peel"}
      </p>
    </div>
  );
}
