"use client";

import { useState } from "react";
import { XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { formatPrice, getFirebaseAuth } from "@/lib/firebase";
import { CANCEL_REASONS, canCustomerCancel } from "@/lib/orders";
import type { Order } from "@/lib/types";

/**
 * "Cancel order" for the customer's own order, offered only until it is
 * packed. The server checks the same rule again, so a stale screen cannot
 * cancel a parcel that has already been packed.
 */
export function CustomerCancelOrder({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(CANCEL_REASONS[0]);
  const [busy, setBusy] = useState(false);

  if (!canCustomerCancel(order.order_status)) return null;
  const paidOnline = order.payment_status === "paid";

  const cancel = async () => {
    setBusy(true);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const response = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ orderId: order.id, reason }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; refundDue?: number };
      if (!data.ok) {
        toast.error(data.error || "Could not cancel the order. Please contact us.");
        return;
      }
      toast.success(
        data.refundDue
          ? `Order cancelled. ${formatPrice(data.refundDue)} will be refunded to your original payment method within 5–7 working days.`
          : "Order cancelled. You will get a confirmation email.",
      );
      setOpen(false);
    } catch {
      toast.error("Could not reach the server. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <XCircle className="h-3.5 w-3.5" /> Cancel order
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Cancel {order.order_number}?</DialogTitle>
            <DialogDescription>
              {paidOnline
                ? `You paid ${formatPrice(order.total)} online. The full amount is refunded to your original payment method within 5–7 working days.`
                : "Nothing has been paid, so there is nothing to refund."}{" "}
              The whole order is cancelled. Orders can be cancelled until they are packed.
            </DialogDescription>
          </DialogHeader>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Why are you cancelling?</legend>
            {CANCEL_REASONS.map((option) => (
              <label key={option} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="cancel-reason"
                  value={option}
                  checked={reason === option}
                  onChange={() => setReason(option)}
                  className="accent-primary"
                />
                {option}
              </label>
            ))}
          </fieldset>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Keep my order
            </Button>
            <Button variant="destructive" onClick={cancel} disabled={busy}>
              {busy ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
