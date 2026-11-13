"use client";

import { MalaSpinner, SealLoader } from "@/components/kit/brand-mark";
import { cn } from "@/lib/utils";

/**
 * Loading indicators, all drawn from the store's mala seal.
 * Kept under the old names so existing imports keep working.
 */
export function Spinner({
  size = 28,
  className,
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span className={cn("inline-flex text-rose-ink", className)} style={{ width: size, height: size }}>
      <MalaSpinner className="size-full" label={label} />
    </span>
  );
}

/** Full-page loader used by route-level loading states. */
export function PageSpinner({ label = "Loading" }: { label?: string }) {
  return <SealLoader label={label} size={64} className="min-h-[55vh]" />;
}

/** Inline loader for buttons and rows. */
export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <MalaSpinner label={label} />
      {label ? <span>{label}</span> : null}
    </span>
  );
}
