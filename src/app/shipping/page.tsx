"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/lib/cart-context";
import { storeConfig } from "@/lib/config";

export default function ShippingPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h1 className="font-serif text-3xl font-medium">Shipping Policy</h1>
          <div className="prose prose-lg mt-8 max-w-none text-muted-foreground">
            <p><strong className="text-foreground">Processing Time:</strong> Orders are processed within 1-2 business days.</p>
            <p><strong className="text-foreground">Delivery Time:</strong> Standard delivery takes 3-5 business days across India.</p>
            <p><strong className="text-foreground">Shipping Charges:</strong></p>
            <ul>
              <li>Free shipping on orders above ₹{storeConfig.freeShippingThreshold}</li>
              <li>₹{storeConfig.shippingFee} shipping fee on orders below ₹{storeConfig.freeShippingThreshold}</li>
            </ul>
            <p><strong className="text-foreground">Delivery Areas:</strong> We deliver across India. Delivery times may vary for remote areas.</p>
            <p><strong className="text-foreground">Order Tracking:</strong> You will receive updates on your order status via phone.</p>
            <p className="text-sm italic mt-6">Note: This is a general shipping policy. Contact us for specific delivery queries.</p>
          </div>
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
