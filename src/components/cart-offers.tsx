"use client";

import { useEffect, useMemo, useState } from "react";
import { Tag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readCoupons } from "@/lib/firebase";
import { readPendingCoupon, writePendingCoupon } from "@/lib/pending-coupon";
import { couponDiscount, isCouponLive, validateCoupon } from "@/lib/pricing";
import { formatPrice } from "@/lib/store-data";
import type { Coupon } from "@/lib/types";

import { Spinner } from "@/components/ui/spinner";
/**
 * Coupons in the cart: a code box, plus the best live offer for this bag
 * suggested up front so nobody has to leave the site hunting for a code.
 *
 * The saving shown is an estimate. Checkout confirms it (including the
 * one-use-per-customer rule), and the parent is told which coupon is chosen so
 * it can show the estimated total.
 */
export function CartOffers({
  subtotal,
  onChange,
}: {
  subtotal: number;
  onChange: (coupon: Coupon | null) => void;
}) {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [selectedCode, setSelectedCode] = useState("");
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCode(readPendingCoupon());
    let cancelled = false;
    readCoupons()
      .then((list) => {
        if (!cancelled) setCoupons(list.filter((coupon) => coupon && coupon.code));
      })
      .catch(() => {
        if (!cancelled) setCoupons([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const live = useMemo(() => (coupons ?? []).filter((coupon) => isCouponLive(coupon)), [coupons]);

  const selected = useMemo(
    () => live.find((coupon) => coupon.code.toUpperCase() === selectedCode) ?? null,
    [live, selectedCode],
  );
  const selectedValid = selected ? validateCoupon(selected, subtotal) : null;
  const applied = selected && selectedValid?.ok ? selected : null;

  useEffect(() => {
    onChange(applied);
  }, [applied, onChange]);

  // The offer that saves the most on this bag right now.
  const best = useMemo(() => {
    const usable = live
      .filter((coupon) => (coupon.min_order ?? 0) <= subtotal)
      .map((coupon) => ({ coupon, saving: couponDiscount(coupon, subtotal) }))
      .filter((entry) => entry.saving > 0)
      .sort((a, b) => b.saving - a.saving);
    return usable[0] ?? null;
  }, [live, subtotal]);

  // The nearest offer the bag does not qualify for yet.
  const nextUp = useMemo(() => {
    const locked = live
      .filter((coupon) => (coupon.min_order ?? 0) > subtotal)
      .sort((a, b) => (a.min_order ?? 0) - (b.min_order ?? 0));
    return locked[0] ?? null;
  }, [live, subtotal]);

  const choose = (code: string) => {
    const clean = code.trim().toUpperCase();
    setSelectedCode(clean);
    writePendingCoupon(clean || null);
    setMessage(null);
    setInput("");
  };

  const applyTyped = () => {
    const code = input.trim().toUpperCase();
    if (!code) return;
    const match = (coupons ?? []).find((coupon) => coupon.code.toUpperCase() === code) ?? null;
    const check = validateCoupon(match, subtotal);
    if (!match || !check.ok) {
      setMessage(check.ok ? "That code does not exist." : check.reason);
      return;
    }
    choose(code);
  };

  if (coupons === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner className="h-3.5 w-3.5" /> Checking offers…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applied ? (
        <div className="flex items-center justify-between rounded-lg bg-sage/10 px-3 py-2 text-sm">
          <span className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-sage-ink" />
            <span>
              <span className="font-mono text-xs font-semibold">{applied.code}</span> added — saves{" "}
              {formatPrice(couponDiscount(applied, subtotal))}
            </span>
          </span>
          <button
            type="button"
            onClick={() => choose("")}
            aria-label={`Remove coupon ${applied.code}`}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyTyped();
                }
              }}
              placeholder="Coupon code"
              aria-label="Coupon code"
              className="font-mono"
            />
            <Button type="button" variant="outline" onClick={applyTyped} disabled={!input.trim()}>
              Apply
            </Button>
          </div>
          {message && <p className="text-xs text-destructive">{message}</p>}
          {selected && selectedValid && !selectedValid.ok && (
            <p className="text-xs text-muted-foreground">
              <span className="font-mono font-semibold">{selected.code}</span>: {selectedValid.reason}
            </p>
          )}
          {best && (
            <button
              type="button"
              onClick={() => choose(best.coupon.code)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-dashed border-sage/60 bg-sage/5 px-3 py-2 text-left text-sm transition-colors hover:bg-sage/10"
            >
              <span>
                <span className="block text-xs text-muted-foreground">Best offer for this bag</span>
                <span className="font-mono text-xs font-semibold">{best.coupon.code}</span> — save{" "}
                {formatPrice(best.saving)}
              </span>
              <span className="shrink-0 text-xs font-semibold text-primary">Apply</span>
            </button>
          )}
        </>
      )}

      {!applied && !best && nextUp && (
        <p className="text-xs text-muted-foreground">
          Add {formatPrice(Math.ceil((nextUp.min_order ?? 0) - subtotal))} more to use{" "}
          <span className="font-mono font-semibold">{nextUp.code}</span>
          {nextUp.title ? ` (${nextUp.title})` : ""}.
        </p>
      )}
    </div>
  );
}
