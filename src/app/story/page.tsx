"use client";

import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";

export default function StoryPage() {
  const storeConfig = useStore();

  return (
    <>
      <div className="min-h-screen">
        <Header />
        <main id="main">
          {/* Hero */}
          <section className="bg-cream py-20">
            <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage-ink">Our Story</p>
              <h1 className="mt-4 font-serif text-4xl font-medium leading-tight sm:text-5xl">
                Everyday Moments, Beautifully Dressed
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                Rudraksh Collection is a family clothing store in {storeConfig.location},
                offering quality clothing from trusted brands across India.
              </p>
            </div>
          </section>

          {/* Content */}
          <section className="py-16">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <div className="prose prose-lg max-w-none text-muted-foreground">
                <p>
                  Founded with a simple belief — that children deserve clothes that are as
                  comfortable as they are charming — Rudraksh Collection has grown into a
                  trusted destination for parents in Vadodara and beyond.
                </p>
                <p>
                  We carry a carefully curated selection of men&apos;s, women&apos;s and children&apos;s wear from established
                  brands like Macho, James & Harper, Hamper, Essa, Bodycare, Lux Lyra, Comfort, Shilpa,
                  Hi-Rich, Hackucha, Topas, and Top-Gear. Each brand is chosen for its commitment
                  to quality fabrics, thoughtful designs, and fits that let kids be kids.
                </p>
                <p>
                  Whether you&apos;re shopping for everyday essentials, casual outings, or special
                  occasions, our collection has something for every little personality.
                </p>
                <h2 className="mt-10 font-serif text-2xl font-medium text-foreground">What We Stand For</h2>
                <ul className="mt-4 space-y-3">
                  <li><strong className="text-foreground">Quality first:</strong> We stock only brands we trust for fabric quality and durability.</li>
                  <li><strong className="text-foreground">Comfort matters:</strong> Every piece is chosen with how it feels to wear in mind.</li>
                  <li><strong className="text-foreground">Fair pricing:</strong> Quality clothing shouldn&apos;t break the bank.</li>
                  <li><strong className="text-foreground">Personal service:</strong> Visit our store for hands-on help finding the perfect fit.</li>
                </ul>
              </div>

              <div className="mt-12 text-center">
                <Button asChild size="lg" className="rounded-full px-8">
                  <Link href="/products">Explore the Collection</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
