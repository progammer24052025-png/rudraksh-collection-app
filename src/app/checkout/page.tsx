"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, MapPin, Banknote, Check, Shield, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart-context";
import { formatPrice, createOrder, fetchProducts } from "@/lib/store-data";
import { computeTotals, normalizePricing, validateCoupon } from "@/lib/pricing";
import { logActivity, readCoupon } from "@/lib/firebase";
import type { Coupon, StoreSettings } from "@/lib/types";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { PageBreadcrumb } from "@/components/kit/page-breadcrumb";
import { ProgressSteps } from "@/components/kit/steps";
import { AnimatedTicket } from "@/components/ui/ticket-confirmation-card";

type Address = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

/** What Razorpay hands back after a successful payment. */
type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (payload: { error?: { description?: string } }) => void,
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

/** Loads Razorpay's checkout script once; false means it could not load. */
function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-razorpay-checkout]");
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function CheckoutContent() {
  const { items, getCartTotal, getProduct, clearCart, setProducts, isHydrated } = useCart();
  const storeConfig = useStore();
  const { user, profile } = useAuth();
  const [step, setStep] = useState<"address" | "payment" | "success">("address");
  const [address, setAddress] = useState<Address>({
    fullName: "", phone: "", email: "", address: "", city: "", state: "", pincode: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">("cod");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  // Online payment is offered only when the gateway is configured and the
  // server can write the order itself — never when the browser would have to.
  const [onlineAvailable, setOnlineAvailable] = useState(false);
  const [paymentIssue, setPaymentIssue] = useState<string | null>(null);
  const paid = useRef(false);

  useEffect(() => {
    if (!storeConfig.razorpayEnabled) return;
    let cancelled = false;
    fetch("/api/payments")
      .then((response) => response.json())
      .then((data: { available?: boolean }) => {
        if (!cancelled) setOnlineAvailable(Boolean(data.available));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storeConfig.razorpayEnabled]);

  // The same engine the server uses, so the customer never sees one total and
  // gets charged another.
  const pricing = normalizePricing({
    freeShippingThreshold: storeConfig.freeShippingThreshold,
    shippingFee: storeConfig.shippingFee,
    tax: (storeConfig as unknown as StoreSettings).tax,
  });

  const lines = useMemo(
    () =>
      items.map((item) => {
        const product = getProduct(item.productId);
        const price =
          product && typeof product.sale_price === "number" && product.sale_price > 0
            ? product.sale_price
            : product?.price ?? 0;
        return {
          productId: item.productId,
          name: product?.name ?? "Item",
          price,
          quantity: item.quantity,
        };
      }),
    [items, getProduct],
  );

  const totals = computeTotals({ lines, coupon, config: pricing });
  const cartTotal = totals.subtotal;
  const shipping = totals.shipping;
  const grandTotal = totals.total;

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    try {
      const found = await readCoupon(code);
      if (!found) {
        setCoupon(null);
        setCouponMessage("That code does not exist.");
        return;
      }
      const check = validateCoupon(found, totals.subtotal);
      if (!check.ok) {
        setCoupon(null);
        setCouponMessage(check.reason);
        return;
      }
      setCoupon(found);
      setCouponMessage(`${found.code} applied`);
    } catch {
      setCouponMessage("Could not check that code. Please try again.");
    } finally {
      setCouponBusy(false);
    }
  }

  // Prefill from the signed-in profile's default address.
  useEffect(() => {
    if (!profile) return;
    setAddress((current) => {
      if (current.fullName || current.address) return current;
      const saved = profile.addresses?.find((item) => item.isDefault) ?? profile.addresses?.[0];
      return {
        fullName: saved?.fullName || profile.displayName || current.fullName,
        phone: saved?.phone || (profile.phone ? profile.phone.replace(/^\+91/, "") : current.phone),
        email: profile.email || current.email,
        address: saved?.address || current.address,
        city: saved?.city || current.city,
        state: saved?.state || current.state,
        pincode: saved?.pincode || current.pincode,
      };
    });
  }, [profile]);

  useEffect(() => {
    if (items.length > 0) {
      fetchProducts({ limit: 200 }).then(r => setProducts(r.products)).catch(() => {});
    }
  }, [items.length, setProducts]);

  if (isHydrated && items.length === 0 && step !== "success") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-medium">Your cart is empty</p>
        <Button asChild className="mt-4">
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.fullName || !address.phone || !address.address || !address.city || !address.state || !address.pincode) {
      toast.error("Please fill all fields");
      return;
    }
    if (address.phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    if (address.pincode.length !== 6) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }
    setStep("payment");
  };

  /**
   * Records the order. `proof` is present only after Razorpay reports success;
   * the server refuses a Razorpay order without a verified payment.
   */
  const submitOrder = async (proof?: RazorpaySuccess) => {
    try {
      // The server re-prices the whole bag from the database and, when the
      // service account is configured, writes the order itself.
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_id: user?.uid ?? null,
          coupon_code: coupon?.code ?? null,
          payment_method: paymentMethod,
          payment_proof: proof,
          customer: {
            name: address.fullName,
            phone: address.phone,
            email: address.email,
            address: address.address,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
          },
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          })),
        }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        secure?: boolean;
        error?: string;
        payment_id?: string;
        order?: { id: string; order_number: string } | null;
      };

      if (!data.ok) {
        // Money moved but the order did not stick — the reference is what lets
        // us reconcile instead of asking the customer to pay twice.
        if (proof) {
          setPaymentIssue(
            data.payment_id
              ? `Your payment (${data.payment_id}) went through, but the order could not be saved. Please contact us with this reference — do not pay again.`
              : "Your payment may have gone through, but the order could not be saved. Please contact us before paying again.",
          );
        }
        toast.error(data.error || "Could not place the order");
        return;
      }

      if (data.secure && data.order) {
        setOrderNumber(data.order.order_number);
        clearCart();
        setStep("success");
        toast.success("Order placed successfully!");
        return;
      }

      // Server priced the order but cannot write without the service account.
      const orderItems = items.map((item) => {
        const product = getProduct(item.productId);
        return {
          productId: item.productId,
          name: product?.name || "Unknown",
          brand: product?.brand_name || "",
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          price:
            product && typeof product.sale_price === "number" && product.sale_price > 0
              ? product.sale_price
              : product?.price ?? 0,
          image: product?.images[0] || "",
        };
      });

      const result = await createOrder({
        user_id: user?.uid ?? null,
        customer_name: address.fullName,
        phone: address.phone,
        email: address.email || null,
        address: address.address,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        items: orderItems,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        coupon_code: totals.couponCode,
        shipping: totals.shipping,
        total: totals.total,
        payment_method: paymentMethod,
      });

      if (result.ok && result.order) {
        void logActivity(user?.uid, {
          type: "order",
          label: `Order ${result.order.order_number} placed`,
          meta: formatPrice(totals.total),
          href: "/track-order",
        });
        setOrderNumber(result.order.order_number);
        clearCart();
        setStep("success");
        toast.success("Order placed successfully!");
      } else {
        toast.error(result.error || "Failed to place order");
      }
    } catch {
      if (proof) {
        setPaymentIssue(
          `We lost the connection while confirming payment ${proof.razorpay_payment_id}. Please contact us with this reference before paying again.`,
        );
      }
      toast.error("Failed to place order. Please try again.");
    }
  };

  /** Opens Razorpay; the order is only submitted from its success handler. */
  const payWithRazorpay = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setPaymentIssue(null);
    paid.current = false;

    try {
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        toast.error("Could not open the payment window. Check your connection and try again.");
        return;
      }

      const priced = await fetch("/api/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_id: user?.uid ?? null,
          coupon_code: coupon?.code ?? null,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          })),
        }),
      });

      const order = (await priced.json()) as {
        ok: boolean;
        error?: string;
        keyId: string;
        orderId: string;
        amount: number;
        currency: string;
        receipt: string;
      };

      if (!order.ok) {
        toast.error(order.error || "Online payment is unavailable right now.");
        return;
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Rudraksh Collection",
        description: `Order ${order.receipt}`,
        prefill: {
          name: address.fullName,
          email: address.email || undefined,
          contact: `+91${address.phone}`,
        },
        notes: { receipt: order.receipt },
        theme: { color: "#8B9A7D" },
        retry: { enabled: true },
        handler: (result: RazorpaySuccess) => {
          paid.current = true;
          void submitOrder(result).finally(() => setIsProcessing(false));
        },
        modal: {
          ondismiss: () => {
            if (paid.current) return; // success already handled
            setIsProcessing(false);
            toast.error("Payment cancelled — no order was placed.");
          },
        },
      });

      checkout.on("payment.failed", (failure: { error?: { description?: string } }) => {
        setIsProcessing(false);
        toast.error(failure?.error?.description || "That payment did not go through. No order was placed.");
      });

      checkout.open();
    } catch {
      toast.error("Could not start the payment. Please try again.");
      setIsProcessing(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (paymentMethod === "razorpay") {
      await payWithRazorpay();
      return;
    }
    setIsProcessing(true);
    try {
      await submitOrder();
    } finally {
      setIsProcessing(false);
    }
  };

  if (step === "success") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-12 sm:px-6">
        <AnimatedTicket
          ticketId={orderNumber ?? "—"}
          amount={totals.total}
          date={new Date()}
          cardHolder={address.fullName || "Guest"}
          paymentLabel={paymentMethod === "cod" ? "Cash on delivery" : "Paid online"}
          barcodeValue={orderNumber ?? "RUDRAKSH"}
          lines={[
            { label: "Subtotal", value: formatPrice(totals.subtotal) },
            ...(totals.discount > 0
              ? [{ label: totals.couponCode ? `Discount (${totals.couponCode})` : "Discount", value: `−${formatPrice(totals.discount)}` }]
              : []),
            { label: "Shipping", value: totals.shipping === 0 ? "Free" : formatPrice(totals.shipping), muted: totals.shipping === 0 },
            { label: "Total", value: formatPrice(totals.total) },
          ]}
          note={
            pricing.tax.enabled
              ? `Includes ${formatPrice(totals.tax)} ${pricing.tax.label}. We'll contact you shortly to confirm your order.`
              : "We'll contact you shortly to confirm your order."
          }
        />

        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          {orderNumber && (
            <Button asChild>
              <Link href={`/track-order?order=${orderNumber}`}>Track this order</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/products">Continue Shopping</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/account">View Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageBreadcrumb items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} className="-mt-2 mb-2" />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProgressSteps
            items={[
              { title: "Delivery address", description: "Where it goes" },
              { title: "Payment", description: "How you pay" },
            ]}
            current={step === "payment" ? 1 : 0}
            onStepChange={(next) => setStep(next === 0 ? "address" : "payment")}
            className="mb-8"
          />

          {step === "address" && (
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-lg border border-border bg-card p-6"
            >
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-serif text-lg font-medium">Delivery Address</h2>
              </div>

              <form onSubmit={handleAddressSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input id="fullName" value={address.fullName}
                      onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                      placeholder="Enter your full name" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      placeholder="10-digit mobile number" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input id="email" type="email" value={address.email}
                    onChange={(e) => setAddress({ ...address, email: e.target.value })}
                    placeholder="your@email.com" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input id="address" value={address.address}
                    onChange={(e) => setAddress({ ...address, address: e.target.value })}
                    placeholder="House no., Building, Street, Area" className="mt-1" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder="City" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input id="state" value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      placeholder="State" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input id="pincode" value={address.pincode}
                      onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                      placeholder="6-digit pincode" className="mt-1" />
                  </div>
                </div>
                <Button type="submit" size="lg" className="w-full">Continue to Payment</Button>
              </form>
            </motion.div>
          )}

          {step === "payment" && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">Delivering to</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep("address")}>Change</Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {address.fullName}, {address.phone}<br />
                  {address.address}<br />
                  {address.city}, {address.state} - {address.pincode}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-serif text-lg font-medium">Payment Method</h2>
                </div>

                <div className="space-y-3">
                  <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${
                    paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-border"
                  }`}>
                    <input type="radio" name="payment" value="cod" checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")} className="accent-primary" />
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                      <Banknote className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Cash on Delivery</p>
                      <p className="text-xs text-muted-foreground">Pay when you receive your order</p>
                    </div>
                  </label>

                  {onlineAvailable && (
                    <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${
                      paymentMethod === "razorpay" ? "border-primary bg-primary/5" : "border-border"
                    }`}>
                      <input type="radio" name="payment" value="razorpay" checked={paymentMethod === "razorpay"}
                        onChange={() => setPaymentMethod("razorpay")} className="accent-primary" />
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Online Payment</p>
                        <p className="text-xs text-muted-foreground">UPI, Cards, Net Banking</p>
                      </div>
                    </label>
                  )}
                </div>

                {storeConfig.razorpayEnabled && !onlineAvailable && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Online payment is unavailable right now — Cash on Delivery is open as usual.
                  </p>
                )}

                {paymentIssue && (
                  <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">
                    {paymentIssue}
                  </p>
                )}

                <Button
                  size="lg" className="mt-6 w-full"
                  onClick={handlePlaceOrder} disabled={isProcessing}
                >
                  {isProcessing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {paymentMethod === "razorpay" ? "Waiting for payment..." : "Placing Order..."}</>
                  ) : paymentMethod === "razorpay" ? (
                    `Pay ${formatPrice(grandTotal)}`
                  ) : (
                    `Place Order — ${formatPrice(grandTotal)}`
                  )}
                </Button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>{paymentMethod === "razorpay" ? "Secure payment by Razorpay" : "Secure checkout"}</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-lg border border-border bg-card p-6">
            <h2 className="font-serif text-lg font-medium">Order Summary</h2>

            <div className="mt-4 max-h-64 space-y-3 overflow-y-auto">
              {items.map((item) => {
                const product = getProduct(item.productId);
                if (!product) return null;
                const price = product.sale_price ?? product.price;
                return (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-3">
                    <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                      {product.images[0] && (
                        <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{item.size} × {item.quantity}</p>
                      <p className="text-sm font-medium">{formatPrice(price * item.quantity)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 border-t border-border pt-4">
              {coupon ? (
                <div className="mb-3 flex items-center justify-between rounded-lg bg-sage/10 px-3 py-2 text-sm">
                  <span className="font-mono text-xs font-semibold text-foreground">{coupon.code}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCoupon(null);
                      setCouponInput("");
                      setCouponMessage(null);
                    }}
                    className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="mb-3 flex gap-2">
                  <Input
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void applyCoupon();
                      }
                    }}
                    placeholder="Coupon code"
                    className="h-10 font-mono uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void applyCoupon()}
                    disabled={couponBusy || !couponInput.trim()}
                  >
                    {couponBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              )}
              {couponMessage && !coupon ? (
                <p className="mb-3 text-xs text-destructive">{couponMessage}</p>
              ) : null}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                {totals.discount > 0 ? (
                  <div className="flex justify-between text-sage">
                    <span>Discount</span>
                    <span>−{formatPrice(totals.discount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? <span className="text-sage">FREE</span> : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(grandTotal)}</span>
                </div>
                {pricing.tax.enabled && pricing.tax.inclusive ? (
                  <p className="text-xs text-muted-foreground">
                    Includes {formatPrice(totals.tax)} {pricing.tax.label} ({Math.round(pricing.tax.rate * 1000) / 10}%)
                  </p>
                ) : null}
                {!pricing.tax.inclusive && pricing.tax.enabled ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {pricing.tax.label} ({Math.round(pricing.tax.rate * 1000) / 10}%)
                    </span>
                    <span>{formatPrice(totals.tax)}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <>
      <div className="min-h-screen">
        <Header />
        <main>
          <CheckoutContent />
        </main>
        <Footer />
      </div>
    </>
  );
}
