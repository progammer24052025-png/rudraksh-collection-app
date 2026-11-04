import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { storeConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "Delivery timelines, shipping charges, cash on delivery and order tracking for Rudraksh Collection.",
};

const LAST_UPDATED = "4 November 2026";

export default function ShippingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage">Customer care</p>
        <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">Shipping Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-neutral mt-10 max-w-none text-muted-foreground">
          <h2 className="font-serif text-xl font-medium text-foreground">Where we deliver</h2>
          <p>
            We deliver to every serviceable pincode in India through our courier partners. Local
            deliveries in {storeConfig.city} are usually handled by our own team, which means faster
            delivery and a chance to inspect the item on arrival.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">Dispatch and delivery time</h2>
          <ul>
            <li>Orders are packed and handed to the courier within <strong>{storeConfig.dispatchDays}</strong> of confirmation.</li>
            <li>Standard delivery takes <strong>{storeConfig.deliveryDays}</strong> depending on your location.</li>
            <li>Orders placed on Sundays or public holidays are processed on the next working day.</li>
            <li>During sale periods or festive seasons, dispatch may take an extra 1–2 days.</li>
          </ul>

          <h2 className="font-serif text-xl font-medium text-foreground">Shipping charges</h2>
          <ul>
            <li>Free delivery on orders of <strong>₹{storeConfig.freeShippingThreshold} or more</strong>.</li>
            <li>A flat delivery fee of <strong>₹{storeConfig.shippingFee}</strong> applies to orders below that amount.</li>
            <li>The exact charge is always shown in your cart and at checkout before you confirm — no hidden fees.</li>
          </ul>

          <h2 className="font-serif text-xl font-medium text-foreground">Cash on Delivery</h2>
          <p>
            {storeConfig.codAvailable
              ? "Cash on Delivery is available for most pincodes. Please keep the exact amount ready; our delivery partner may not always carry change. A COD order that is refused at the door twice may result in COD being disabled for that phone number."
              : "Cash on Delivery is currently unavailable. All orders must be prepaid."}
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">Tracking your order</h2>
          <p>
            Every order gets a unique number in the format <code>RC-YYYYMMDD-XXXX</code>. You can
            follow its progress any time on the{" "}
            <Link href="/track-order" className="text-primary hover:underline">Track Order</Link> page
            using that number and the last four digits of your phone number. Signed-in customers can
            also see live status under My Account → Orders.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">Undelivered parcels</h2>
          <p>
            If a courier cannot reach you after three attempts, the parcel is returned to us. We will
            contact you to arrange redelivery; a second delivery charge may apply for prepaid orders.
            If you are unreachable for more than seven days, the order may be cancelled and refunded
            less the delivery cost.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">Damaged or incorrect items</h2>
          <p>
            Please inspect your parcel when it arrives. If an item is damaged in transit or is not
            what you ordered, contact us within 48 hours with photographs of the item and packaging,
            and we will arrange a replacement or refund. See our{" "}
            <Link href="/returns" className="text-primary hover:underline">Returns & Refunds</Link>{" "}
            policy for full details.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">Address accuracy</h2>
          <p>
            Please check your address, pincode and phone number before confirming. We cannot change an
            address once a parcel has been dispatched, and we are not responsible for delays caused by
            an incorrect address supplied at checkout.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">Questions</h2>
          <p>
            For anything shipping-related, write to{" "}
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
