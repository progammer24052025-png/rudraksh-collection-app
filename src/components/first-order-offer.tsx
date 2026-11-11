"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Gift, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { readCoupons, readValue } from "@/lib/firebase";
import { writePendingCoupon } from "@/lib/pending-coupon";
import { isCouponLive } from "@/lib/pricing";
import { formatPrice } from "@/lib/store-data";
import type { Coupon } from "@/lib/types";

const DISMISSED_KEY = "rudraksh-welcome-offer-dismissed";
/** A coupon is treated as the welcome offer when its code starts with one of these. */
const WELCOME_PREFIXES = ["WELCOME", "FIRST", "NEW"];
const HIDDEN_ON = ["/admin", "/checkout", "/invoice"];
const SHOW_AFTER_MS = 6000;

const describe = (coupon: Coupon) =>
  coupon.type === "percent" ? `${coupon.value}% off` : `${formatPrice(coupon.value)} off`;

/**
 * A one-time welcome offer for people who have not ordered yet.
 *
 * It only appears when the store has a live coupon whose code starts with
 * WELCOME, FIRST or NEW (created in Admin → Coupons) — no coupon, no banner.
 * It waits a few seconds so it never blocks the first look at the page, shows
 * once, and stays gone after it is closed.
 */
export function FirstOrderOffer() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [visible, setVisible] = useState(false);
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (loading) return;
    try {
      if (window.localStorage.getItem(DISMISSED_KEY)) return;
    } catch {
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    (async () => {
      // Someone who has already ordered is not a first-time customer.
      if (uid) {
        const orders = await readValue<Record<string, unknown>>(["ordersByUser", uid]);
        if (cancelled || (orders && Object.keys(orders).length > 0)) return;
      }
      const coupons = await readCoupons().catch(() => [] as Coupon[]);
      if (cancelled) return;
      const welcome = coupons.find(
        (entry) =>
          entry?.code &&
          isCouponLive(entry) &&
          WELCOME_PREFIXES.some((prefix) => entry.code.toUpperCase().startsWith(prefix)),
      );
      if (!welcome) return;
      setCoupon(welcome);
      timer = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [uid, loading]);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* storage may be disabled */
    }
  };

  if (!coupon || !visible || HIDDEN_ON.some((path) => pathname?.startsWith(path))) return null;

  const use = () => {
    writePendingCoupon(coupon.code);
    toast.success(`${coupon.code} saved — it will be applied at checkout`);
    dismiss();
  };

  return (
    <aside
      aria-label="Welcome offer"
      className="fixed bottom-24 left-4 right-4 z-30 mx-auto max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg sm:bottom-6 sm:left-6 sm:right-auto sm:mx-0"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close offer"
        className="absolute right-2 top-2 rounded p-1.5 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
          <Gift className="h-4 w-4 text-rose" />
        </span>
        <div>
          <p className="text-sm font-medium">
            {describe(coupon)} your first order
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Use code <span className="font-mono font-semibold text-foreground">{coupon.code}</span>
            {coupon.min_order > 0 ? ` on orders above ${formatPrice(coupon.min_order)}` : ""}.
          </p>
          <Button size="sm" className="mt-3" onClick={use}>
            Use this code
          </Button>
        </div>
      </div>
    </aside>
  );
}
