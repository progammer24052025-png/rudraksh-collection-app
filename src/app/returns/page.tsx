"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/lib/cart-context";

export default function ReturnsPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h1 className="font-serif text-3xl font-medium">Returns & Exchanges</h1>
          <div className="prose prose-lg mt-8 max-w-none text-muted-foreground">
            <p><strong className="text-foreground">Return Window:</strong> Returns and exchanges are accepted within 7 days of delivery.</p>
            <p><strong className="text-foreground">Conditions:</strong></p>
            <ul>
              <li>Items must be unworn, unwashed, and in original packaging</li>
              <li>Tags must be intact</li>
              <li>Items must not have any stains, odors, or damage</li>
            </ul>
            <p><strong className="text-foreground">Exchange:</strong> Size exchanges are subject to availability. If the desired size is unavailable, a refund will be issued.</p>
            <p><strong className="text-foreground">Refunds:</strong> Refunds are processed to the original payment method within 5-7 business days after we receive the returned item.</p>
            <p><strong className="text-foreground">Non-Returnable:</strong> Items that are worn, washed, altered, or without tags cannot be returned.</p>
            <p className="text-sm italic mt-6">Note: This is a general returns policy. Contact us for assistance with returns.</p>
          </div>
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
