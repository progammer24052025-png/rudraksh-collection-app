import type { Metadata } from "next";

import { BrandSeal } from "@/components/kit/brand-mark";

export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false, follow: false },
};

/** Shown by the installed app when there is no internet connection. */
export default function OfflinePage() {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <BrandSeal size={72} />
      <h1 className="font-serif text-2xl font-medium">You&apos;re offline</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        Rudraksh Collection needs an internet connection to show the latest products and prices.
        Check your connection and try again.
      </p>
      <a
        href="/"
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Try again
      </a>
    </main>
  );
}
