import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Server,
  FileCheck,
  UserCheck,
  CreditCard,
  Mail,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LegalNav } from "@/components/legal-nav";
import { storeConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy | Rudraksh Collection",
  description:
    "Comprehensive privacy, data protection, and security practices of Rudraksh Collection compliant with the DPDP Act 2023 and IT Act 2000.",
};

const LAST_UPDATED = "7 November 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <LegalNav />

      <main id="main" className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="text-center sm:text-left border-b border-border/80 pb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Data Security &amp; Compliance
          </div>
          <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl lg:text-5xl">
            Privacy &amp; Data Protection Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective Date: 1 January 2026 · Last Updated: {LAST_UPDATED}
          </p>
        </div>

        {/* Security & Trust Pillars */}
        <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">256-Bit SSL/TLS</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Bank-grade end-to-end encryption for all sessions.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">PCI-DSS Payments</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                We never store credit/debit card numbers or UPI PINs.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <EyeOff className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">Zero Data Selling</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                We never rent or sell your personal data to ad brokers.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
              <FileCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">DPDP Act Compliant</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Complies with India&apos;s Digital Personal Data Protection Act.
              </p>
            </div>
          </div>
        </div>

        {/* Legal Policy Content Cards */}
        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          {/* Section 1 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              Who We Are &amp; Regulatory Framework
            </h2>
            <p className="mt-4">
              <strong>{storeConfig.legalName}</strong> (&ldquo;Company&rdquo;, &ldquo;we&rdquo;,
              &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the storefront at{" "}
              <strong>rudrakshcollection.in</strong>, offering curated premium apparel and essentials
              for children. This Privacy Policy outlines our standards under the{" "}
              <strong>Information Technology Act, 2000</strong> (including SPDI Rules), the{" "}
              <strong>Consumer Protection (E-Commerce) Rules, 2020</strong>, and the{" "}
              <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>.
            </p>
            <p className="mt-3">
              We act as the Data Fiduciary regarding the personal data provided by visitors, customers,
              and account holders. By browsing our website, registering an account, or placing an order,
              you consent to the collection, processing, and storage practices detailed herein.
            </p>
          </div>

          {/* Section 2 */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              Information We Collect &amp; Why
            </h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border/80 bg-background/50 p-4">
                <h3 className="font-medium text-foreground">A. Identity &amp; Contact Credentials</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  • <strong>Mobile Number:</strong> Verified via SMS One-Time Password (OTP) for secure login.<br />
                  • <strong>Google Authentication:</strong> Name, verified email address, and avatar image. We never receive or store your Google password.<br />
                  • <strong>Full Name &amp; Delivery Address:</strong> PIN code, city, state, and phone number required for order fulfillment.
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-background/50 p-4">
                <h3 className="font-medium text-foreground">B. Order &amp; Transactional Data</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  • Product SKUs, sizing, quantities, invoice amounts, coupon usage, and delivery status history.<br />
                  • Payment method chosen (Cash on Delivery or Prepaid Gateway Reference ID).
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-background/50 p-4">
                <h3 className="font-medium text-foreground">C. Technical &amp; Device Telemetry</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  • IP address, browser type, operating system, and timestamp logs collected strictly for DDoS mitigation, account security alerts, and fraud prevention.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Payment Security (Crucial) */}
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.02] p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 text-primary">
              <CreditCard className="h-5 w-5" />
              <h2 className="font-serif text-xl font-medium text-foreground">
                3. Payment Security &amp; Zero Card Storage
              </h2>
            </div>
            <p className="mt-4">
              Your financial security is our highest priority. Rudraksh Collection operates on a{" "}
              <strong>zero-retention financial data model</strong> in strict adherence to Reserve Bank
              of India (RBI) tokenization guidelines:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
              <li>
                <strong>No Card Storage:</strong> We never capture, record, view, or store credit card numbers, debit card numbers, CVVs, expiry dates, or net banking passwords on our servers.
              </li>
              <li>
                <strong>PCI-DSS Certified Gateways:</strong> All prepaid transactions are processed directly through RBI-authorized payment aggregators (e.g., Razorpay) certified to <strong>PCI-DSS Level 1</strong> standards.
              </li>
              <li>
                <strong>Encrypted Proof Verification:</strong> When you complete an online payment, our server only receives a cryptographic signature and payment identifier to confirm successful settlement before issuing your order receipt.
              </li>
            </ul>
          </div>

          {/* Section 4: Infrastructure & Technical Safeguards */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                4
              </span>
              Technical Security &amp; Database Architecture
            </h2>
            <p className="mt-4">
              We implement comprehensive administrative, technical, and physical security measures as
              required under Section 43A of the Information Technology Act:
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <h3 className="font-medium text-foreground text-xs flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-primary" /> Role-Based Database Rules
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  Database access rules enforce strict isolation. Customers can only read and write their own profile and authenticated orders. Public catalog data is separated from customer records.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <h3 className="font-medium text-foreground text-xs flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-primary" /> Transport Encryption (HTTPS)
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  All communication between your browser and our servers is enforced over HTTPS utilizing TLS 1.3 encryption with HTTP Strict Transport Security (HSTS).
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <h3 className="font-medium text-foreground text-xs flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Rate-Limiting &amp; Bot Guard
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  Transactional endpoints incorporate in-memory rate-limiting and Google reCAPTCHA Enterprise verification to block automated credential stuffing and scraping attacks.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <h3 className="font-medium text-foreground text-xs flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" /> Automated Security Alerts
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  Our system automatically dispatches instant security alert emails on every login event, notifying you of the exact timestamp, device, and network location.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <h3 className="font-medium text-foreground text-xs flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" /> New Arrival Emails
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  If your account has an email address, we may email you when new products are added — at most once a day. This is switched on by default. You can turn it off at any time from Account → Profile, or with the unsubscribe link in every such email. Emails about your own orders are sent regardless.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <h3 className="font-medium text-foreground text-xs flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" /> Anonymous Usage Statistics
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  We count which pages are visited, which site a visit came from and the device type, both in our own statistics and with Vercel Web Analytics and Speed Insights (which also measure how fast pages load). None of these use cookies or store your IP address, name or order numbers, and only our team can see the totals. If your browser sends a Do Not Track or Global Privacy Control signal, our own statistics skip you entirely.
                </p>
              </div>
            </div>
          </div>

          {/* Section 5: Third-Party Disclosures */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                5
              </span>
              Data Sharing &amp; Third-Party Disclosures
            </h2>
            <p className="mt-4">
              We share minimal necessary data strictly on a need-to-know basis with vetted service partners:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-xs">
              <li>
                <strong>Logistics &amp; Courier Partners:</strong> Recipient name, shipping address, contact phone number, and order value (for COD collection) are shared with verified logistics partners to execute delivery.
              </li>
              <li>
                <strong>Cloud &amp; Infrastructure Providers:</strong> Google Firebase and Vercel Inc. host our application layer and database infrastructure under strict enterprise confidentiality agreements.
              </li>
              <li>
                <strong>Law Enforcement &amp; Statutory Authorities:</strong> Information will be disclosed only when required by court orders, lawful government notices, or relevant statutes under Indian jurisdiction.
              </li>
            </ul>
          </div>

          {/* Section 6: Children's Privacy */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                6
              </span>
              Children&apos;s Privacy &amp; Parental Consent
            </h2>
            <p className="mt-4">
              Although Rudraksh Collection sells children&apos;s and baby clothing as well as adult wear, our services
              and purchase capabilities are designed strictly for adult consumers (parents, guardians, or
              individuals aged 18 and older). We do not knowingly solicit or collect personal data directly
              from children under the age of 18 without parental consent. If we discover that personal data
              has been submitted by a minor, we will promptly delete it.
            </p>
          </div>

          {/* Section 7: User Rights */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-foreground flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                7
              </span>
              Your Statutory Rights (DPDP Act, 2023)
            </h2>
            <p className="mt-4">
              As a Data Principal under India&apos;s Digital Personal Data Protection Act, you have the right to:
            </p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-border p-3">
                <strong>Right to Access:</strong> Request a summary of the personal data processed by us and the processing activities undertaken.
              </div>
              <div className="rounded-xl border border-border p-3">
                <strong>Right to Correction:</strong> Correct, complete, or update any inaccurate or obsolete personal data.
              </div>
              <div className="rounded-xl border border-border p-3">
                <strong>Right to Erasure:</strong> Request permanent deletion of your customer profile and account credentials, subject to statutory tax retention laws.
              </div>
              <div className="rounded-xl border border-border p-3">
                <strong>Right of Grievance Redressal:</strong> Direct access to our appointed Grievance Officer for prompt dispute resolution.
              </div>
            </div>
          </div>

          {/* Section 8: Grievance Redressal Officer (Mandatory by Indian Law) */}
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 text-primary">
              <UserCheck className="h-5 w-5" />
              <h2 className="font-serif text-xl font-medium text-foreground">
                8. Statutory Grievance Redressal Officer
              </h2>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              In accordance with Rule 5(6) of the Consumer Protection (E-Commerce) Rules, 2020 and the
              Information Technology (Intermediary Guidelines) Rules, the contact details of our
              designated Grievance Officer are:
            </p>

            <div className="mt-4 rounded-xl border border-border/80 bg-card p-5 text-xs space-y-2">
              <p><strong>Entity Name:</strong> {storeConfig.legalName}</p>
              <p><strong>Designation:</strong> Grievance Redressal &amp; Privacy Officer</p>
              <p><strong>Store &amp; Office Address:</strong> {storeConfig.address || "125, Pancham Heights, Khodiyar Nagar, New VIP Road, Vadodara, Gujarat - 390022"}</p>
              <p><strong>Email for Legal &amp; Grievances:</strong> <a href={`mailto:${storeConfig.email}`} className="text-primary font-medium hover:underline">{storeConfig.email}</a></p>
              <p><strong>Helpline:</strong> {storeConfig.phone || "+91 9898422309"}</p>
              <p className="pt-2 text-[11px] text-muted-foreground border-t border-border">
                *We acknowledge grievance complaints within 48 hours and resolve them within 30 days of receipt.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
