"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A search bar that stays inside one category. The underline eases open on
 * focus and the arrow nudges on hover — small, smooth, and switched off when
 * the visitor asks for reduced motion.
 */
export function CategorySearch({
  categorySlug,
  categoryName,
  placeholder,
  className,
}: {
  categorySlug?: string;
  categoryName?: string;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    const term = value.trim();
    if (term) params.set("search", term);
    const query = params.toString();
    router.push(query ? `/products?${query}` : "/products");
  }

  return (
    <motion.form
      onSubmit={submit}
      className={cn("group relative", className)}
      animate={
        reduceMotion
          ? undefined
          : { y: focused ? -1 : 0, boxShadow: focused ? "0 10px 30px -18px rgba(0,0,0,0.35)" : "0 0 0 0 rgba(0,0,0,0)" }
      }
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
    >
      <div className="relative flex items-center gap-2 overflow-hidden rounded-full border border-border bg-background/90 px-4 py-2.5 backdrop-blur transition-colors focus-within:border-sage/60">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder ?? (categoryName ? `Search ${categoryName}…` : "Search…")}
          aria-label={categoryName ? `Search in ${categoryName}` : "Search products"}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label="Search"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95"
        >
          <motion.span
            animate={reduceMotion ? undefined : { x: focused ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex"
          >
            <ArrowRight className="h-4 w-4" aria-hidden />
          </motion.span>
        </button>
      </div>

      <motion.span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-6 right-6 h-px origin-left bg-sage/70"
        initial={false}
        animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
      />
    </motion.form>
  );
}
