"use client";

import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/lib/cart-context";
import { collections } from "@/lib/config";
import { motion } from "framer-motion";

const IMAGES: Record<string, string> = {
  "boys-wear": "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=600&h=750&fit=crop",
  "girls-wear": "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&h=750&fit=crop",
  "baby-toddler": "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600&h=750&fit=crop",
  "everyday-essentials": "https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?w=600&h=750&fit=crop",
  "casual-wear": "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&h=750&fit=crop",
  "occasion-wear": "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&h=750&fit=crop",
};

export default function CollectionsPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage">Collections</p>
            <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">Shop by Collection</h1>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Find the perfect outfit for every occasion, from everyday play to special celebrations.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((col, idx) => (
              <motion.div
                key={col.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
              >
                <Link
                  href={`/products?category=${col.slug}`}
                  className="group relative block aspect-[4/5] overflow-hidden rounded-lg bg-muted"
                >
                  <Image
                    src={IMAGES[col.slug] || IMAGES["boys-wear"]}
                    alt={col.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h2 className="font-serif text-2xl font-medium text-white">{col.name}</h2>
                    <span className="mt-1 block text-sm text-white/80">Explore Collection →</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
