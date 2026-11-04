"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, PackageSearch, Search } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findOrderForTracking, formatPrice } from "@/lib/firebase";
import { ORDER_TIMELINE, statusLabel } from "@/lib/orders";
import type { OrderTracking } from "@/lib/types";

function TrackOrderInner() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") ?? "");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [result, setResult] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const lookup = useCallback(async (order: string, last4: string) => {
    setLoading(true);
    try {
      const tracking = await findOrderForTracking(order, last4);
      setResult(tracking);
      setSearched(true);
      if (!tracking) toast.error("No order found for those details");
    } catch (error) {
      console.error(error);
      toast.error("Could not look up that order right now");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const preset = searchParams.get("order");
    if (preset) {
      setOrderNumber(preset);
    }
  }, [searchParams]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderNumber.trim()) return toast.error("Enter your order number");
    if (phoneLast4.length !== 4) return toast.error("Enter the last 4 digits of your phone number");
    lookup(orderNumber, phoneLast4);
  };

  const currentIndex = result ? ORDER_TIMELINE.indexOf(result.order_status) : -1;
  const cancelled = result?.order_status === "cancelled";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage">Order tracking</p>
        <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">Where is my order?</h1>
        <p className="mt-3 text-muted-foreground">
          Enter your order number and the last 4 digits of the phone number used at checkout.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="order">Order number</Label>
            <Input
              id="order"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value.toUpperCase())}
              placeholder="RC-20260101-AB12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Last 4 digits of phone</Label>
            <Input
              id="phone"
              value={phoneLast4}
              onChange={(event) => setPhoneLast4(event.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="1234"
            />
          </div>
        </div>
        <Button type="submit" className="mt-4 w-full sm:w-auto" disabled={loading}>
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Looking up…</>
          ) : (
            <><Search className="mr-2 h-4 w-4" /> Track order</>
          )}
        </Button>
      </form>

      {searched && !result && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center">
          <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-medium">We couldn&apos;t find that order</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Double-check the order number and phone digits. If it still doesn&apos;t work, message us
            on the contact page and we will look it up manually.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/contact">Contact support</Link>
          </Button>
        </div>
      )}

      {result && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-medium">{result.order_number}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Placed {new Date(result.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
              </p>
            </div>
            <div className="text-right">
              <span className={`rounded-full px-3 py-1 text-xs ${statusLabel(result.order_status).className}`}>
                {statusLabel(result.order_status).label}
              </span>
              <p className="mt-1 text-sm font-semibold">{formatPrice(result.total)}</p>
            </div>
          </div>

          {cancelled ? (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
              This order was cancelled. If you were charged, a refund is issued to your original
              payment method.
            </div>
          ) : (
            <ol className="mt-8 space-y-6">
              {ORDER_TIMELINE.map((status, index) => {
                const done = index <= currentIndex;
                const event = result.status_history?.find((entry) => entry.status === status);
                return (
                  <li key={status} className="flex gap-4">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : <span className="text-xs">{index + 1}</span>}
                    </div>
                    <div className="pb-2">
                      <p className={`text-sm font-medium ${done ? "" : "text-muted-foreground"}`}>
                        {statusLabel(status).label}
                      </p>
                      {event?.at ? (
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Pending</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
            Need help with this order?{" "}
            <Link href="/contact" className="text-primary hover:underline">Contact us</Link> with your
            order number.
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Suspense
          fallback={
            <div className="flex justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <TrackOrderInner />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
