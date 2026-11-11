"use client";

import React, { useRef } from "react";
import { Printer, X } from "lucide-react";

import { BrandLockup, BrandSeal, SealWatermark, StitchRule } from "@/components/kit/brand-mark";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/store-data";
import { amountInWords, STORE_SELLER_DETAILS, type SellerDetails } from "@/lib/invoice-utils";
import { printElement } from "@/lib/print-document";
import { useStore } from "@/lib/store-context";

export interface InvoiceItem {
  name: string;
  brand?: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number; // unit price
  image?: string;
}

export interface InvoiceData {
  orderNumber: string;
  invoiceNumber?: string;
  date: string | Date;
  customerName: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: InvoiceItem[];
  subtotal: number;
  discount?: number;
  couponCode?: string | null;
  tax?: number;
  shipping?: number;
  total: number;
  paymentMethod: "cod" | "razorpay" | string;
  paymentStatus: "paid" | "pending" | string;
  paymentId?: string | null;
}

interface TaxInvoiceProps {
  data: InvoiceData;
  onClose?: () => void;
  showPrintButton?: boolean;
}

const LABEL = "text-[10px] font-semibold uppercase tracking-[0.2em] text-[#596650]";
const rupees = (value: number) => value.toFixed(2);

export function TaxInvoice({ data, onClose, showPrintButton = true }: TaxInvoiceProps) {
  const liveStore = useStore();
  const sheet = useRef<HTMLDivElement>(null);
  const seller: SellerDetails = {
    storeName: liveStore.storeName || liveStore.name || STORE_SELLER_DETAILS.storeName,
    tagline: liveStore.tagline || STORE_SELLER_DETAILS.tagline,
    legalEntity: liveStore.legalEntity || liveStore.legalName || STORE_SELLER_DETAILS.legalEntity,
    address: liveStore.address || STORE_SELLER_DETAILS.address,
    cityStatePincode: liveStore.cityStatePincode || liveStore.location || STORE_SELLER_DETAILS.cityStatePincode,
    gstin: liveStore.gstin || STORE_SELLER_DETAILS.gstin,
    pan: liveStore.pan || STORE_SELLER_DETAILS.pan,
    cin: liveStore.cin || STORE_SELLER_DETAILS.cin,
    supportEmail: liveStore.email || liveStore.supportEmail || STORE_SELLER_DETAILS.supportEmail,
    supportPhone: liveStore.phone || liveStore.supportPhone || liveStore.whatsapp || STORE_SELLER_DETAILS.supportPhone,
    website: liveStore.website || STORE_SELLER_DETAILS.website,
  };
  // The shipped config carries placeholder GSTIN/PAN/phone/address. They are printed only
  // once the store has saved its own values; until then this is an invoice, not a tax invoice.
  const { confirmed } = liveStore;
  const isTaxInvoice = confirmed.gstin;

  const invoiceNumber = data.invoiceNumber || `INV-${data.orderNumber}`;
  // Only a recorded payment counts as paid; an online order can still be awaiting payment.
  const isPaid = data.paymentStatus === "paid";
  const dateObj = typeof data.date === "string" ? new Date(data.date) : data.date;
  const formattedDate = (!isNaN(dateObj.getTime()) ? dateObj : new Date()).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const isIntraState = data.state.trim().toLowerCase() === "gujarat";
  const taxRate = 0.05; // 5% GST standard apparel rate
  const taxableAmount = Math.max(0, data.subtotal - (data.discount ?? 0));
  const totalTax = data.tax ?? Math.round(taxableAmount * taxRate);
  const cgst = isIntraState ? Math.round(totalTax / 2) : 0;
  const sgst = isIntraState ? Math.round(totalTax / 2) : 0;
  const igst = !isIntraState ? totalTax : 0;

  const title = isTaxInvoice ? "Tax Invoice" : "Invoice";
  const handlePrint = () => printElement(sheet.current, `${title} ${invoiceNumber} - ${seller.storeName}`);

  return (
    <div
      ref={sheet}
      className="print-area relative mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-[#EAE3D9] bg-white text-[#2D2A26] shadow-sm"
    >
      <SealWatermark />

      {/* Action bar — never printed */}
      <div
        data-print-hide
        className="relative flex items-center justify-between gap-3 border-b border-[#EAE3D9] bg-[#FAF7F2] px-6 py-3 print:hidden"
      >
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
            isPaid ? "bg-[#E6ECDF] text-[#3F4A37]" : "bg-[#F6EADF] text-[#7D4E2D]"
          }`}
        >
          {isPaid ? "Paid" : data.paymentMethod === "cod" ? "Payment on delivery" : "Payment pending"}
        </span>
        <div className="flex items-center gap-2">
          {showPrintButton && (
            <Button onClick={handlePrint} size="sm" className="gap-2">
              <Printer className="h-4 w-4" /> Print / save as PDF
            </Button>
          )}
          {onClose && (
            <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Close invoice">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="h-1.5 w-full bg-[linear-gradient(90deg,#995C5C,#C28585_45%,#8B9A7D)]" />

      <div className="relative p-6 text-xs leading-normal sm:p-10 sm:text-sm print:p-7">
        {/* Letterhead */}
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
          <div>
            <BrandLockup name={seller.storeName} tagline={seller.tagline} />
            <div className="mt-3 space-y-0.5 pl-[58px] text-[11px] leading-relaxed text-[#6B6560]">
              {isTaxInvoice ? <p className="font-medium text-[#2D2A26]">{seller.legalEntity}</p> : null}
              {confirmed.address ? <p className="whitespace-pre-line">{seller.address}</p> : null}
              <p>{confirmed.address ? seller.cityStatePincode : [liveStore.city, seller.cityStatePincode].filter(Boolean).join(", ")}</p>
              {isTaxInvoice ? (
                <p>
                  GSTIN {seller.gstin}
                  {seller.pan ? ` · PAN ${seller.pan}` : ""}
                </p>
              ) : null}
              <p>
                {seller.supportEmail}
                {confirmed.phone ? ` · ${seller.supportPhone}` : ""}
              </p>
            </div>
          </div>

          {/* Hang tag with the document's identity */}
          <div className="relative shrink-0 rounded-lg border border-[#D9C9B6] bg-[#FAF7F2] px-5 pb-3 pt-5 sm:text-right">
            <span
              aria-hidden
              className="absolute left-1/2 top-1.5 h-2 w-2 -translate-x-1/2 rounded-full border border-[#D9C9B6] bg-white"
            />
            <h1 className="font-serif text-xl tracking-wide">{title}</h1>
            {isTaxInvoice ? (
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#995C5C]">Original for recipient</p>
            ) : null}
            <dl className="mt-2 grid grid-cols-[auto_auto] justify-end gap-x-3 gap-y-0.5 text-[11px]">
              <dt className="text-[#6B6560]">Invoice no.</dt>
              <dd className="font-mono font-semibold">{invoiceNumber}</dd>
              <dt className="text-[#6B6560]">Date</dt>
              <dd>{formattedDate}</dd>
              <dt className="text-[#6B6560]">Order</dt>
              <dd className="font-mono">{data.orderNumber}</dd>
              <dt className="text-[#6B6560]">Place of supply</dt>
              <dd>{data.state || "Gujarat"}</dd>
            </dl>
          </div>
        </div>

        <StitchRule className="my-6 print:my-4" />

        {/* Parties — orders have one address, so billing and shipping share a block. */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className={LABEL}>Billed &amp; shipped to</p>
            <p className="mt-1.5 font-serif text-base">{data.customerName}</p>
            <div className="mt-1 space-y-0.5 text-xs leading-relaxed text-[#6B6560]">
              <p className="whitespace-pre-line">{data.address}</p>
              <p>
                {data.city}, {data.state} — {data.pincode}, India
              </p>
              <p>
                Phone: {data.phone}
                {data.email ? ` · ${data.email}` : ""}
              </p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className={LABEL}>Payment</p>
            <p className="mt-1.5 text-sm font-medium">
              {data.paymentMethod === "cod" ? "Cash on delivery" : "Online (Razorpay)"}
            </p>
            <span
              className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                isPaid ? "bg-[#E6ECDF] text-[#3F4A37]" : "bg-[#F6EADF] text-[#7D4E2D]"
              }`}
            >
              {isPaid ? "Paid" : data.paymentMethod === "cod" ? "To be collected on delivery" : "Pending"}
            </span>
            {data.paymentId ? (
              <p className="mt-1 text-[11px] text-[#6B6560]">
                Ref. <span className="font-mono">{data.paymentId}</span>
              </p>
            ) : null}
          </div>
        </div>

        {/* Items */}
        <table className="mt-7 print:mt-5 w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#F5EFE6] text-[10px] uppercase tracking-[0.14em] text-[#6B6560]">
              <th className="rounded-l-md px-3 py-2 text-center font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className="px-3 py-2 text-center font-semibold">HSN</th>
              <th className="px-3 py-2 text-center font-semibold">Qty</th>
              <th className="px-3 py-2 text-right font-semibold">Rate (₹)</th>
              <th className="px-3 py-2 text-center font-semibold">GST</th>
              <th className="rounded-r-md px-3 py-2 text-right font-semibold">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="break-inside-avoid border-b border-[#EFE8DE] align-top">
                <td className="px-3 py-3 text-center font-mono text-[11px] text-[#6B6560]">{index + 1}</td>
                <td className="px-3 py-3">
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-0.5 text-[11px] text-[#6B6560]">
                    {[item.brand, item.size ? `Size ${item.size}` : "", item.color].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td className="px-3 py-3 text-center font-mono text-[11px] text-[#6B6560]">6209</td>
                <td className="px-3 py-3 text-center font-medium">{item.quantity}</td>
                <td className="px-3 py-3 text-right tabular-nums">{rupees(item.price)}</td>
                <td className="px-3 py-3 text-center text-[#6B6560]">5%</td>
                <td className="px-3 py-3 text-right font-medium tabular-nums">{rupees(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tax breakup + totals */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-12">
          <div className="space-y-4 sm:col-span-7">
            <div className="break-inside-avoid rounded-lg border border-[#EAE3D9] p-4 text-xs">
              <p className={LABEL}>GST breakup (included in prices)</p>
              <div className="mt-2 space-y-1 text-[#6B6560]">
                {isIntraState ? (
                  <>
                    <div className="flex justify-between">
                      <span>CGST @ 2.5%</span>
                      <span className="tabular-nums text-[#2D2A26]">₹{rupees(cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST @ 2.5%</span>
                      <span className="tabular-nums text-[#2D2A26]">₹{rupees(sgst)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>IGST @ 5%</span>
                    <span className="tabular-nums text-[#2D2A26]">₹{rupees(igst)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#EAE3D9] pt-1 font-medium text-[#2D2A26]">
                  <span>Total tax</span>
                  <span className="tabular-nums">₹{rupees(totalTax)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-[#FAF7F2] p-4 text-xs">
              <p className={LABEL}>Amount in words</p>
              <p className="mt-1 font-serif text-sm italic">{amountInWords(data.total)}</p>
            </div>
          </div>

          {/* Totals on a hang tag */}
          <div className="sm:col-span-5">
            <div className="relative break-inside-avoid rounded-xl border border-dashed border-[#C9A9A9] bg-[#FDFBF8] px-5 pb-4 pt-6 text-xs">
              <span aria-hidden className="absolute left-5 top-2.5 h-2.5 w-2.5 rounded-full border border-[#C9A9A9] bg-white" />
              <div className="flex justify-between py-0.5">
                <span className="text-[#6B6560]">Items subtotal</span>
                <span className="tabular-nums">₹{rupees(data.subtotal)}</span>
              </div>
              {data.discount && data.discount > 0 ? (
                <div className="flex justify-between py-0.5 text-[#3F4A37]">
                  <span>Discount{data.couponCode ? ` (${data.couponCode})` : ""}</span>
                  <span className="tabular-nums">−₹{rupees(data.discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between py-0.5">
                <span className="text-[#6B6560]">Delivery</span>
                <span className="tabular-nums">{!data.shipping ? "Free" : `₹${rupees(data.shipping)}`}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#6B6560]">GST (included)</span>
                <span className="tabular-nums">₹{rupees(totalTax)}</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between border-t border-[#EAE3D9] pt-2">
                <span className="font-serif text-base">Grand total</span>
                <span className="text-lg font-semibold tabular-nums">{formatPrice(data.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms and sign-off */}
        <StitchRule className="mt-8 print:mt-5" colour="#8B9A7D" />
        <div className="mt-5 grid break-inside-avoid grid-cols-1 items-end gap-6 sm:grid-cols-2">
          <div className="space-y-1 text-[11px] text-[#6B6560]">
            <p className={LABEL}>Terms</p>
            <p>1. Returns and size exchanges within 7 days of delivery, unused with tags.</p>
            {isTaxInvoice ? <p>2. Tax payable under reverse charge: No.</p> : null}
            <p>{isTaxInvoice ? "3" : "2"}. This is a computer-generated invoice and needs no signature.</p>
            <p className="pt-2 font-serif text-sm italic text-[#995C5C]">Thank you for shopping with us.</p>
          </div>

          <div className="flex flex-col items-start gap-1 sm:items-end">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-[#C9A9A9]">
              <BrandSeal size={50} />
            </div>
            <p className="text-[11px] font-medium">For {seller.storeName}</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#6B6560]">Authorised signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
