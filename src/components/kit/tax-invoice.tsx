"use client";

import React from "react";
import { Printer, Download, X, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/store-data";
import { amountInWords, STORE_SELLER_DETAILS } from "@/lib/invoice-utils";

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

export function TaxInvoice({ data, onClose, showPrintButton = true }: TaxInvoiceProps) {
  const seller = STORE_SELLER_DETAILS;
  const invoiceNumber = data.invoiceNumber || `INV-${data.orderNumber}`;
  const isPaid = data.paymentStatus === "paid" || data.paymentMethod === "razorpay";
  const dateObj = typeof data.date === "string" ? new Date(data.date) : data.date;
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const isIntraState = data.state.trim().toLowerCase() === "gujarat";
  const taxRate = 0.05; // 5% GST standard apparel rate
  const taxableAmount = Math.max(0, data.subtotal - (data.discount ?? 0));
  const totalTax = data.tax ?? Math.round(taxableAmount * taxRate);
  const cgst = isIntraState ? Math.round(totalTax / 2) : 0;
  const sgst = isIntraState ? Math.round(totalTax / 2) : 0;
  const igst = !isIntraState ? totalTax : 0;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-4xl bg-white text-slate-900 shadow-xl rounded-xl border border-slate-200 print:border-none print:shadow-none print:rounded-none print:m-0 print:p-0 print:max-w-none">
      {/* Top action bar - Hidden during print */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-xl print:hidden">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-800">
            {isPaid ? "Official Tax Invoice" : "Order Bill / Cash Memo"}
          </span>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isPaid
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-amber-100 text-amber-800 border border-amber-300"
            }`}
          >
            {isPaid ? "Paid in Full" : "Payment Pending (COD)"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {showPrintButton && (
            <Button
              onClick={handlePrint}
              size="sm"
              className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
          )}
          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="p-6 sm:p-10 text-xs sm:text-sm font-sans leading-normal">
        {/* Amazon-style Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl font-black tracking-tight text-slate-900">
                {seller.storeName}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium tracking-wide">{seller.tagline}</p>
            <div className="mt-2 text-[11px] text-slate-600 leading-relaxed">
              <p className="font-medium text-slate-900">{seller.legalEntity}</p>
              <p>{seller.address}</p>
              <p>{seller.cityStatePincode}</p>
              <p>
                <span className="font-semibold text-slate-700">GSTIN:</span> {seller.gstin} |{" "}
                <span className="font-semibold text-slate-700">PAN:</span> {seller.pan}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Support:</span> {seller.supportEmail} |{" "}
                {seller.supportPhone}
              </p>
            </div>
          </div>

          <div className="sm:text-right shrink-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-slate-900">
              Tax Invoice
            </h1>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              (Original for Recipient)
            </p>
            <div className="mt-3 space-y-1 text-xs">
              <p>
                <span className="font-semibold text-slate-700">Invoice No:</span>{" "}
                <span className="font-mono font-bold text-slate-900">{invoiceNumber}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-700">Invoice Date:</span> {formattedDate}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Order ID:</span>{" "}
                <span className="font-mono font-bold text-slate-900">{data.orderNumber}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-700">Place of Supply:</span>{" "}
                {data.state || "Gujarat"}
              </p>
            </div>
          </div>
        </div>

        {/* Billed To & Shipped To Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 border-b border-slate-200">
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200/80">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Billing Address
            </h2>
            <p className="font-bold text-slate-900 text-sm">{data.customerName}</p>
            <p className="text-slate-700 mt-1">{data.address}</p>
            <p className="text-slate-700">
              {data.city}, {data.state} - {data.pincode}
            </p>
            <p className="text-slate-700 mt-1">
              <span className="font-medium">Phone:</span> {data.phone}
            </p>
            {data.email && (
              <p className="text-slate-700">
                <span className="font-medium">Email:</span> {data.email}
              </p>
            )}
            <p className="text-[11px] text-slate-600 mt-1">
              <span className="font-medium">State Code:</span> {data.state} (India)
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200/80">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Shipping Address
            </h2>
            <p className="font-bold text-slate-900 text-sm">{data.customerName}</p>
            <p className="text-slate-700 mt-1">{data.address}</p>
            <p className="text-slate-700">
              {data.city}, {data.state} - {data.pincode}
            </p>
            <p className="text-slate-700 mt-1">
              <span className="font-medium">Phone:</span> {data.phone}
            </p>
            <p className="text-slate-700">
              <span className="font-medium">Country:</span> India
            </p>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-[11px] uppercase tracking-wider font-bold text-slate-700 border-b border-slate-300">
                <th className="py-2.5 px-3 border-r border-slate-300 w-10 text-center">#</th>
                <th className="py-2.5 px-3 border-r border-slate-300">Description of Goods</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-24">HSN</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-16">Qty</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-right w-24">Gross (₹)</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-20">Tax Rate</th>
                <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.items.map((item, index) => {
                const lineTotal = item.price * item.quantity;
                return (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 border-r border-slate-300 text-center text-slate-500 font-mono text-xs">
                      {index + 1}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-2 mt-0.5">
                        {item.brand && <span>Brand: {item.brand}</span>}
                        {item.size && <span>Size: {item.size}</span>}
                        {item.color && <span>Color: {item.color}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300 text-center font-mono text-xs text-slate-600">
                      6209
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300 text-center font-semibold text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300 text-right font-mono text-slate-700">
                      {item.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-300 text-center text-slate-600">
                      5% GST
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                      {lineTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculation & Tax Breakdown Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2">
          {/* Left Column: Tax Split-up & Words */}
          <div className="sm:col-span-7 space-y-4">
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50 text-xs">
              <p className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[10px]">
                Tax Details & GST Breakup
              </p>
              <div className="space-y-1 text-slate-600">
                {isIntraState ? (
                  <>
                    <div className="flex justify-between">
                      <span>Central GST (CGST @ 2.5%):</span>
                      <span className="font-mono text-slate-900 font-medium">₹{cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>State GST (SGST @ 2.5%):</span>
                      <span className="font-mono text-slate-900 font-medium">₹{sgst.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>Integrated GST (IGST @ 5.0%):</span>
                    <span className="font-mono text-slate-900 font-medium">₹{igst.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-300 pt-1 font-semibold text-slate-900">
                  <span>Total Tax Included:</span>
                  <span className="font-mono">₹{totalTax.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs">
              <span className="font-semibold text-slate-700 uppercase tracking-wide text-[10px] block mb-0.5">
                Amount in Words:
              </span>
              <p className="font-serif italic font-medium text-slate-900">
                {amountInWords(data.total)}
              </p>
            </div>

            <div className="text-[11px] text-slate-500 space-y-1">
              <p>
                <span className="font-semibold text-slate-700">Payment Mode:</span>{" "}
                <span className="uppercase font-medium text-slate-900">
                  {data.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment (Razorpay)"}
                </span>
              </p>
              <p>
                <span className="font-semibold text-slate-700">Payment Status:</span>{" "}
                <span
                  className={`font-semibold ${
                    isPaid ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {isPaid ? "PAID" : "PENDING (Collect upon delivery)"}
                </span>
              </p>
              {data.paymentId && (
                <p>
                  <span className="font-semibold text-slate-700">Gateway Ref:</span>{" "}
                  <span className="font-mono">{data.paymentId}</span>
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Totals Summary */}
          <div className="sm:col-span-5">
            <div className="rounded-lg border border-slate-300 divide-y divide-slate-200 text-xs">
              <div className="flex justify-between p-2.5">
                <span className="text-slate-600">Items Subtotal:</span>
                <span className="font-mono font-medium text-slate-900">
                  ₹{data.subtotal.toFixed(2)}
                </span>
              </div>
              {data.discount && data.discount > 0 ? (
                <div className="flex justify-between p-2.5 bg-emerald-50/50 text-emerald-800">
                  <span>
                    Discount {data.couponCode ? `(${data.couponCode})` : ""}:
                  </span>
                  <span className="font-mono font-semibold">−₹{data.discount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between p-2.5">
                <span className="text-slate-600">Shipping & Delivery:</span>
                <span className="font-mono font-medium text-slate-900">
                  {!data.shipping || data.shipping === 0 ? "FREE" : `₹${data.shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-50">
                <span className="text-slate-600">Taxes (GST Included):</span>
                <span className="font-mono font-medium text-slate-900">
                  ₹{totalTax.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-slate-900 text-white font-bold text-sm sm:text-base">
                <span>Grand Total:</span>
                <span className="font-mono">{formatPrice(data.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Declaration & Signatory Footer */}
        <div className="mt-8 pt-6 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
          <div className="text-[11px] text-slate-500 space-y-1">
            <p className="font-bold uppercase tracking-wider text-slate-700">Terms & Conditions:</p>
            <p>1. Goods once sold can be returned or exchanged within 7 days in original condition.</p>
            <p>2. Whether tax is payable under reverse charge basis: <strong className="text-slate-800">No</strong>.</p>
            <p>3. This is a computer-generated invoice and requires no physical signature.</p>
          </div>

          <div className="sm:text-right space-y-2">
            <p className="text-xs font-semibold text-slate-800">
              For {seller.storeName}
            </p>
            <div className="inline-block p-2 rounded border border-dashed border-slate-300 text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-semibold text-xs">
                <CheckCircle2 className="h-4 w-4" /> Authorized Signatory
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Digitally Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
