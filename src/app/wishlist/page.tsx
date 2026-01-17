"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { CartProvider } from "@/lib/cart-context";

export default function WishlistPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <main>
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                <Heart className="h-12 w-12 text-muted-foreground" />
              </div>
              <h1 className="mt-6 font-serif text-2xl font-bold">Your Wishlist</h1>
              <p className="mt-2 text-muted-foreground">
                Save your favorite items to buy later
              </p>
              <Button asChild className="mt-6">
                <Link href="/products">Browse Products</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
