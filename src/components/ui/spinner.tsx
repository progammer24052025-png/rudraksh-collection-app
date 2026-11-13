import { MalaSpinner } from "@/components/kit/brand-mark"

import { cn } from "@/lib/utils"

/**
 * The store's small loading indicator: the seal's ring of beads, with a glow
 * travelling round it. Sized with `size-*` / `h-* w-*` like an icon.
 */
function Spinner({ className, label }: { className?: string; label?: string }) {
  return <MalaSpinner className={cn("size-4", className)} label={label} />
}

export { Spinner }
