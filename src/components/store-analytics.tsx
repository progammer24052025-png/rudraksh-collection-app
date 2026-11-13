"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { trackEvent } from "@/lib/track";

function PageViews() {
  const pathname = usePathname();
  const search = useSearchParams();
  const query = search?.toString() ?? "";

  useEffect(() => {
    // Waits a moment so the new page's URL is settled before it is recorded.
    const timer = window.setTimeout(() => trackEvent("page_view"), 300);
    return () => window.clearTimeout(timer);
  }, [pathname, query]);

  return null;
}

/** Records a page view on every navigation for the store's own dashboard. */
export function StoreAnalytics() {
  return (
    <Suspense fallback={null}>
      <PageViews />
    </Suspense>
  );
}
