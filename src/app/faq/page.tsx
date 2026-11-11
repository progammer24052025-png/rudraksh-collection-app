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
    "Answers about ordering, sizing, shipping, cash on delivery, returns and exchanges at Rudraksh Collection.",
};

const SECTIONS: Array<{ title: string; items: Array<{ q: string; a: string }> }> = [
  {
    title: "Ordering",
    items: [
      {
        q: "How do I place an order?",
        a: "Add items to your bag, open the cart and continue to checkout. Enter your delivery address, choose Cash on Delivery (or online payment when enabled) and confirm. You will see an order number on the confirmation screen — save it to track your parcel.",
      },
      {
        q: "Do I need an account to order?",
        a: "No. You can check out as a guest. Signing in with your mobile number or Google account lets you see order history, save addresses and reorder faster.",
      },
      {
        q: "Can I change or cancel my order?",
        a: "Yes, as long as the order has not been packed. Contact us with your order number as soon as possible and we will update or cancel it for you.",
      },
      {
        q: "How will I know my order is confirmed?",
        a: "Your order appears in your account with the status “Placed”. Our team confirms it by phone or WhatsApp, and the status changes to “Confirmed”, then “Packed” and “Shipped”.",
      },
    ],
  },
  {
    title: "Sizing & products",
    items: [
      {
        q: "How do I choose the right size?",
        a: "Every product page lists the available sizes. Children's wear is sized by age band (for example 4–5Y) and by months for babies. If your child is between sizes, we recommend the larger size for growing room — or message us and we will help you pick.",
      },
      {
        q: "Will the colour match the photos?",
        a: "We photograph products in natural light, but screens vary. Slight differences in shade are normal and are not considered a defect.",
      },
      {
        q: "Are the products original branded items?",
        a: "Yes. We stock only genuine products from the brands listed on our Brands page.",
      },
    ],
  },
  {
    title: "Payment",
    items: [
      {
        q: "What payment methods do you accept?",
        a: storeConfig.codAvailable
          ? "Cash on Delivery is available across India. Online payment (UPI, cards, net banking) is available when enabled at checkout."
          : "Online payment via UPI, cards and net banking.",
      },
      {
        q: "Is Cash on Delivery free?",
        a: `There is no extra COD handling fee. Standard delivery charges still apply below ₹${storeConfig.freeShippingThreshold}.`,
      },
      {
        q: "Do you offer discounts or coupons?",
        a: "Seasonal offers are announced on the homepage and our Instagram. Prices shown on the site already include any active discount.",
      },
    ],
  },
  {
    title: "Shipping",
    items: [
      {
        q: "How long does delivery take?",
        a: `Orders are dispatched in ${storeConfig.dispatchDays} and usually delivered in ${storeConfig.deliveryDays}. Local deliveries in Vadodara are often much faster.`,
      },
      {
        q: "What are the delivery charges?",
        a: `Delivery is free on orders of ₹${storeConfig.freeShippingThreshold} or more. Below that, the charge depends on how far your PIN code is from our Vadodara store. Enter your PIN code on any product page to see it; it is also shown at checkout before you pay.`,
      },
      {
        q: "Can I track my parcel?",
        a: "Yes. Use the Track Order page with your order number and the last 4 digits of the phone number used at checkout.",
      },
    ],
  },
  {
    title: "Returns & exchanges",
    items: [
      {
        q: "What is your return policy?",
        a: `Unused items with tags intact can be returned within ${storeConfig.returnWindowDays} days of delivery. Innerwear, socks and other hygiene-sensitive items cannot be returned.`,
      },
      {
        q: "Can I exchange for a different size?",
        a: `Yes — size exchanges are free within ${storeConfig.returnWindowDays} days, subject to stock. Contact us with your order number to arrange it.`,
      },
      {
        q: "When will I get my refund?",
        a: "Once the returned item reaches us and passes inspection, refunds are processed within 5–7 business days to the original payment method, or by bank transfer for COD orders.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main id="main">
        <section className="bg-cream py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage-ink">Help Centre</p>
            <h1 className="mt-4 font-serif text-4xl font-medium sm:text-5xl">Frequently asked questions</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything about ordering, sizing, delivery and returns.
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
