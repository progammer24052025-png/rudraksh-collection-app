"use client";

import { cn } from "@/lib/utils";

const DOTS = 8;

export function Spinner({
  size = 28,
  className,
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  const dot = Math.max(3, Math.round(size * 0.19));
  const radius = size / 2 - dot / 2;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label ?? "Loading"}
      className={cn("relative inline-block", className)}
      style={{ width: size, height: size }}
    >
      {Array.from({ length: DOTS }).map((_, index) => {
        const angle = (index / DOTS) * Math.PI * 2;
        return (
          <span
            key={index}
            className="kit-spinner-dot absolute rounded-full bg-sage"
            style={{
              width: dot,
              height: dot,
              left: `calc(50% + ${Math.cos(angle) * radius}px - ${dot / 2}px)`,
              top: `calc(50% + ${Math.sin(angle) * radius}px - ${dot / 2}px)`,
              animationDelay: `${(index / DOTS) * 1.05}s`,
            }}
          />
        );
      })}
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

/** Full-page loader used by route-level loading.tsx files. */
export function PageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4">
      <Spinner size={40} label={label} />
      <p className="text-sm text-muted-foreground">{label}…</p>
    </div>
  );
}

/** Inline loader for buttons and rows. */
export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner size={16} label={label} />
      {label ? <span>{label}</span> : null}
    </span>
  );
}
