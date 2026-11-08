"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { isTabActive, tabsForPath } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

/**
 * The sub-tabs of whichever group the current screen belongs to.
 * Rendered by AdminNav, so every admin page gets it without extra wiring.
 */
export function AdminSubtabs() {
  const pathname = usePathname();
  const current = tabsForPath(pathname);

  if (!current) return null;

  return (
    <nav
      aria-label={`${current.group.label} sections`}
      className="border-t border-border bg-background/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {current.tabs.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                active ? "text-sage" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                <motion.span
                  layoutId={`admin-subtab-${current.group.key}`}
                  className="absolute inset-0 rounded-full bg-sage/10"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span className="relative">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
