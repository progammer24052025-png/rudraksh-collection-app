import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  Scale,
  Shield,
  CreditCard,
  Truck,
  RotateCcw,
  AlertTriangle,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LegalNav } from "@/components/legal-nav";
import { storeConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms & Conditions | Rudraksh Collection",
  description:
    "Terms of service, purchasing conditions, order fulfillment, and legal framework governing Rudraksh Collection under Indian E-Commerce law.",
};

const LAST_UPDATED = "7 November 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <LegalNav />

      <main id="main" className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="text-center sm:text-left border-b border-border/80 pb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <FileText className="h-3.5 w-3.5" /> Customer Agreement
          </div>
          <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl lg:text-5xl">
            Terms &amp; Conditions of Service
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective Date: 1 January 2026 · Last Updated: {LAST_UPDATED}
          </p>
        </div>

        {/* Legal Highlights */}
        <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">Consumer Rights</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Protected by the Consumer Protection Act, 2019.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">Fair Pricing</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Transparent pricing with all applicable GST taxes included.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">Secure Checkout</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Bank-level verified checkout with tamper-proof totals.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">Jurisdiction</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Exclusive jurisdiction under the competent courts of Vadodara.
              </p>
            </div>
          </div>
        </div>

        {/* Legal Sections */}
        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          {/* Section 1 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              Contractual Agreement &amp; Operating Entity
            </h2>
            <p className="mt-4">
              These Terms and Conditions (&ldquo;Terms&rdquo;) constitute a legally binding electronic
              contract between you (&ldquo;Customer&rdquo;, &ldquo;User&rdquo;, or &ldquo;You&rdquo;)
              and <strong>{storeConfig.legalName}</strong> (&ldquo;Store&rdquo;, &ldquo;we&rdquo;,
              &ldquo;our&rdquo;), registered in Vadodara, Gujarat, India.
            </p>
            <p className="mt-3">
              By accessing our website, creating an account, or placing an order, you accept and agree
              to be bound by these Terms and our integrated policies: the{" "}
              <Link href="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link>,{" "}
              <Link href="/shipping" className="text-primary hover:underline font-medium">Shipping Policy</Link>, and{" "}
              <Link href="/returns" className="text-primary hover:underline font-medium">Returns &amp; Refunds Policy</Link>.
            </p>
          </div>

          {/* Section 2 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              User Eligibility &amp; Account Responsibilities
            </h2>
            <ul className="mt-4 list-disc pl-5 space-y-2 text-xs">
              <li>
                <strong>Capacity to Contract:</strong> You must be at least 18 years of age or accessing under the supervision of a parent/legal guardian to enter into legally enforceable transactions under the Indian Contract Act, 1872.
              </li>
              <li>
                <strong>Account Credentials:</strong> You are solely responsible for maintaining the confidentiality of your sign-in credentials, mobile device OTP codes, and connected Google credentials.
              </li>
              <li>
                <strong>Accuracy of Checkout Details:</strong> You warrant that all shipping addresses, PIN codes, phone numbers, and recipient details entered during checkout are complete and accurate.
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              Product Sizing, Descriptions &amp; Brand Authenticity
            </h2>
            <p className="mt-4">
              All items featured on Rudraksh Collection are 100% authentic, procured from genuine partner
              brands and trusted manufacturers. Please note:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
              <li>
                <strong>Color Representation:</strong> We make every effort to display true product colors; however, actual colors may exhibit slight variations based on your device display settings.
              </li>
              <li>
                <strong>Sizing:</strong> Sizing charts provide standard age/height measurements. Slight variations (±1-2 cm) may occur across production batches. If size does not fit, our <strong>Free Size Exchange</strong> applies.
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                4
              </span>
              Pricing, Invoicing &amp; Order Acceptance
            </h2>
            <div className="mt-4 space-y-3 text-xs">
              <p>
                • <strong>Currency &amp; Taxes:</strong> All product prices are quoted in Indian Rupees (₹) and include applicable Goods and Services Tax (GST).
              </p>
              <p>
                • <strong>Offer vs. Acceptance:</strong> Your order submission constitutes an offer to purchase. A legally binding contract is formed only when we confirm dispatch or issue an automated order confirmation invoice with an official order number.
              </p>
              <p>
                • <strong>Pricing Rectification:</strong> In the rare event of an obvious typographical pricing error, we reserve the right to cancel the order and issue a 100% immediate refund.
              </p>
            </div>
          </div>

          {/* Section 5: Payment Security */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                5
              </span>
              Payment Terms &amp; Anti-Fraud Protection
            </h2>
            <div className="mt-4 space-y-3 text-xs">
              <p>
                • <strong>Cash on Delivery (COD):</strong> For cash on delivery orders, full payment must be handed to the courier partner prior to package unsealing. Repeated refusal of confirmed COD shipments at the doorstep without valid cause may result in permanent blacklisting of COD privileges.
              </p>
              <p>
                • <strong>Online Prepaid Gateways:</strong> Online transactions are handled through authorized, PCI-DSS compliant payment gateways with Two-Factor Authentication (RBI mandate).
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                6
              </span>
              Limitation of Liability &amp; Force Majeure
            </h2>
            <p className="mt-4">
              To the fullest extent permissible by applicable law:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
              <li>
                <strong>Cap on Liability:</strong> Our maximum aggregate liability arising out of or related to any purchase is strictly capped at the total amount paid by you for that specific order.
              </li>
              <li>
                <strong>Force Majeure:</strong> We are not liable for delayed delivery or inability to fulfill orders caused by acts of God, extreme floods, courier strikes, riots, or state-mandated restrictions.
              </li>
            </ul>
          </div>

          {/* Section 7: Governing Law */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                7
              </span>
              Dispute Resolution &amp; Exclusive Jurisdiction
            </h2>
            <p className="mt-4">
              These Terms shall be interpreted and governed exclusively in accordance with the laws of the
              Republic of India.
            </p>
            <p className="mt-2">
              In the event of any grievance, the parties shall first endeavor to resolve the dispute
              amicably by contacting our support desk. If unresolved within 30 days, any dispute arising
              under these terms shall be submitted to the <strong>exclusive jurisdiction of the competent
              courts located in Vadodara, Gujarat, India</strong>.
            </p>
          </div>

          {/* Section 8: Legal Inquiries */}
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 sm:p-8 shadow-sm">
            <h3 className="font-serif text-lg font-medium text-foreground">Legal &amp; Store Inquiries</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              For legal notices, compliance queries, or formal communication, please direct correspondence to:
            </p>
            <div className="mt-3 text-xs space-y-1 text-foreground font-medium">
              <p>{storeConfig.legalName}</p>
              <p>Email: <a href={`mailto:${storeConfig.email}`} className="text-primary hover:underline">{storeConfig.email}</a></p>
              <p>Location: {storeConfig.address || "125, Pancham Heights, Khodiyar Nagar, New VIP Road, Vadodara, Gujarat"}</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
