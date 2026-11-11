"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Ticket } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/kit/page-breadcrumb";
import { CouponTicket } from "@/components/kit/coupon-ticket";
import { CouponRevealButton } from "@/components/ui/button-26";
import { PageSpinner } from "@/components/kit/spinner";
import { readCoupons, formatPrice } from "@/lib/firebase";
import { isCouponLive } from "@/lib/pricing";
import type { Coupon } from "@/lib/types";

function describe(coupon: Coupon): string {
  const off =
    coupon.type === "percent"
      ? `${coupon.value}% off`
      : `${formatPrice(coupon.value)} off`;
  return coupon.min_order > 0 ? `${off} on orders above ${formatPrice(coupon.min_order)}` : off;
}

export default function OffersPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    readCoupons()
      .then((rows) => {
        if (active) setCoupons(rows);
      })
      .catch(() => {
        if (active) setCoupons([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const live = useMemo(() => coupons.filter((coupon) => isCouponLive(coupon)), [coupons]);
  const featured = live[0];
  const rest = live.slice(1);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${code} copied — paste it at checkout`);
    } catch {
      toast.error(`Use this code at checkout: ${code}`);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageBreadcrumb items={[{ label: "Offers" }]} className="-mt-2" />

        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-sage">Current offers</p>
          <h1 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">Save on your next order</h1>
          <p className="mt-3 text-muted-foreground">
            One code per order, applied to the discounted price — sale items included. Codes are checked
            against the live list, so whatever you see here is what the checkout will accept.
          </p>
        </div>

        {loading ? (
          <PageSpinner label="Loading offers" />
        ) : live.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <Ticket className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 font-medium">No offers running right now</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New codes appear here the moment they go live — nothing to miss by checking back.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/products">Browse the collection</Link>
            </Button>
          </div>
        ) : (
          <>
            {featured ? (
              <div className="mb-10 grid gap-6 rounded-2xl border border-border bg-card p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-sage">Featured</p>
                  <h2 className="mt-2 font-serif text-2xl font-medium">{featured.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{describe(featured)}</p>
                  {featured.ends_at ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ends {new Date(featured.ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                    </p>
                  ) : null}
                </div>
                <CouponRevealButton
                  frontText="Peel to reveal your code"
                  backText="Here's your code"
                  couponCode={featured.code}
                  onReveal={() => copyCode(featured.code)}
                  className="cursor-pointer"
                />
              </div>
            ) : null}

            {rest.length > 0 ? (
              <>
                <h2 className="mb-4 font-serif text-xl font-medium">More codes</h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((coupon) => (
                    <CouponTicket
                      key={coupon.code}
                      code={coupon.code}
                      title={coupon.title}
                      subtitle={describe(coupon)}
                      onApply={copyCode}
                    />
                  ))}
                </div>
              </>
            ) : null}

            <div className="mt-10 flex flex-wrap items-center gap-3 rounded-xl bg-muted/60 px-5 py-4 text-sm text-muted-foreground">
              <span>Codes never stack, and they do not apply to shipping.</span>
              <Link href="/products" className="ml-auto inline-flex items-center gap-1 font-medium text-foreground">
                Start shopping <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
