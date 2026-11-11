"use client";

import { Banknote, Clock, Lock, MapPin, RotateCcw, Store } from "lucide-react";

import { useStore } from "@/lib/store-context";
import { cn } from "@/lib/utils";

/**
 * "A real shop stands behind this site." Shows the physical store's address,
 * hours and GST registration. Details that are still the shipped placeholders
 * (not yet saved in Admin → Settings) are left out rather than shown as fact.
 */
export function StoreTrust({ className }: { className?: string }) {
  const store = useStore();
  const address = store.confirmed.address
    ? store.address.replace(/\s*\n\s*/g, ", ")
    : `${store.city}, ${store.state}`;

  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
          <Store className="h-4 w-4 text-sage" />
        </span>
        <div className="min-w-0 text-sm">
          <p className="font-medium">Sold by {store.storeName} — a real shop you can visit</p>
          <p className="mt-1 flex items-start gap-1.5 text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{address}</span>
          </p>
          {store.openingHours && (
            <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{store.openingHours}</span>
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {store.confirmed.gstin && (
              <span className="text-muted-foreground">
                GSTIN <span className="font-mono text-foreground">{store.gstin}</span>
              </span>
            )}
            {store.mapsLink && (
              <a
                href={store.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                View on Google Maps
              </a>
            )}
            <a href="/visit" className="font-medium text-primary underline-offset-4 hover:underline">
              Visit the store
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The three worries at the buy button: is paying safe, can I return it, can I pay later. */
export function BuyAssurance({ className }: { className?: string }) {
  const store = useStore();
  const items = [
    {
      icon: Lock,
      title: "Secure payment",
      detail: "UPI, cards & netbanking via Razorpay",
      show: store.razorpayEnabled,
    },
    {
      icon: Banknote,
      title: "Cash on delivery",
      detail: "Pay when it arrives",
      show: store.codAvailable,
    },
    {
      icon: RotateCcw,
      title: `${store.returnWindowDays}-day returns`,
      detail: "Easy exchange for size",
      show: true,
    },
  ].filter((item) => item.show);

  return (
    <ul className={cn("grid gap-2 sm:grid-cols-3", className)}>
      {items.map(({ icon: Icon, title, detail }) => (
        <li key={title} className="flex items-center gap-2.5 rounded-md bg-muted/50 p-3">
          <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
