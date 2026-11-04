import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { storeConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description:
    "7-day returns, free size exchanges and refund timelines for Rudraksh Collection orders.",
};

const LAST_UPDATED = "4 November 2026";

export default function ReturnsPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage">Customer care</p>
        <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">Returns &amp; Refunds</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { title: `${storeConfig.returnWindowDays}-day returns`, detail: "From the date of delivery" },
            { title: "Free size exchange", detail: "Subject to stock availability" },
            { title: "5–7 day refunds", detail: "After inspection at our store" },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="prose prose-neutral mt-10 max-w-none text-muted-foreground">
          <h2 className="font-serif text-xl font-medium text-foreground">What can be returned</h2>
          <p>
            You may return an item within <strong>{storeConfig.returnWindowDays} days</strong> of
            delivery if it is unused, unwashed, and still has the original tags and packaging. Items
            bought on sale are returnable unless the product page says otherwise.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">What cannot be returned</h2>
          <ul>
            <li>Innerwear, socks, and any hygiene-sensitive items once the seal is opened.</li>
            <li>Items that have been washed, worn, altered or damaged after delivery.</li>
            <li>Items returned without their original tags or packaging.</li>
            <li>Free gifts and promotional items.</li>
          </ul>

          <h2 className="font-serif text-xl font-medium text-foreground">How to start a return</h2>
          <ol>
            <li>
              Contact us through the{" "}
              <Link href="/contact" className="text-primary hover:underline">contact form</Link>, email
              or WhatsApp within the return window.
            </li>
            <li>Share your order number, the item and the reason for the return.</li>
            <li>We will confirm eligibility and arrange a pickup or ask you to send the parcel to our store.</li>
            <li>Pack the item securely with its tags and original packaging.</li>
          </ol>

          <h2 className="font-serif text-xl font-medium text-foreground">Size exchanges</h2>
          <p>
            If the size doesn&apos;t fit, we will exchange it free of charge, subject to stock. If the
            size you need is unavailable we will offer a refund or store credit instead. Exchange
            requests must be raised within the same {storeConfig.returnWindowDays}-day window.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">Refund timelines</h2>
          <ul>
            <li>Refunds are initiated after the returned item reaches us and passes a quality check.</li>
            <li>Prepaid orders are refunded to the original payment method within 5–7 business days.</li>
            <li>Cash on Delivery orders are refunded by bank transfer (UPI or NEFT) within 5–7 business days of us receiving your account details.</li>
            <li>Delivery charges are refunded only when the return is due to our error (wrong or damaged item).</li>
          </ul>

          <h2 className="font-serif text-xl font-medium text-foreground">Damaged, defective or wrong items</h2>
          <p>
            Please report transit damage, manufacturing defects or a wrong item within{" "}
            <strong>48 hours of delivery</strong> with photographs of the item and the packaging. We
            will arrange a replacement or a full refund, including any delivery charge. After 48 hours
            we may still help, but the resolution is at our discretion.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">Cancellations</h2>
          <p>
            Orders can be cancelled free of charge before they are packed. Once shipped, the order can
            only be handled as a return. To cancel, contact us with your order number as soon as
            possible.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">Non-receipt of refund</h2>
          <p>
            If your refund has not arrived after 7 business days, check with your bank, then contact us
            with your order number so we can trace the transaction. If you are not satisfied with how a
            return has been handled, write to{" "}
            <a href={`mailto:${storeConfig.email}`} className="text-primary hover:underline">
              {storeConfig.email}
            </a>{" "}
            and we will review it personally.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
