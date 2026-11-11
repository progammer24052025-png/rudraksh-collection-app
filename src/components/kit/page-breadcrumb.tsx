import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

/**
 * Reference #9 — Breadcrumb, re-skinned.
 * Muted ancestors, full-ink current page, lucide separators.
 * Also emits BreadcrumbList structured data for search engines.
 */
export function PageBreadcrumb({
  items,
  className,
  withStructuredData = true,
}: {
  items: Crumb[];
  className?: string;
  withStructuredData?: boolean;
}) {
  const trail: Crumb[] = [{ label: "Home", href: "/" }, ...items];

  return (
    <nav aria-label="Breadcrumb" className={cn("py-4", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />
              ) : null}
              {isLast || !crumb.href ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {index === 0 ? <Home className="h-3.5 w-3.5" aria-hidden /> : null}
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {withStructuredData ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: trail.map((crumb, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: crumb.label,
                ...(crumb.href ? { item: `https://rudrakshcollection.in${crumb.href}` } : {}),
              })),
            }),
          }}
        />
      ) : null}
    </nav>
  );
}
