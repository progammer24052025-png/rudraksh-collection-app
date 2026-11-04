"use client";

import { useState } from "react";
import { ArrowDown, Check, Percent, Ticket } from "lucide-react";

import { cn } from "@/lib/utils";

const TONES = {
  sage: {
    shell: "bg-sage/12 text-foreground",
    icon: "bg-sage text-white",
    stub: "bg-sage text-white",
  },
  ink: {
    shell: "bg-secondary text-foreground",
    icon: "bg-primary text-primary-foreground",
    stub: "bg-primary text-primary-foreground",
  },
  rose: {
    shell: "bg-destructive/10 text-foreground",
    icon: "bg-destructive text-white",
    stub: "bg-destructive text-white",
  },
} as const;

export type CouponTone = keyof typeof TONES;

/**
 * Reference #7 — Tear-off coupon tickets, re-skinned.
 * `#f2f2f2` → warm ivory, `#e50914` → dusty rose, perforation kept.
 * Tearing the stub applies the code; the ticket flips to "Applied".
 */
export function CouponTicket({
  code,
  title,
  subtitle,
  tone = "sage",
  applied = false,
  disabled = false,
  expired = false,
  onApply,
  className,
}: {
  code: string;
  title: string;
  subtitle?: string;
  tone?: CouponTone;
  applied?: boolean;
  disabled?: boolean;
  expired?: boolean;
  onApply?: (code: string) => void;
  className?: string;
}) {
  const [tearing, setTearing] = useState(false);
  const palette = TONES[expired ? "rose" : tone];
  const locked = applied || disabled || expired;

  function tear() {
    if (locked || tearing) return;
    setTearing(true);
    window.setTimeout(() => {
      setTearing(false);
      onApply?.(code);
    }, 360);
  }

  return (
    <div
      className={cn(
        "kit-ticket relative flex w-full items-stretch overflow-hidden rounded-xl border border-border",
        palette.shell,
        expired && "opacity-70",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", palette.icon)}>
          <Ticket className="h-4.5 w-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {expired ? "Expired" : (subtitle ?? code)}
          </p>
        </div>
      </div>

      <div className="relative flex w-px items-center">
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-px border-l border-dashed border-foreground/25"
        />
      </div>

      <button
        type="button"
        onClick={tear}
        disabled={locked}
        aria-label={applied ? `${code} applied` : `Tear off and apply ${code}`}
        className={cn(
          "flex w-[6.5rem] shrink-0 flex-col items-center justify-center gap-1 px-3 text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-300",
          palette.stub,
          locked ? "cursor-default" : "hover:brightness-105 active:scale-[0.98]",
          tearing && "translate-y-2 rotate-3 opacity-0",
        )}
      >
        {applied ? (
          <>
            <Check className="h-4 w-4" aria-hidden />
            Applied
          </>
        ) : expired ? (
          <>
            <Percent className="h-4 w-4" aria-hidden />
            Expired
          </>
        ) : tearing ? (
          "Tearing…"
        ) : (
          <>
            Tear
            <ArrowDown className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>
    </div>
  );
}
