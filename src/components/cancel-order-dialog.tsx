"use client";

import { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, getFirebaseAuth, updateOrderStatus } from "@/lib/firebase";
import type { Order } from "@/lib/types";

import { Spinner } from "@/components/ui/spinner";
/**
 * "Which items?" — shown whenever an order is being cancelled.
 *
 * Lists every item still on the order with a tick box, plus one box to select
 * them all. Ticking everything cancels the whole order; ticking some cancels
 * just those and the order carries on with the rest.
 */
export function CancelOrderDialog({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [busy, setBusy] = useState(false);

  // Each line keeps its position in the stored order, which is what the server
  // is told to cancel.
  const lines = useMemo(
    () =>
      (order?.items ?? [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item && !item.cancelled),
    [order],
  );

  useEffect(() => {
    // Opening the dialog means "cancel this order", so start with everything ticked.
    setSelected(new Set(lines.map(({ index }) => index)));
    setReason("");
    setRestock(true);
  }, [lines]);

  if (!order) return null;

  const allSelected = lines.length > 0 && selected.size === lines.length;
  const someSelected = selected.size > 0 && !allSelected;
  const selectedValue = lines
    .filter(({ index }) => selected.has(index))
    .reduce((sum, { item }) => sum + item.price * item.quantity, 0);
  const paid = order.payment_status === "paid";

  const toggle = (index: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(lines.map(({ index }) => index)));

  const submit = async () => {
    if (!selected.size) {
      toast.error("Tick at least one item to cancel");
      return;
    }
    setBusy(true);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const response = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderId: order.id,
          itemIndexes: Array.from(selected),
          reason: reason.trim() || undefined,
          restock,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        code?: string;
        error?: string;
        fullCancel?: boolean;
        cancelled?: number;
        refundDue?: number;
      };

      if (data.ok) {
        toast.success(
          (data.fullCancel
            ? `${order.order_number} cancelled`
            : `${data.cancelled} item(s) cancelled on ${order.order_number}`) +
            (data.refundDue ? ` — refund ${formatPrice(data.refundDue)} to the customer` : ""),
        );
        onClose();
        return;
      }

      // Without the server credentials, a whole-order cancellation can still be
      // recorded the old way; cancelling single items cannot (stock and totals
      // need the server).
      if (data.code === "not-configured" && allSelected) {
        await updateOrderStatus(order.id, "cancelled", reason.trim() ? { note: reason.trim() } : {});
        toast.success(`${order.order_number} cancelled. Stock was not adjusted — update it by hand.`);
        onClose();
        return;
      }
      toast.error(data.error || "Could not cancel. Please try again.");
    } catch {
      toast.error("Could not reach the server. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (!open && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Cancel items — {order.order_number}</DialogTitle>
          <DialogDescription>
            Tick what to cancel. Ticking everything cancels the whole order; otherwise the order
            continues with the remaining items.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border">
          <label className="flex cursor-pointer items-center gap-3 border-b border-border bg-muted/40 px-3 py-2.5 text-sm font-medium">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={toggleAll}
              aria-label="Select all items"
            />
            Select all items ({lines.length})
          </label>
          <ul className="divide-y divide-border">
            {lines.map(({ item, index }) => (
              <li key={index}>
                <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm">
                  <Checkbox
                    className="mt-0.5"
                    checked={selected.has(index)}
                    onCheckedChange={() => toggle(index)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[item.brand, item.size, item.color].filter(Boolean).join(" · ")} · Qty {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium">{formatPrice(item.price * item.quantity)}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <Textarea
            rows={2}
            maxLength={300}
            placeholder="Reason (optional) — shown in the order history and the customer's email"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox className="mt-0.5" checked={restock} onCheckedChange={(value) => setRestock(value === true)} />
            <span>
              Put these items back in stock
              <span className="block text-xs text-muted-foreground">
                Untick for damaged goods or anything that is not going back on the shelf.
              </span>
            </span>
          </label>
        </div>

        {selected.size > 0 && (
          <p className="rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
            {allSelected ? "The whole order will be cancelled." : `${selected.size} of ${lines.length} items will be cancelled.`}{" "}
            Items worth {formatPrice(selectedValue)}.{" "}
            {paid
              ? "This order is paid: the amount to refund is worked out and shown on the order, and you make the refund yourself (Razorpay dashboard, UPI or cash)."
              : "Nothing has been paid yet, so there is no refund."}{" "}
            The customer is emailed.
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Keep order
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy || selected.size === 0}>
            {busy ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {allSelected ? "Cancel whole order" : `Cancel ${selected.size} item${selected.size === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
