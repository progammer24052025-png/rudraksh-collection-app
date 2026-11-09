"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_GROUPS, groupForPath, isTabActive } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

/**
 * The second row of admin navigation: the screens inside the current group.
 * Hidden for one-screen groups, where the top bar already links straight in.
 */
export function AdminSubtabs() {
  const pathname = usePathname();
  const activeGroup = groupForPath(pathname) ?? ADMIN_GROUPS.find((group) => group.tabs.length > 1);

  if (!activeGroup || activeGroup.tabs.length < 2) return null;

  return (
    <div className="border-t border-border/60">
      <nav
        aria-label={`${activeGroup.label} screens`}
        className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6 hide-scrollbar"
      >
        {activeGroup.tabs.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-colors",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
