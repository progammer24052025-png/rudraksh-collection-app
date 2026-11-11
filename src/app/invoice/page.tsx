"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, PackageSearch } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { TaxInvoice, type InvoiceData } from "@/components/kit/tax-invoice";
import { findOrderByNumber } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Order } from "@/lib/types";

function InvoiceContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order")?.trim().toUpperCase();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const uid = user?.uid ?? null;

  useEffect(() => {
    // Orders are private, so wait until we know who is asking.
    if (authLoading) return;
    if (!orderNumber || !uid) {
      setOrder(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    findOrderByNumber(uid, orderNumber)
      .then((found) => {
        if (!cancelled) setOrder(found);
      })
      .catch((err) => console.error("Failed to load invoice:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, orderNumber, uid]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Generating tax invoice…</p>
      </div>
    );
  }

  if (orderNumber && !uid) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">Sign in to view this invoice</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Invoices contain your address and phone number, so they are only shown to the account
          that placed the order.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/account">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!orderNumber || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">Invoice Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We could not find an order matching &ldquo;{orderNumber || "unknown"}&rdquo;.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/account">Go to My Orders</Link>
          </Button>
          <Button asChild>
            <Link href="/products">Shop Now</Link>
          </Button>
        </div>
      </div>
    );
  }

  const invoiceData: InvoiceData = {
    orderNumber: order.order_number,
    invoiceNumber: `INV-${order.order_number}`,
    date: order.created_at,
    customerName: order.customer_name,
    phone: order.phone,
    email: order.email,
    address: order.address,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    items: order.items.filter((i) => !i.cancelled).map((i) => ({
      name: i.name,
      brand: i.brand,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
      price: i.price,
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    couponCode: order.coupon_code,
    tax: order.tax,
    shipping: order.shipping,
    total: order.total,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    paymentId: order.razorpay_payment_id,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href={`/track-order?order=${order.order_number}`}>
            <ArrowLeft className="h-4 w-4" /> Back to Order Tracking
          </Link>
        </Button>
      </div>

      <TaxInvoice data={invoiceData} showPrintButton={true} />
    </div>
  );
}

export default function InvoicePage() {
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="print:hidden">
        <Header />
      </div>
      <main id="main">
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <InvoiceContent />
        </Suspense>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}

