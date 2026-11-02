"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/lib/cart-context";

export default function TermsPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h1 className="font-serif text-3xl font-medium">Terms & Conditions</h1>
          <div className="prose prose-lg mt-8 max-w-none text-muted-foreground">
            <p>Last updated: {new Date().getFullYear()}</p>
            <p><strong className="text-foreground">Acceptance:</strong> By using this website, you agree to these terms and conditions.</p>
            <p><strong className="text-foreground">Products:</strong> Product images are for reference. Actual colours may vary slightly due to screen display differences.</p>
            <p><strong className="text-foreground">Pricing:</strong> All prices are in Indian Rupees (INR) and include applicable taxes. We reserve the right to change prices without notice.</p>
            <p><strong className="text-foreground">Orders:</strong> All orders are subject to product availability. We reserve the right to cancel any order due to stock unavailability or pricing errors.</p>
            <p><strong className="text-foreground">Payment:</strong> Cash on Delivery is available. Online payment options may be available at checkout.</p>
            <p><strong className="text-foreground">Liability:</strong> Our liability is limited to the value of the products purchased.</p>
            <p><strong className="text-foreground">Governing Law:</strong> These terms are governed by the laws of India.</p>
          </div>
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
