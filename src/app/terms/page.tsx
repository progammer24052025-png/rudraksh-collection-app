import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { storeConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that govern your use of the Rudraksh Collection website, orders, delivery and returns.",
};

const LAST_UPDATED = "4 November 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage">Legal</p>
        <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-neutral mt-10 max-w-none text-muted-foreground">
          <p>
            Welcome to {storeConfig.legalName}. By visiting this website or placing an order you agree to
            the terms below. Please read them carefully — they form a contract between you and us.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">1. Who we are</h2>
          <p>
            {storeConfig.legalName} is a children&apos;s clothing retailer based in {storeConfig.city},{" "}
            {storeConfig.state}, India. References to &ldquo;we&rdquo;, &ldquo;us&rdquo; and
            &ldquo;our&rdquo; mean {storeConfig.legalName}; &ldquo;you&rdquo; means the person using this
            website or placing an order.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">2. Using this website</h2>
          <ul>
            <li>You must be at least 18 years old, or use the site under the supervision of a parent or guardian, to place an order.</li>
            <li>You agree to give accurate, current information at checkout — particularly your address and phone number.</li>
            <li>You may not use this site for fraud, to interfere with its operation, or to attempt unauthorised access to any account or system.</li>
          </ul>

          <h2 className="font-serif text-xl font-medium text-foreground">3. Accounts and sign-in</h2>
          <p>
            Sign-in is handled by Firebase Authentication using a mobile one-time password or your
            Google account. You are responsible for keeping access to your phone number and email
            secure. Tell us immediately if you believe someone else has accessed your account.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">4. Products and descriptions</h2>
          <p>
            We describe every item as accurately as we can. Colours can look different from screen to
            screen, and measurements may vary slightly between brands and batches. Product images are
            for illustration. If an item is materially different from its description, our returns policy
            applies.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">5. Prices and availability</h2>
          <ul>
            <li>All prices are in Indian Rupees (₹) and include applicable taxes unless stated otherwise.</li>
            <li>Prices and availability can change without notice.</li>
            <li>We may correct pricing errors and cancel an affected order, refunding any amount already paid.</li>
            <li>Placing an order is an offer to buy. Our acceptance happens when we confirm the order.</li>
          </ul>

          <h2 className="font-serif text-xl font-medium text-foreground">6. Payment</h2>
          <p>
            {storeConfig.codAvailable
              ? "We accept Cash on Delivery and, when enabled, online payment through our payment provider. Online payments are processed by the provider under its own terms; we never store your card or UPI credentials."
              : "We accept online payment through our payment provider. We never store your card or UPI credentials."}{" "}
            Orders may be held or cancelled if payment cannot be verified.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">7. Delivery and risk</h2>
          <p>
            Delivery timelines and charges are set out in our{" "}
            <Link href="/shipping" className="text-primary hover:underline">Shipping Policy</Link>. Risk
            in the goods passes to you when they are delivered to the address you supplied. Please
            inspect your parcel on arrival and report damage within 48 hours.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">8. Returns, exchanges and refunds</h2>
          <p>
            Returns and exchanges are governed by our{" "}
            <Link href="/returns" className="text-primary hover:underline">Returns &amp; Refunds</Link>{" "}
            policy, which forms part of these terms. Nothing in these terms limits any right you have
            under the Consumer Protection Act, 2019.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">9. Intellectual property</h2>
          <p>
            The text, layout, photographs and design of this website belong to us or our licensors.
            Brand names and logos belong to their respective owners. You may not copy or reuse our
            content for commercial purposes without written permission.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">10. Limitation of liability</h2>
          <p>
            To the extent permitted by law, our total liability for any claim relating to an order is
            limited to the amount you paid for that order. We are not liable for indirect or
            consequential losses, or for delays caused by events outside our reasonable control such as
            courier disruptions, weather, strikes or government action.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">11. Governing law and disputes</h2>
          <p>
            These terms are governed by the laws of India. Any dispute will first be taken up with us in
            good faith by writing to{" "}
            <a href={`mailto:${storeConfig.email}`} className="text-primary hover:underline">
              {storeConfig.email}
            </a>
            . If it cannot be resolved, the courts at {storeConfig.city}, {storeConfig.state} will have
            exclusive jurisdiction.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">12. Changes to these terms</h2>
          <p>
            We may update these terms from time to time. The version published on this page at the time
            you place an order is the version that applies to that order.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">13. Contact</h2>
          <p>
            Questions about these terms? Write to{" "}
            <a href={`mailto:${storeConfig.email}`} className="text-primary hover:underline">
              {storeConfig.email}
            </a>{" "}
            or use the <Link href="/contact" className="text-primary hover:underline">contact form</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
