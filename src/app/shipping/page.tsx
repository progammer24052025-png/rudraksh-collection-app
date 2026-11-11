import type { Metadata } from "next";
import Link from "next/link";
import {
  Truck,
  Clock,
  ShieldCheck,
  MapPin,
  PackageCheck,
  AlertCircle,
  HelpCircle,
  Navigation,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LegalNav } from "@/components/legal-nav";
import { Button } from "@/components/ui/button";
import { storeConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy | Rudraksh Collection",
  description:
    "Delivery timelines, dispatch protocol, free shipping thresholds, Cash on Delivery, and tracking for Rudraksh Collection.",
};

const LAST_UPDATED = "7 November 2026";

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <LegalNav />

      <main id="main" className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="text-center sm:text-left border-b border-border/80 pb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Truck className="h-3.5 w-3.5" /> Logistics &amp; Fulfillment
          </div>
          <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl lg:text-5xl">
            Shipping &amp; Delivery Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Reliable, safe delivery to your doorstep across India · Last Updated: {LAST_UPDATED}
          </p>
        </div>

        {/* Shipping Highlights */}
        <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <PackageCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">Free Shipping</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                On all orders of ₹{storeConfig.freeShippingThreshold} and above across India.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">Fast Dispatch</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Handed to courier in {storeConfig.dispatchDays}.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">Tamper-Proof</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Securely boxed and sealed with quality verification.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <Navigation className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">Live Tracking</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Step-by-step parcel updates via SMS, email &amp; tracking portal.
              </p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          {/* Section 1 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              Delivery Coverage &amp; Logistics Partners
            </h2>
            <p className="mt-4">
              Rudraksh Collection delivers to all major serviceable pin codes across the Republic of
              India. We partner with Tier-1 logistics carriers (including Blue Dart, Delhivery, DTDC,
              and India Post Speed Post for remote pin codes).
            </p>
            <p className="mt-3">
              <strong>Local Vadodara Orders:</strong> Orders placed within Vadodara city limits are
              frequently serviced through our dedicated local dispatch team for expedited delivery.
            </p>
          </div>

          {/* Section 2 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              Turnaround &amp; Delivery Timelines
            </h2>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl border border-border">
                <span className="font-semibold text-foreground min-w-[120px]">Dispatch Period:</span>
                <span>Orders are verified, packed, and handed to the courier within <strong>{storeConfig.dispatchDays}</strong> (excluding Sundays and national holidays).</span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-border">
                <span className="font-semibold text-foreground min-w-[120px]">Standard Delivery:</span>
                <span>Transit time ranges between <strong>{storeConfig.deliveryDays}</strong> depending on distance from our Vadodara warehouse. Metro cities typically arrive in 3–4 days; North-East and remote areas take 5–7 days.</span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-border">
                <span className="font-semibold text-foreground min-w-[120px]">Festive Periods:</span>
                <span>During peak festival seasons (Diwali, Eid, Raksha Bandhan), courier transit may experience an additional 1–2 day delay.</span>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              Shipping Charges &amp; Free Delivery Threshold
            </h2>
            <div className="mt-4 space-y-2 text-xs">
              <p>
                • <strong>Orders ₹{storeConfig.freeShippingThreshold} or Above:</strong> Completely <strong>FREE DELIVERY</strong> anywhere in India.
              </p>
              <p>
                • <strong>Orders Below ₹{storeConfig.freeShippingThreshold}:</strong> A delivery charge applies, based on how far your PIN code is from our Vadodara store. You can check the exact charge on any product page with your PIN code, and it is shown at checkout before you pay.
              </p>
              <p>
                • <strong>No Surprise Taxes:</strong> The final cart total includes all shipping charges and GST before checkout. We never charge hidden handling fees at delivery.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                4
              </span>
              Cash on Delivery (COD) Guidelines
            </h2>
            <p className="mt-4 text-xs leading-relaxed">
              {storeConfig.codAvailable
                ? "Cash on Delivery is available across most serviceable pincodes. Please keep exact cash ready upon delivery. Couriers will not hand over parcels for inspection or trial before payment is handed over. If a customer refuses confirmed COD deliveries twice without valid justification, COD privileges will be permanently revoked for that phone number."
                : "Cash on Delivery is currently paused. Please use our secure online payment options."}
            </p>
          </div>

          {/* Section 5 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                5
              </span>
              Tracking Your Parcel
            </h2>
            <p className="mt-4 text-xs">
              Every dispatched order receives a unique reference number formatted as{" "}
              <code>RC-YYYYMMDD-XXXX</code>. You can track real-time delivery milestones at any time on
              our dedicated portal:
            </p>
            <div className="mt-4">
              <Button asChild size="sm">
                <Link href="/track-order">
                  <Navigation className="mr-1.5 h-3.5 w-3.5" /> Open Order Tracker
                </Link>
              </Button>
            </div>
          </div>

          {/* Section 6 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                6
              </span>
              Failed Delivery Attempts &amp; Return to Origin (RTO)
            </h2>
            <p className="mt-4 text-xs">
              Our courier partners attempt delivery up to three (3) times. An automated SMS/Call is
              sent prior to delivery. If delivery fails due to an incorrect address, non-availability,
              or an unanswered phone, the parcel is flagged as Return to Origin (RTO). In such cases:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-muted-foreground">
              <li>Prepaid orders returned to origin will be refunded minus the outward shipping fee.</li>
              <li>Re-dispatch can be scheduled upon receiving updated address coordinates.</li>
            </ul>
          </div>

          {/* In-Store Pickup Callout */}
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 sm:p-8 shadow-sm">
            <h3 className="font-serif text-lg font-medium text-foreground">In-Store Shopping &amp; Local Pickup</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Prefer to pick up items immediately? Visit our store at Pancham Heights, Khodiyar Nagar,
              New VIP Road, Vadodara.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild size="sm">
                <Link href="/visit">Store Location &amp; Timings</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/directions">Get Directions</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
