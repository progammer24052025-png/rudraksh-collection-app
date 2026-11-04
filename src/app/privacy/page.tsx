import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { storeConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Rudraksh Collection collects, uses and protects your personal information, including our use of Firebase Authentication and Realtime Database.",
};

const LAST_UPDATED = "4 November 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage">Legal</p>
        <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-neutral mt-10 max-w-none text-muted-foreground">
          <p>
            {storeConfig.legalName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) runs this website and online
            store. This policy explains what personal information we collect, why we collect it, how we
            store it and the choices you have. It applies to everyone who visits or shops with us.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">1. Information we collect</h2>
          <ul>
            <li>
              <strong>Account information.</strong> When you sign in we receive your mobile number (via
              SMS one-time password), or your name, email address and profile photo if you sign in with
              Google. We never see or store your Google password.
            </li>
            <li>
              <strong>Order information.</strong> Name, phone number, optional email address, delivery
              address, the items you ordered, order value and payment method.
            </li>
            <li>
              <strong>Saved details.</strong> Addresses you choose to save in your account and items you
              add to your wishlist.
            </li>
            <li>
              <strong>Messages.</strong> Anything you send us through the contact form, email or
              WhatsApp.
            </li>
            <li>
              <strong>Technical information.</strong> Basic device and browser information needed to keep
              the site working and secure.
            </li>
          </ul>
          <p>
            We do not collect payment card numbers. Card and UPI details, when online payment is used,
            are handled entirely by our payment provider.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">2. How we use your information</h2>
          <ul>
            <li>To create and secure your account and verify your mobile number.</li>
            <li>To pack, deliver and support your orders, and to contact you about them.</li>
            <li>To process returns, exchanges and refunds.</li>
            <li>To answer your questions and improve our products and website.</li>
            <li>To prevent fraud, abuse and misuse of the store.</li>
            <li>To meet our legal, tax and accounting obligations.</li>
          </ul>
          <p>
            We do not sell your personal information, and we do not use your data for third-party
            advertising.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">3. Who we share it with</h2>
          <p>We share only what is necessary, and only with:</p>
          <ul>
            <li><strong>Delivery partners</strong> — your name, address and phone number, to deliver your parcel.</li>
            <li><strong>Payment providers</strong> — to process online payments when that option is enabled.</li>
            <li><strong>Service providers</strong> — such as our hosting and authentication providers, who process data on our behalf under contract.</li>
            <li><strong>Authorities</strong> — where we are legally required to disclose information.</li>
          </ul>

          <h2 className="font-serif text-xl font-medium text-foreground">4. Where your data is stored</h2>
          <p>
            Account and order data is stored in Google Firebase (Firebase Authentication and Firebase
            Realtime Database). Data may be processed on servers located outside India. We choose
            providers that apply industry-standard security controls, and we limit access to your data
            to people who need it to serve you.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">5. How we protect your data</h2>
          <p>
            Access to the store database is restricted by security rules so that customers can read only
            their own profile and orders, while catalogue information remains public. Administrative
            access requires a verified staff account. Traffic to this site is encrypted with HTTPS.
            No system is completely secure, so we cannot promise absolute security — but we work to keep
            your information safe and to fix problems quickly.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">6. Children&apos;s privacy</h2>
          <p>
            Our store sells clothing for children, but accounts are intended for adults — parents,
            guardians and other adult shoppers. We do not knowingly create accounts for, or collect
            personal information directly from, children under 18. If you believe a child has provided
            us information, contact us and we will delete it.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">7. Cookies and local storage</h2>
          <p>
            We use your browser&apos;s local storage to remember your cart and wishlist between visits,
            and we use a secure session for sign-in. These are essential to how the store works. We do
            not use advertising or cross-site tracking cookies. You can clear this data at any time from
            your browser settings; doing so will empty your cart.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">8. How long we keep data</h2>
          <p>
            We keep order records for as long as needed to support you and to satisfy tax and accounting
            requirements (currently up to 8 years). Account profiles are kept until you ask us to delete
            them. Contact messages are kept for up to two years.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">9. Your rights</h2>
          <p>You can ask us to:</p>
          <ul>
            <li>Tell you what personal information we hold about you.</li>
            <li>Correct information that is inaccurate.</li>
            <li>Delete your account and personal information, where we are not legally required to keep it.</li>
            <li>Stop sending you non-essential messages.</li>
          </ul>
          <p>
            To make a request, email{" "}
            <a href={`mailto:${storeConfig.email}`} className="text-primary hover:underline">
              {storeConfig.email}
            </a>{" "}
            from the address or phone number linked to your account. We respond within 30 days.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">10. Changes to this policy</h2>
          <p>
            We may update this policy as the store grows. The &ldquo;last updated&rdquo; date at the top
            always shows the current version. Material changes will be announced on the website.
          </p>

          <h2 className="font-serif text-xl font-medium text-foreground">11. Contact</h2>
          <p>
            Questions about privacy? Write to{" "}
            <a href={`mailto:${storeConfig.email}`} className="text-primary hover:underline">
              {storeConfig.email}
            </a>{" "}
            or use our <Link href="/contact" className="text-primary hover:underline">contact form</Link>.
            Our store is located in {storeConfig.city}, {storeConfig.state}, India.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
