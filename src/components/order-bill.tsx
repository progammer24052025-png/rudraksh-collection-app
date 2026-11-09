"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store-context";
import {
  billLines,
  documentTitle,
  hasReceipt,
  isOfflinePayment,
  money,
  paymentSummary,
  receiptLines,
  type BillOrder,
} from "@/lib/order-document";

/**
 * The bill — issued for every order, online or cash.
 *
 * The receipt block at the bottom is driven by `receiptLines()`, which returns
 * nothing for an offline order, so a cash-on-delivery bill can never read like
 * a payment confirmation. Printing uses the `.print-area` rule in globals.css.
 */
export function OrderBill({
  order,
  className = "",
  showPrintButton = true,
}: {
  order: BillOrder;
  className?: string;
  showPrintButton?: boolean;
}) {
  const store = useStore();
  const receipt = receiptLines(order);
  const items = order.items ?? [];
  const payment = paymentSummary(order);
  const issued = order.created_at ? new Date(order.created_at) : new Date();

  return (
    <div className={`print-area rounded-xl border border-border bg-white text-[#2D2A26] ${className}`}>
      <div className="p-6 sm:p-8">
        {/* Letterhead */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EAE3D9] pb-5">
          <div>
            <p className="font-serif text-xl tracking-wide">{store.name}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#C28585]">{store.tagline}</p>
            <div className="mt-3 space-y-0.5 text-xs leading-relaxed text-[#6B6560]">
              {store.address ? <p>{store.address}</p> : <p>{store.location}</p>}
              {store.phone ? <p>{store.phone}</p> : null}
              {store.email ? <p>{store.email}</p> : null}
              {store.gstin ? <p>GSTIN: {store.gstin}</p> : null}
            </div>
          </div>

          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#C28585]">{documentTitle()}</p>
            <p className="mt-1 font-mono text-sm font-medium">{order.order_number}</p>
            <p className="mt-1 text-xs text-[#6B6560]">
              {issued.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Parties */}
        <div className="grid gap-6 border-b border-[#EAE3D9] py-5 sm:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#C28585]">Billed to</p>
            <p className="mt-1.5 text-sm font-medium">{order.customer_name || "Guest"}</p>
            <div className="mt-1 space-y-0.5 text-xs leading-relaxed text-[#6B6560]">
              {order.address ? <p>{order.address}</p> : null}
              <p>{[order.city, order.state].filter(Boolean).join(", ")}</p>
              {order.pincode ? <p>PIN {order.pincode}</p> : null}
              {order.phone ? <p>{order.phone}</p> : null}
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#C28585]">{payment.label}</p>
            <p className="mt-1.5 text-sm font-medium">{payment.value}</p>
            {order.payment_status ? (
              <p className="mt-1 text-xs capitalize text-[#6B6560]">
                Payment status: {order.payment_status}
              </p>
            ) : null}
          </div>
        </div>

        {/* Items */}
        <table className="mt-5 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.14em] text-[#6B6560]">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 text-right font-medium">Rate</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 text-xs text-[#6B6560]">
                  No items on this bill.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const meta = [item.brand, item.size ? `Size ${item.size}` : "", item.color]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr key={`${item.name}-${index}`} className="border-t border-[#EAE3D9] align-top">
                    <td className="py-2.5 pr-3">
                      <span className="block">{item.name}</span>
                      {meta ? <span className="mt-0.5 block text-xs text-[#6B6560]">{meta}</span> : null}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{money(item.price)}</td>
                    <td className="py-2.5 text-right tabular-nums">{item.quantity}</td>
                    <td className="py-2.5 text-right tabular-nums">{money(item.price * item.quantity)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 ml-auto w-full max-w-xs border-t border-[#EAE3D9] pt-3">
          {billLines(order).map((line) => {
            const strong = line.label === "Total";
            return (
              <div key={line.label} className="flex items-baseline justify-between gap-3 py-1">
                <span
                  className={
                    strong
                      ? "text-sm font-semibold"
                      : `text-xs ${line.muted ? "text-[#6B6560]" : "text-[#2D2A26]"}`
                  }
                >
                  {line.label}
                </span>
                <span
                  className={
                    strong
                      ? "text-base font-semibold tabular-nums"
                      : "text-xs tabular-nums text-[#2D2A26]"
                  }
                >
                  {line.value}
                </span>
              </div>
            );
          })}
        </div>

        {/* Receipt — only for a settled online payment. Empty array for COD. */}
        {receipt.length > 0 ? (
          <div className="mt-6 rounded-lg border border-[#EAE3D9] bg-[#FAF7F2] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#C28585]">Payment receipt</p>
            <div className="mt-2 space-y-1">
              {receipt.map((line) => (
                <div key={line.label} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-[#6B6560]">{line.label}</span>
                  <span className="font-medium tabular-nums">{line.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : isOfflinePayment(order) ? (
          <p className="mt-6 rounded-lg bg-[#FAF7F2] p-4 text-xs leading-relaxed text-[#6B6560]">
            Payment is collected on delivery. This bill is not proof of payment — no receipt is issued
            for a cash on delivery order.
          </p>
        ) : null}

        <p className="mt-6 border-t border-[#EAE3D9] pt-4 text-[11px] leading-relaxed text-[#6B6560]">
          Returns accepted within {store.returnWindowDays} days. Keep this bill for any exchange or
          return. Questions? Reply to {store.email}.
        </p>
      </div>

      {showPrintButton ? (
        <div className="flex justify-end border-t border-[#EAE3D9] p-4 print:hidden">
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print / save as PDF
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** The bill in a modal — used from checkout, the account page and admin. */
export function BillDialog({
  order,
  open,
  onOpenChange,
}: {
  order: BillOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order ? `Bill ${order.order_number}` : "Bill"}
          </DialogTitle>
          <DialogDescription>
            {order
              ? hasReceipt(order)
                ? "Includes your payment receipt."
                : "Cash on delivery — the bill is issued now, payment is collected on delivery."
              : null}
          </DialogDescription>
        </DialogHeader>
        {order ? <OrderBill order={order} /> : null}
      </DialogContent>
    </Dialog>
  );
}
