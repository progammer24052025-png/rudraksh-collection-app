import type { Metadata } from "next";
import Link from "next/link";
import {
  RotateCcw,
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
  ShieldCheck,
  Package,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LegalNav } from "@/components/legal-nav";
import { Button } from "@/components/ui/button";
import { storeConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Returns & Refund Policy | Rudraksh Collection",
  description:
    "7-day easy returns, free size exchanges, and transparent refund timelines for children's wear at Rudraksh Collection.",
};

const LAST_UPDATED = "7 November 2026";

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <LegalNav />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="text-center sm:text-left border-b border-border/80 pb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <RotateCcw className="h-3.5 w-3.5" /> Customer Assurance
          </div>
          <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl lg:text-5xl">
            Returns, Exchanges &amp; Refund Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Clear, transparent policies for worry-free shopping for your little ones · Last Updated: {LAST_UPDATED}
          </p>
        </div>

        {/* Highlight Trust Pillars */}
        <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">7-Day Window</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Easy return window starting from the day of parcel delivery.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">Free Size Exchange</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Seamless size exchange with zero extra courier charges.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">5–7 Day Refunds</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Direct refund to original payment method or bank/UPI for COD.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">Doorstep Pickup</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Reverse pickup available across major serviceable pincodes.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Sections */}
        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          {/* Section 1 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              Return Eligibility Criteria
            </h2>
            <p className="mt-4">
              We want you and your child to love every outfit. You may return items within{" "}
              <strong>{storeConfig.returnWindowDays} calendar days</strong> of receiving your delivery,
              subject to the following conditions:
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-green-200/60 bg-green-50/40 dark:bg-green-950/20 p-4">
                <span className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" /> Returnable Items
                </span>
                <ul className="mt-2 space-y-1 text-muted-foreground list-disc pl-4">
                  <li>Unused, unwashed, and unaltered garments.</li>
                  <li>Original brand tags and barcodes intact.</li>
                  <li>Original brand box or polybag packaging included.</li>
                  <li>Size exchange requests due to fit issues.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-red-200/60 bg-red-50/40 dark:bg-red-950/20 p-4">
                <span className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" /> Non-Returnable Items
                </span>
                <ul className="mt-2 space-y-1 text-muted-foreground list-disc pl-4">
                  <li>Children&apos;s innerwear, briefs, and vests (hygiene policy).</li>
                  <li>Socks and baby rattles/pacifiers once opened.</li>
                  <li>Items that have been washed, perfumed, or soiled.</li>
                  <li>Free gifts or promotional clearance bundles.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              Step-by-Step Return &amp; Exchange Process
            </h2>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl border border-border">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">1</span>
                <div>
                  <strong>Initiate Request:</strong> Reach out via our{" "}
                  <Link href="/contact" className="text-primary hover:underline font-medium">contact form</Link>, email, or WhatsApp with your Order ID (<code>RC-YYYYMMDD-XXXX</code>) and reason for return.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-border">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">2</span>
                <div>
                  <strong>Reverse Pickup:</strong> Our team will schedule a courier pickup from your delivery address. Alternatively, local customers in Vadodara may exchange items directly at our store.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-border">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">3</span>
                <div>
                  <strong>Quality Check &amp; Settlement:</strong> Once the parcel reaches our facility, we inspect it within 24–48 hours and initiate the replacement or refund immediately.
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              Refund Timelines &amp; Settlement Channels
            </h2>
            <div className="mt-4 space-y-3 text-xs">
              <p>
                • <strong>Prepaid Orders (Cards, Net Banking, UPI):</strong> Refunds are credited back to the original source bank/card within <strong>5–7 business days</strong> following quality approval.
              </p>
              <p>
                • <strong>Cash on Delivery (COD) Orders:</strong> Because cash cannot be returned electronically to source, our team will request your Bank Account Number (IFSC) or UPI ID to transfer funds via IMPS/NEFT within <strong>3–5 business days</strong>.
              </p>
              <p>
                • <strong>Delivery Fees:</strong> Standard shipping fees are non-refundable unless the return is due to our error (e.g., manufacturing defect, transit damage, or incorrect product delivered).
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                4
              </span>
              Transit Damage &amp; Defective Merchandise
            </h2>
            <p className="mt-4">
              If an outer carton arrives damaged or tampered with, please take photographs before opening.
              Any damage, manufacturing flaw, or missing item must be reported within{" "}
              <strong>48 hours of delivery</strong>. We will expedite a 100% free replacement or
              immediate full refund.
            </p>
          </div>

          {/* Section 5: Help Callout */}
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 sm:p-8 shadow-sm">
            <h3 className="font-serif text-lg font-medium text-foreground">Need Immediate Return Support?</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Our customer care desk is available Monday through Sunday, 10:00 AM – 8:00 PM IST.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild size="sm">
                <Link href="/contact">Open Support Ticket</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/track-order">Track My Order Status</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
