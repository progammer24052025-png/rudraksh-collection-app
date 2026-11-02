"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/lib/cart-context";

export default function PrivacyPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h1 className="font-serif text-3xl font-medium">Privacy Policy</h1>
          <div className="prose prose-lg mt-8 max-w-none text-muted-foreground">
            <p>Last updated: {new Date().getFullYear()}</p>
            <p><strong className="text-foreground">Information We Collect:</strong> We collect information you provide directly, such as name, phone number, email, and delivery address when placing an order.</p>
            <p><strong className="text-foreground">How We Use Your Information:</strong> We use your information to process orders, provide customer support, and improve our services.</p>
            <p><strong className="text-foreground">Data Sharing:</strong> We do not sell your personal information. We share data only with delivery partners to fulfil your order.</p>
            <p><strong className="text-foreground">Cookies:</strong> We use local storage to remember your cart contents. No tracking cookies are used.</p>
            <p><strong className="text-foreground">Your Rights:</strong> You may contact us to request access to, correction of, or deletion of your personal data.</p>
            <p><strong className="text-foreground">Contact:</strong> For privacy-related questions, reach out to us through our store or website.</p>
          </div>
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
