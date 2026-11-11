"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { readValue, removeValue, writeValue } from "@/lib/firebase";

type StockAlert = { email: string; at: string };

const isEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value);

/**
 * "Tell me when this is back." Saves the customer's request against the
 * product; when the store restocks it, the server emails everyone waiting
 * once and clears the list.
 */
export function NotifyWhenBack({ productId }: { productId: string }) {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const uid = user?.uid ?? null;

  useEffect(() => {
    setSubscribed(false);
    if (!uid) return;
    setEmail(user?.email ?? "");
    let cancelled = false;
    readValue<StockAlert>(["stockAlerts", productId, uid]).then((alert) => {
      if (!cancelled && alert?.email) {
        setSubscribed(true);
        setEmail(alert.email);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [productId, uid, user?.email]);

  if (loading) return null;

  if (!uid) {
    return (
      <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
        <BellRing className="mr-1.5 inline h-4 w-4" />
        <Link href="/account" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>{" "}
        to be emailed when this is back in stock.
      </p>
    );
  }

  const subscribe = async () => {
    const address = email.trim();
    if (!isEmail(address)) {
      toast.error("Enter a valid email address");
      return;
    }
    setBusy(true);
    try {
      await writeValue(["stockAlerts", productId, uid], {
        email: address,
        at: new Date().toISOString(),
      } satisfies StockAlert);
      setSubscribed(true);
      toast.success("We will email you when it is back");
    } catch {
      toast.error("Could not save that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    try {
      await removeValue(["stockAlerts", productId, uid]);
      setSubscribed(false);
    } catch {
      toast.error("Could not update that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (subscribed) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
        <span className="flex items-center gap-1.5">
          <Check className="h-4 w-4 text-sage-ink" /> We will email <strong>{email}</strong> when it is back.
        </span>
        <button
          type="button"
          onClick={unsubscribe}
          disabled={busy}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <BellRing className="h-4 w-4" /> Get an email when it is back in stock
      </p>
      <div className="mt-2 flex gap-2">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-label="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button onClick={subscribe} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Notify me"}
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">One email, only about this item.</p>
    </div>
  );
}
