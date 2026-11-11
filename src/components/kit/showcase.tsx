"use client";

import { useState } from "react";
import { Heart, Package, ShieldCheck, User } from "lucide-react";

import { AccountCard, AccountSection, ActivityRow } from "@/components/kit/account-card";
import { CouponReveal } from "@/components/kit/coupon-reveal";
import { CouponTicket } from "@/components/kit/coupon-ticket";
import { ImageDropzone } from "@/components/kit/image-dropzone";
import { OffersBanner } from "@/components/kit/offers-banner";
import { PageBreadcrumb } from "@/components/kit/page-breadcrumb";
import { ProductRailGallery } from "@/components/kit/product-rail-gallery";
import { SignInForm } from "@/components/kit/sign-in-form";
import { Spinner } from "@/components/kit/spinner";
import { ProgressSteps } from "@/components/kit/steps";
import { TagSearch } from "@/components/kit/tag-search";

const img = (id: string) => `https://images.unsplash.com/${id}?w=600&h=750&fit=crop`;

const RAIL = [
  { id: "p1", name: "Cotton Kurta Set", subtitle: "Macho · Ages 2–4", price: 849, image: img("photo-1518831959646-742c3a14ebf7"), href: "/products/p1" },
  { id: "p2", name: "Denim Dungaree", subtitle: "James & Harper · Ages 4–6", price: 1199, image: img("photo-1522771930-78848d9293e8"), href: "/products/p2" },
  { id: "p3", name: "Festive Lehenga", subtitle: "Hamper · Ages 6–8", price: 2499, image: img("photo-1503919545889-aef636e10ad4"), href: "/products/p3" },
  { id: "p4", name: "Knit Cardigan", subtitle: "Essa · Ages 0–2", price: 699, image: img("photo-1519238263530-99bdd11df2ea"), href: "/products/p4" },
  { id: "p5", name: "Play Pyjama Set", subtitle: "Comfort · Ages 2–6", price: 549, image: img("photo-1514090458221-65bb69cf63e6"), href: "/products/p5" },
];

const TAGS = ["Macho", "James & Harper", "Hamper", "Essa", "Lux Lyra", "Newborn", "Toddlers", "Kids", "Festive", "Everyday", "Boys", "Girls", "Cotton", "Winter"];

function Block({ n, title, note, children }: { n: number; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-8">
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Reference {n}
        </p>
        <h2 className="font-serif text-xl text-foreground">{title}</h2>
        {note ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{note}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function KitShowcase() {
  const [step, setStep] = useState(1);
  const [tags, setTags] = useState<string[]>(["Kids", "Festive"]);
  const [images, setImages] = useState<string[]>([]);
  const [applied, setApplied] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-5 py-10">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Conversion kit</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every reference rebuilt on our tokens before it touches the store. Sage replaces blue,
          cream replaces black, dusty rose replaces red. No component claims a discount or a rating
          that the database cannot prove.
        </p>
      </header>

      <Block n={1} title="Progress steps" note="Checkout flow and order tracking. Click a step.">
        <ProgressSteps
          items={[
            { title: "Bag", description: "Review items" },
            { title: "Details", description: "Address" },
            { title: "Payment", description: "COD or online" },
            { title: "Done", description: "Confirmation" },
          ]}
          current={step}
          onStepChange={setStep}
        />
        <div className="mt-6">
          <ProgressSteps
            items={[{ title: "Placed" }, { title: "Confirmed" }, { title: "Shipped" }, { title: "Delivered" }]}
            current={2}
            readOnly
          />
        </div>
      </Block>

      <Block n={2} title="Sign-in form" note="Admin login. Google is real; Apple and GitHub are omitted because no provider exists.">
        <SignInForm
          title="Store admin"
          subtitle="Sign in to manage the catalogue and orders."
          onSubmit={() => undefined}
          onGoogle={() => undefined}
        />
      </Block>

      <Block n={3} title="Image dropzone" note="Compresses to WebP, names by product, hands you the file for public/resources/…">
        <ImageDropzone
          value={images}
          onChange={setImages}
          folder="resources/products/macho/cotton-kurta-set"
          name="Cotton Kurta Set"
        />
      </Block>

      <Block n={4} title="Tag search" note="Our own vocabulary: brands, collections, age bands, fabric.">
        <TagSearch value={tags} onChange={setTags} suggestions={TAGS} />
      </Block>

      <Block n={5} title="8-dot spinner" note="Route transitions, fetches and button states.">
        <div className="flex items-center gap-8">
          <Spinner size={18} />
          <Spinner size={28} />
          <Spinner size={44} />
        </div>
      </Block>

      <Block n={6} title="Account settings card" note="Tabs are real sections; activity rows are real events.">
        <AccountCard
          tabs={[
            { id: "overview", label: "Overview", icon: User },
            { id: "orders", label: "Orders", icon: Package },
            { id: "saved", label: "Saved items", icon: Heart },
            { id: "security", label: "Security", icon: ShieldCheck },
          ]}
          active={tab}
          onSelect={setTab}
        >
          <AccountSection title="Recent activity" description="Last 30 days">
            <div className="flex flex-col">
              <ActivityRow icon={Package} title="Order RC-20261104-GBJW placed" meta="2 days ago · ₹1,348" href="#" />
              <ActivityRow icon={Heart} title="Saved Cotton Kurta Set" meta="4 days ago" />
              <ActivityRow icon={ShieldCheck} title="Signed in with Google" meta="1 week ago" />
            </div>
          </AccountSection>
        </AccountCard>
      </Block>

      <Block n={7} title="Tear-off coupon tickets" note="Tear the stub to apply the code.">
        <div className="flex max-w-xl flex-col gap-3">
          <CouponTicket
            code="WELCOME10"
            title="10% off your first order"
            subtitle="Use WELCOME10 · min ₹999"
            applied={applied === "WELCOME10"}
            onApply={setApplied}
          />
          <CouponTicket code="FESTIVE15" title="Flat 15% off festive wear" subtitle="Use FESTIVE15" tone="ink" applied={applied === "FESTIVE15"} onApply={setApplied} />
          <CouponTicket code="EXPIRED20" title="20% off (ended)" subtitle="This offer has ended" tone="rose" expired />
        </div>
      </Block>

      <Block n={8} title="Peel-to-reveal code" note="Peel, then tap the code to copy.">
        <CouponReveal code="WELCOME10" />
      </Block>

      <Block n={9} title="Breadcrumb" note="Real links on ancestors; current page at full ink.">
        <PageBreadcrumb items={[{ label: "Products", href: "/products" }, { label: "Macho", href: "/brands/macho" }, { label: "Cotton Kurta Set" }]} />
      </Block>

      <Block n={10} title="Offers banner" note="Discount badges appear only where a real price drop exists.">
        <OffersBanner
          title="Flat 15% off festive wear"
          description="Handpicked ethnic sets for the season."
          code="FESTIVE15"
          products={[
            { ...RAIL[2], mrp: 2999 },
            { ...RAIL[0] },
            { ...RAIL[1], mrp: 1499 },
            { ...RAIL[3] },
          ]}
        />
      </Block>

      <Block n={11} title="Product rail gallery" note="Our 3D stand-in: garments hang in perspective and turn to face you. Click one.">
        <ProductRailGallery products={RAIL} />
      </Block>
    </div>
  );
}
