"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";

import { BrandLockup, BrandSeal, SealWatermark, StitchRule } from "@/components/kit/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { printElement } from "@/lib/print-document";
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
 * a payment confirmation. "Print / save as PDF" prints this sheet on its own
 * (see `printElement`), so the dialog around it never reaches the paper.
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
  const sheet = useRef<HTMLDivElement>(null);
  const receipt = receiptLines(order);
  const items = order.items ?? [];
  const payment = paymentSummary(order);
  const issued = order.created_at ? new Date(order.created_at) : new Date();
  const lines = billLines(order);
  const total = lines.find((line) => line.label === "Total");
  const pieces = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Placeholder contact and tax details from the static config are never printed.
  const storeLines = [
    store.confirmed.address && store.address ? store.address : store.location,
    store.confirmed.phone && store.phone ? store.phone : null,
    store.email || null,
    store.confirmed.gstin && store.gstin ? `GSTIN ${store.gstin}` : null,
  ].filter((line): line is string => Boolean(line));

  return (
    <div
      ref={sheet}
      className={`print-area relative overflow-hidden rounded-xl border border-[#EAE3D9] bg-white text-[#2D2A26] ${className}`}
    >
      <SealWatermark />
      <div className="h-1.5 w-full bg-[linear-gradient(90deg,#995C5C,#C28585_45%,#8B9A7D)]" />

      <div className="relative p-6 sm:p-9 print:p-7">
        {/* Letterhead */}
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <BrandLockup name={store.name} tagline={store.tagline} />
            <div className="mt-3 space-y-0.5 pl-[58px] text-[11px] leading-relaxed text-[#6B6560]">
              {storeLines.map((line) => (
                <p key={line} className="whitespace-pre-line">
                  {line}
                </p>
              ))}
            </div>
          </div>

          {/* Hang tag: the document's identity. */}
          <div className="relative rounded-lg border border-[#D9C9B6] bg-[#FAF7F2] px-5 pb-3 pt-5 text-right">
            <span
              aria-hidden
              className="absolute left-1/2 top-1.5 h-2 w-2 -translate-x-1/2 rounded-full border border-[#D9C9B6] bg-white"
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#995C5C]">{documentTitle()}</p>
            <p className="mt-1 font-mono text-sm font-semibold">{order.order_number}</p>
            <p className="mt-0.5 text-[11px] text-[#6B6560]">
              {issued.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        <StitchRule className="my-6 print:my-4" />

        {/* Parties */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#596650]">Billed to</p>
            <p className="mt-1.5 font-serif text-base">{order.customer_name || "Guest"}</p>
            <div className="mt-1 space-y-0.5 text-xs leading-relaxed text-[#6B6560]">
              {order.address ? <p>{order.address}</p> : null}
              <p>
                {[order.city, order.state].filter(Boolean).join(", ")}
                {order.pincode ? ` — ${order.pincode}` : ""}
              </p>
              {order.phone ? <p>{order.phone}</p> : null}
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#596650]">{payment.label}</p>
            <p className="mt-1.5 text-sm font-medium">{payment.value}</p>
            {order.payment_status ? (
              <span
                className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  order.payment_status === "paid" ? "bg-[#E6ECDF] text-[#3F4A37]" : "bg-[#F6EADF] text-[#7D4E2D]"
                }`}
              >
                {order.payment_status}
              </span>
            ) : null}
          </div>
        </div>

        {/* Items */}
        <table className="mt-7 print:mt-5 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#F5EFE6] text-[10px] uppercase tracking-[0.16em] text-[#6B6560]">
              <th className="rounded-l-md px-3 py-2 font-semibold">Item</th>
              <th className="px-3 py-2 text-right font-semibold">Rate</th>
              <th className="px-3 py-2 text-right font-semibold">Qty</th>
              <th className="rounded-r-md px-3 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-xs text-[#6B6560]">
                  No items on this bill.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const meta = [item.brand, item.size ? `Size ${item.size}` : "", item.color].filter(Boolean).join(" · ");
                return (
                  <tr key={`${item.name}-${index}`} className="break-inside-avoid border-b border-[#EFE8DE] align-top">
                    <td className="px-3 py-3">
                      <span className="block font-medium">{item.name}</span>
                      {meta ? <span className="mt-0.5 block text-[11px] text-[#6B6560]">{meta}</span> : null}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{money(item.price)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{item.quantity}</td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">{money(item.price * item.quantity)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Totals, on a hang tag */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <p className="text-[11px] leading-relaxed text-[#6B6560]">
            {pieces} {pieces === 1 ? "piece" : "pieces"} in this order
          </p>
          <div className="relative w-full max-w-xs break-inside-avoid rounded-xl border border-dashed border-[#C9A9A9] bg-[#FDFBF8] px-5 pb-4 pt-6">
            <span aria-hidden className="absolute left-5 top-2.5 h-2.5 w-2.5 rounded-full border border-[#C9A9A9] bg-white" />
            {lines
              .filter((line) => line.label !== "Total")
              .map((line) => (
                <div key={line.label} className="flex items-baseline justify-between gap-3 py-0.5 text-xs">
                  <span className={line.muted ? "text-[#6B6560]" : "text-[#2D2A26]"}>{line.label}</span>
                  <span className="tabular-nums">{line.value}</span>
                </div>
              ))}
            {total ? (
              <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-[#EAE3D9] pt-2">
                <span className="font-serif text-base">Total</span>
                <span className="text-lg font-semibold tabular-nums">{total.value}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Receipt — only for a settled online payment. Empty array for COD. */}
        {receipt.length > 0 ? (
          <div className="mt-6 break-inside-avoid rounded-lg border border-[#DCE3D4] bg-[#F4F7F0] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#596650]">Payment receipt</p>
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
            Payment is collected on delivery. This bill is not proof of payment — no receipt is issued for a
            cash on delivery order.
          </p>
        ) : null}

        {/* Sign-off */}
        <StitchRule className="mt-8 print:mt-5" colour="#8B9A7D" />
        <div className="mt-5 flex break-inside-avoid flex-wrap items-center justify-between gap-4">
          <div className="max-w-md">
            <p className="font-serif text-base italic text-[#995C5C]">Thank you for shopping with us.</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#6B6560]">
              Returns and size exchanges within {store.returnWindowDays} days of delivery — keep this bill and
              the tags. Questions? Write to {store.email}.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#6B6560]">
            <BrandSeal size={26} />
            {store.website || store.location}
          </div>
        </div>
      </div>

      {showPrintButton ? (
        <div data-print-hide className="relative flex justify-end border-t border-[#EAE3D9] p-4 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => printElement(sheet.current, `Bill ${order.order_number} - ${store.name}`)}
          >
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
          <DialogTitle>{order ? `Bill ${order.order_number}` : "Bill"}</DialogTitle>
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
