"use client";

import { ClothingRailHero, type RailGarment } from "@/components/ui/product-rail-gallery";
import { CouponRevealButton } from "@/components/ui/button-26";
import { AnimatedTicket } from "@/components/ui/ticket-confirmation-card";

/**
 * The three components integrated from the reference drop, shown with sample
 * data only — no real prices, coupons or customers.
 */

const SAMPLE_PIECES: RailGarment[] = [
  { id: "a", name: "Cotton crew tee", kind: "tee", color: "#EFEBE2", tag: "2-3Y", details: ["Cotton", "Regular fit"] },
  { id: "b", name: "Knitted cardigan", kind: "knit", color: "#758151", tag: "4-5Y", details: ["Wool blend", "Ribbed trim"] },
  { id: "c", name: "Fleece hoodie", kind: "hoodie", color: "#A0A5AB", tag: "6-7Y", details: ["Fleece", "Kangaroo pocket"] },
  { id: "d", name: "Party shirt", kind: "shirt", color: "#A3C6D8", tag: "8-9Y", details: ["Cotton", "Button-down"] },
  { id: "e", name: "Winter jacket", kind: "jacket", color: "#B4553F", tag: "10-11Y", details: ["Quilted", "Zip front"] },
];

function Block({ n, title, note, children }: { n: number; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-12 first:border-t-0">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sage-ink">Reference {n}</p>
        <h2 className="mt-1 font-serif text-xl font-medium">{title}</h2>
        {note ? <p className="mt-1 text-sm text-muted-foreground">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ReferenceAdditions() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sage-ink">Latest additions</p>
        <h1 className="mt-2 font-serif text-3xl font-medium">Rail, peel button and order bill</h1>
        <p className="mt-2 text-muted-foreground">
          Integrated from the reference drop and re-skinned to the store palette. Everything below uses sample
          data — no live prices, codes or customers.
        </p>
      </div>

      <Block n={12} title="Clothing rail" note="Illustrated pieces hang on a rail you can brush along, drag and lift open.">
        <div className="rounded-2xl border border-border bg-card">
          <ClothingRailHero
            eyebrow="Sample rail"
            heading="Six pieces, one rail"
            caption="Move along the rail, or lift a piece to see it up close."
            items={SAMPLE_PIECES}
          />
        </div>
      </Block>

      <Block n={13} title="Peel-to-reveal coupon" note="Click peels the sticker; the second click copies the code.">
        <div className="flex max-w-md flex-col items-start gap-3">
          <CouponRevealButton
            frontText="Peel to reveal your code"
            backText="Here's your sample code"
            couponCode="EXAMPLE10"
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">Sample code only — it is not attached to any live coupon.</p>
        </div>
      </Block>

      <Block n={14} title="Order bill" note="Shown on the checkout success step, in rupees, with the shop's own totals.">
        <AnimatedTicket
          ticketId="RC-SAMPLE-0001"
          amount={2547}
          date={new Date("2026-11-04T10:15:00")}
          cardHolder="Sample Customer"
          paymentLabel="Cash on delivery"
          barcodeValue="0000000001"
          lines={[
            { label: "Subtotal", value: "₹2,547" },
            { label: "Discount (EXAMPLE10)", value: "−₹255" },
            { label: "Shipping", value: "Free", muted: true },
            { label: "Total", value: "₹2,292" },
          ]}
          note="Sample bill — not a real order. Includes ₹109 GST."
        />
      </Block>
    </div>
  );
}
