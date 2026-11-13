import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { storeConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers about ordering, signing in, cancelling, payment, delivery, sizing, returns and exchanges at Rudraksh Collection, Vadodara.",
};

const SECTIONS: Array<{ title: string; items: Array<{ q: string; a: string }> }> = [
  {
    title: "Ordering & your account",
    items: [
      {
        q: "How do I place an order?",
        a: "Add items to your bag and go to checkout. Sign in, enter your delivery address, choose how to pay and confirm. You get an order number on screen and by email (if you gave one) — your order also appears under My Account → Orders.",
      },
      {
        q: "Do I need an account to order?",
        a: "Yes. Signing in takes a few seconds with your mobile number (a one-time code by SMS) or your Google account — there is no password to remember. It keeps your orders, addresses and coupons safe, and lets you track and cancel orders yourself.",
      },
      {
        q: "How will I know my order is confirmed?",
        a: "Orders paid online are confirmed straight away. Cash-on-delivery orders are confirmed by our team, usually within a few hours during store hours. You are emailed at each step — confirmed, packed, shipped and delivered — and can see the status any time under My Account → Orders.",
      },
      {
        q: "Can I change my order after placing it?",
        a: "We cannot edit items, sizes or the address on an order once it is placed. If it has not been packed yet, cancel it from My Account → Orders and place a new one — or message us on WhatsApp straight away and we will help.",
      },
    ],
  },
  {
    title: "Cancellations",
    items: [
      {
        q: "Can I cancel my order?",
        a: "Yes, until it is packed. Open My Account → Orders and tap “Cancel order” on the order. Once an order has been packed it can no longer be cancelled — you can return it after delivery instead.",
      },
      {
        q: "I paid online. When do I get my money back after cancelling?",
        a: "The full amount, including any delivery charge, is refunded to your original payment method (UPI, card or net banking). It usually reaches you within 5–7 working days, depending on your bank.",
      },
      {
        q: "Can the store cancel my order?",
        a: "Rarely — for example if an item turns out to be out of stock or there is an obvious pricing error. If that happens we email you, and any amount you paid for the cancelled items is refunded in full.",
      },
    ],
  },
  {
    title: "Payment & offers",
    items: [
      {
        q: "What payment methods do you accept?",
        a: storeConfig.codAvailable
          ? "Cash on delivery, and online payment by UPI, debit or credit card, net banking and wallets through Razorpay. We never see or store your card details."
          : "Online payment by UPI, debit or credit card, net banking and wallets through Razorpay. We never see or store your card details.",
      },
      {
        q: "Is there an extra charge for cash on delivery?",
        a: "No. You pay only the order total shown at checkout, which already includes any delivery charge.",
      },
      {
        q: "How do coupon codes work?",
        a: "Current codes are on the Offers page, and the best one for your bag is suggested in the cart. Enter a code in the cart or at checkout — the discount is shown before you pay. Each code can be used once per customer, and some need a minimum order value.",
      },
      {
        q: "My payment went through but I did not get an order number. What now?",
        a: "Do not pay again. Your payment is recorded even if the page closed, and the order normally appears in My Account → Orders within a minute. If it does not, contact us with the payment reference and we will sort it out.",
      },
    ],
  },
  {
    title: "Delivery & tracking",
    items: [
      {
        q: "How long does delivery take?",
        a: `Orders are dispatched in ${storeConfig.dispatchDays} and usually arrive in ${storeConfig.deliveryDays}. Deliveries within Vadodara are often faster. Each product page shows an estimated delivery date.`,
      },
      {
        q: "What are the delivery charges?",
        a: `Delivery is free on orders of ₹${storeConfig.freeShippingThreshold} or more. Below that, the charge depends on how far your PIN code is from our Vadodara store. Enter your PIN code on any product page to see it; it is also shown at checkout before you pay.`,
      },
      {
        q: "How can I track my order?",
        a: "Signed in, open My Account → Orders and tap “Track order”. You can also use the Track Order page with your order number and the last 4 digits of the phone number you gave at checkout. You are emailed whenever the status changes.",
      },
    ],
  },
  {
    title: "Sizing & products",
    items: [
      {
        q: "How do I choose the right size?",
        a: "Every product page has a size guide with Kids, Men and Women charts. Kids' wear is sized by age (for example 4–5Y) and by months for babies; men's and women's wear by S–3XL. If you are between sizes, choose the larger one — or message us on WhatsApp and we will help you pick.",
      },
      {
        q: "Will the colour match the photos?",
        a: "We photograph products in natural light, but screens differ. Slight differences in shade are normal and are not considered a defect.",
      },
      {
        q: "Are the products original branded items?",
        a: "Yes. We stock only genuine products from the brands listed on our Brands page.",
      },
      {
        q: "Are the reviews real?",
        a: "Yes. Only customers whose order of that item has been delivered can write a review, and every review is marked “Verified buyer”.",
      },
      {
        q: "Can I get told when something is back in stock?",
        a: "Yes. On a sold-out product, sign in and tap “Notify me” — we email you once when it is back.",
      },
    ],
  },
  {
    title: "Returns & exchanges",
    items: [
      {
        q: "What is your return policy?",
        a: `Unused items with their tags on can be returned within ${storeConfig.returnWindowDays} days of delivery. Innerwear, socks and other hygiene items cannot be returned. Contact us with your order number to start a return.`,
      },
      {
        q: "Can I exchange for a different size?",
        a: `Yes — size exchanges are free within ${storeConfig.returnWindowDays} days, subject to stock. Contact us to arrange a pickup, or bring the item to our Vadodara store.`,
      },
      {
        q: "When will I get my refund for a return?",
        a: "Once the item reaches us and passes a quick check (24–48 hours), we refund online payments to the original method within 5–7 working days. For cash-on-delivery orders we refund by UPI or bank transfer to details you give us. Delivery charges are refunded only if the return is due to our mistake or a defect.",
      },
    ],
  },
  {
    title: "Store, app & privacy",
    items: [
      {
        q: "Can I visit the store?",
        a: `Yes — we are at ${storeConfig.city}, near Khodiyar Nagar on New VIP Road. See the Visit Us page for the address, opening hours and directions. You can try sizes in the store before you buy.`,
      },
      {
        q: "Is there an app?",
        a: "Yes. On Android, open the site in Chrome and tap “Install app” (or the Install button at the bottom of the page). On iPhone, open it in Safari, tap Share and then “Add to Home Screen”. The app updates itself — there is nothing to download again.",
      },
      {
        q: "Will you send me marketing emails?",
        a: "We email you about your own orders, and — at most once a day — about new arrivals. You can switch new-arrival emails off under My Account → Profile, or with the unsubscribe link in any of those emails.",
      },
      {
        q: "Is my information safe?",
        a: "Yes. Payments go through Razorpay, so we never see your card details. Your address and phone number are used only to deliver your order, and only you and our team can see your orders. Our Privacy Policy has the details.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <script
        type="application/ld+json"
        // Lets search results show these answers directly. `<` is escaped.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: SECTIONS.flatMap((section) =>
              section.items.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            ),
          }).replace(/</g, "\\u003c"),
        }}
      />
      <main id="main">
        <section className="bg-cream py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage-ink">Help Centre</p>
            <h1 className="mt-4 font-serif text-4xl font-medium sm:text-5xl">Frequently asked questions</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything about ordering, cancelling, delivery, sizing and returns.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-3xl space-y-12 px-4 sm:px-6">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="font-serif text-2xl font-medium">{section.title}</h2>
                <Accordion type="single" collapsible className="mt-4 rounded-2xl border border-border bg-card px-5">
                  {section.items.map((item) => (
                    <AccordionItem key={item.q} value={item.q}>
                      <AccordionTrigger className="text-left text-sm font-medium">{item.q}</AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}

            <div className="rounded-2xl border border-border bg-muted/40 p-8 text-center">
              <h2 className="font-serif text-2xl font-medium">Still have a question?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Send us a message and we will get back to you within one working day.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button asChild><Link href="/contact">Contact us</Link></Button>
                <Button asChild variant="outline"><Link href="/track-order">Track an order</Link></Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
