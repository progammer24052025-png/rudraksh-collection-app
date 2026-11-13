"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "@/components/store-image";
import {
  ChevronLeft,
  MapPin,
  Banknote,
  Check,
  Shield,
  FileText,
  Download,
  Copy,
  Printer,
  CheckCircle2,
  Truck,
  Calendar,
  CreditCard,
  ShoppingBag,
} from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart-context";
import { formatPrice, fetchProducts } from "@/lib/store-data";
import { computeTotals, normalizePricing, validateCoupon } from "@/lib/pricing";
import { readPendingCoupon, writePendingCoupon } from "@/lib/pending-coupon";
import { BuyAssurance, StoreTrust } from "@/components/trust-strip";
import {
  checkUserCouponUsed,
  createEmailAccount,
  logActivity,
  readCoupon,
  setRememberSession,
  signInWithEmailAccount,
} from "@/lib/firebase";
import type { Coupon, StoreSettings } from "@/lib/types";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { PageBreadcrumb } from "@/components/kit/page-breadcrumb";
import { ProgressSteps } from "@/components/kit/steps";
import { AnimatedTicket, ConfettiExplosion } from "@/components/ui/ticket-confirmation-card";
import { SignInForm } from "@/components/kit/sign-in-form";
import { TaxInvoice, type InvoiceData } from "@/components/kit/tax-invoice";

import { Spinner } from "@/components/ui/spinner";
import { SealLoader } from "@/components/kit/brand-mark";
import { trackEvent } from "@/lib/track";
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function authMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password do not match.";
    case "auth/email-already-in-use":
      return "That email already has an account — sign in instead.";
    case "auth/weak-password":
      return "Use at least 6 characters for the password.";
    case "auth/invalid-email":
      return "That email address looks incomplete.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a minute and try again.";
    default:
      return "Could not sign you in. Please try again.";
  }
}

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

type CompletedOrderSummary = {
  orderNumber: string;
  items: Array<{
    productId: string;
    name: string;
    brand: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
    image: string;
  }>;
  address: Address;
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    shipping: number;
    total: number;
    couponCode?: string | null;
  };
  paymentMethod: "cod" | "razorpay";
  paymentStatus: "paid" | "pending";
  paymentId?: string | null;
  createdAt: string;
};

function CheckoutContent() {
  const { items, getCartTotal, getProduct, clearCart, setProducts, isHydrated } = useCart();
  const storeConfig = useStore();
  const { user, profile, loading, loginWithGoogle } = useAuth();

  /**
   * The order routes identify us by a signed ID token, not by a uid typed into
   * the request body — that field could name anybody's account.
   */
  const authHeaders = async (): Promise<Record<string, string>> => {
    try {
      const token = await user?.getIdToken();
      return token ? { authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };
  const [step, setStep] = useState<"address" | "payment" | "success">("address");
  const [address, setAddress] = useState<Address>({
    fullName: "", phone: "", email: "", address: "", city: "", state: "", pincode: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">("cod");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [completedOrder, setCompletedOrder] = useState<CompletedOrderSummary | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [copiedOrder, setCopiedOrder] = useState(false);

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  const [onlineAvailable, setOnlineAvailable] = useState(false);
  const [paymentIssue, setPaymentIssue] = useState<string | null>(null);
  const paid = useRef(false);

  // Counted once per visit to checkout with something in the bag.
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (checkoutTracked.current || !isHydrated || items.length === 0) return;
    checkoutTracked.current = true;
    trackEvent("begin_checkout");
  }, [isHydrated, items.length]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payments")
      .then((response) => response.json())
      .then((data: { available?: boolean }) => {
        if (!cancelled && data.available) setOnlineAvailable(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // The same engine the server uses, so the customer never sees one total and
  // gets charged another.
  // When the store prices delivery by distance, the charge depends on the PIN
  // code, so it is fetched from the server — the same figure the order uses.
  const [deliveryQuote, setDeliveryQuote] = useState<{
    pincode: string;
    fee: number;
    distanceKm: number | null;
  } | null>(null);
  const distancePricing = Boolean(storeConfig.shipping?.distanceEnabled);
  const quotedFee =
    distancePricing && deliveryQuote && deliveryQuote.pincode === address.pincode
      ? deliveryQuote.fee
      : null;

  const pricing = normalizePricing({
    freeShippingThreshold: storeConfig.freeShippingThreshold,
    shippingFee: quotedFee ?? storeConfig.shippingFee,
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

  async function applyCoupon(preset?: string) {
    const code = (preset ?? couponInput).trim().toUpperCase();
    if (!code) return;
    if (!user) {
      setCouponMessage("Please sign in to apply coupon codes.");
      toast.error("Please sign in to apply coupons.");
      return;
    }
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

      // Check single-use restriction per user and phone
      const customerPhone = address.phone || (profile?.phone ? profile.phone.replace(/^\+91/, "") : undefined);
      const usedCheck = await checkUserCouponUsed(code, user.uid, customerPhone);
      if (usedCheck.used) {
        setCoupon(null);
        setCouponMessage(usedCheck.reason || "This coupon has already been used by your account.");
        toast.error(usedCheck.reason || "This coupon can only be used once per customer.");
        return;
      }

      setCoupon(found);
      writePendingCoupon(found.code);
      setCouponMessage(`${found.code} applied`);
      toast.success(`Coupon ${found.code} applied!`);
    } catch {
      setCouponMessage("Could not check that code. Please try again.");
    } finally {
      setCouponBusy(false);
    }
  }

  // A coupon picked in the cart is applied here once, as soon as we know who
  // is checking out (the one-use-per-customer check needs the account).
  const cartCouponTried = useRef(false);
  useEffect(() => {
    if (cartCouponTried.current || !user || coupon || totals.subtotal <= 0) return;
    cartCouponTried.current = true;
    const pending = readPendingCoupon();
    if (!pending) return;
    setCouponInput(pending);
    void applyCoupon(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per visit
  }, [user, totals.subtotal]);

  useEffect(() => {
    if (!distancePricing || !/^[1-8]\d{5}$/.test(address.pincode)) return;
    let cancelled = false;
    fetch(`/api/shipping?pincode=${address.pincode}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; pincode?: string; fee?: number; distanceKm?: number | null }) => {
        if (cancelled || !data.ok || typeof data.fee !== "number" || !data.pincode) return;
        setDeliveryQuote({ pincode: data.pincode, fee: data.fee, distanceKm: data.distanceKm ?? null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [distancePricing, address.pincode]);

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

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <SealLoader size={56} showLabel={false} className="mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">Checking account status...</p>
      </div>
    );
  }

  if (!user && step !== "success") {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <PageBreadcrumb items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} className="-mt-2 mb-6" />

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 border-b border-border pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-serif text-xl sm:text-2xl font-semibold">Sign in to Checkout</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Login is required for order security, coupon redemption, and tracking.</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full gap-3 h-12 text-sm font-medium border-border hover:bg-muted"
              onClick={async () => {
                const res = await loginWithGoogle();
                if (!res.ok && res.error) toast.error(res.error);
                else toast.success("Signed in successfully!");
              }}
            >
              <GoogleIcon /> Continue with Google
            </Button>

            <div className="relative my-4 flex items-center justify-center text-xs text-muted-foreground">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <span className="relative bg-card px-3 uppercase tracking-wider text-[11px]">or sign in with email</span>
            </div>

            <SignInForm
              title=""
              subtitle=""
              className="p-0 border-0 shadow-none max-w-none"
              onSubmit={async ({ email, password, remember }) => {
                try {
                  await setRememberSession(remember);
                  await signInWithEmailAccount(email, password);
                  toast.success("Signed in successfully!");
                } catch (err) {
                  const code = (err as { code?: string })?.code ?? "unknown";
                  toast.error(authMessage(code));
                }
              }}
              footer={
                <div className="mt-4 text-center text-xs text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link href="/account" className="text-primary hover:underline font-medium">
                    Create an account / Sign in with mobile OTP
                  </Link>
                </div>
              }
            />
          </div>
        </div>
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
      // Snapshot items before placing order so success bill & invoice have full data
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
          image: product?.images?.[0] || "",
        };
      });

      const handleSuccess = (num: string, p?: RazorpaySuccess) => {
        trackEvent("purchase");
        const isPaid = Boolean(p);
        setCompletedOrder({
          orderNumber: num,
          items: orderItems,
          address: { ...address },
          totals: {
            subtotal: totals.subtotal,
            discount: totals.discount,
            tax: totals.tax,
            shipping: totals.shipping,
            total: totals.total,
            couponCode: totals.couponCode,
          },
          paymentMethod,
          paymentStatus: isPaid ? "paid" : "pending",
          paymentId: p?.razorpay_payment_id || null,
          createdAt: new Date().toISOString(),
        });
        setOrderNumber(num);
        void logActivity(user?.uid, {
          type: "order",
          label: `Order ${num} placed`,
          meta: formatPrice(totals.total),
          href: `/track-order?order=${num}`,
        });
        clearCart();
        writePendingCoupon(null);
        setStep("success");
        toast.success("Order placed successfully!");
      };

      // The server re-prices the whole bag from the database and, when the
      // service account is configured, writes the order itself.
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await authHeaders()) },
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
        /** Paid, and the gateway's own confirmation is writing the order. */
        recording?: boolean;
        order?: { id: string; order_number: string } | null;
      };

      if (!data.ok) {
        // Money moved but the order did not stick — the reference is what lets
        // us reconcile instead of asking the customer to pay twice.
        if (proof) {
          setPaymentIssue(
            data.recording && data.error
              ? data.error
              : data.payment_id
              ? `Your payment (${data.payment_id}) went through, but the order could not be saved. Please contact us with this reference — do not pay again.`
              : "Your payment may have gone through, but the order could not be saved. Please contact us before paying again.",
          );
        }
        toast.error(data.error || "Could not place the order");
        return;
      }

      if (data.order) {
        handleSuccess(data.order.order_number, proof);
        return;
      }
      toast.error(data.error || "We could not place your order just now. Please try again.");
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
        headers: { "content-type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          user_id: user?.uid ?? null,
          coupon_code: coupon?.code ?? null,
          // Lets the server finish the order from the gateway's own
          // confirmation if this tab never reports the payment back.
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
    const activeAddress = completedOrder?.address || address;
    const activeTotals = completedOrder?.totals || totals;
    const activeItems = completedOrder?.items || [];
    const activeMethod = completedOrder?.paymentMethod || paymentMethod;
    const isPaid = completedOrder?.paymentStatus === "paid" || activeMethod === "razorpay";
    const activeOrderNumber = completedOrder?.orderNumber || orderNumber || "RC";

    const displayItems: Array<{
      productId: string;
      name: string;
      brand: string;
      size: string;
      color: string;
      quantity: number;
      price: number;
      image: string;
    }> = activeItems.length > 0
      ? activeItems
      : items.map((i) => {
          const prod = getProduct(i.productId);
          return {
            productId: i.productId,
            name: prod?.name || "Item",
            brand: prod?.brand_name || "",
            size: i.size,
            color: i.color,
            quantity: i.quantity,
            price: prod?.sale_price && prod.sale_price > 0 ? prod.sale_price : prod?.price ?? 0,
            image: prod?.images?.[0] || "",
          };
        });

    const invoiceData: InvoiceData = {
      orderNumber: activeOrderNumber,
      invoiceNumber: `INV-${activeOrderNumber}`,
      date: completedOrder?.createdAt || new Date(),
      customerName: activeAddress.fullName || "Valued Customer",
      phone: activeAddress.phone,
      email: activeAddress.email,
      address: activeAddress.address,
      city: activeAddress.city,
      state: activeAddress.state,
      pincode: activeAddress.pincode,
      items: displayItems.map((i) => ({
        name: i.name,
        brand: i.brand,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        price: i.price,
        image: i.image,
      })),
      subtotal: activeTotals.subtotal,
      discount: activeTotals.discount,
      couponCode: activeTotals.couponCode,
      tax: activeTotals.tax,
      shipping: activeTotals.shipping,
      total: activeTotals.total,
      paymentMethod: activeMethod,
      paymentStatus: isPaid ? "paid" : "pending",
      paymentId: completedOrder?.paymentId ?? null,
    };

    const copyOrderNumber = () => {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(activeOrderNumber);
        setCopiedOrder(true);
        toast.success("Order ID copied to clipboard!");
        setTimeout(() => setCopiedOrder(false), 2000);
      }
    };

    return (
      <div className="relative min-h-[70vh] py-10 px-4 sm:px-6 lg:px-8">
        <ConfettiExplosion />

        <div className="mx-auto max-w-4xl space-y-8">
          {/* Main Success Announcement Card */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 text-center shadow-md relative overflow-hidden">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10 animate-in zoom-in-75 duration-500" />
            </div>

            <h1 className="mt-4 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Order Placed Successfully!
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
              Thank you, <span className="font-semibold text-foreground">{activeAddress.fullName}</span>! We&apos;ve received your order and are preparing it with care.
            </p>

            {/* Order Number & Meta Pills */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2 text-xs sm:text-sm font-medium">
                <span className="text-muted-foreground">Order ID:</span>
                <span className="font-mono font-bold text-foreground">{activeOrderNumber}</span>
                <button
                  type="button"
                  onClick={copyOrderNumber}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  title="Copy Order ID"
                >
                  {copiedOrder ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2 text-xs sm:text-sm">
                <Truck className="h-4 w-4 text-primary" />
                <span>Estimated Delivery: <strong>3–5 Business Days</strong></span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2 text-xs sm:text-sm">
                <Banknote className="h-4 w-4 text-primary" />
                <span>Payment: <strong>{activeMethod === "cod" ? "Cash on Delivery" : "Paid Online"}</strong></span>
                <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                  isPaid ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}>
                  {isPaid ? "Paid" : "Pending on Delivery"}
                </span>
              </div>
            </div>

            {/* Prominent Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={() => setShowInvoiceModal(true)}
                className="gap-2 h-11 px-5 font-medium shadow-sm"
              >
                <FileText className="h-4 w-4" />
                {isPaid ? "Download Tax Invoice" : "Download Order Receipt (Bill)"}
              </Button>

              <Button asChild variant="outline" className="gap-2 h-11 px-5 font-medium">
                <Link href={`/track-order?order=${activeOrderNumber}`}>
                  <Truck className="h-4 w-4" /> Track Order Status
                </Link>
              </Button>

              <Button asChild variant="ghost" className="h-11 px-5">
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </div>

            {!isPaid && (
              <p className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-amber-600" />
                <span>Official Tax Invoice will be unlocked once order is marked Paid upon delivery.</span>
              </p>
            )}
          </div>

          {/* Amazon-style Formatted Bill & Shipment Details */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="border-b border-border bg-muted/30 px-6 py-4 sm:flex sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-lg font-semibold text-foreground">Order Details & Bill</h2>
                <p className="text-xs text-muted-foreground">Order placed on {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
              </div>
              <div className="mt-2 sm:mt-0 text-right">
                <span className="text-xs text-muted-foreground block">Order Total</span>
                <span className="text-xl font-bold font-mono text-foreground">{formatPrice(activeTotals.total)}</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              {/* Delivery & Payment Address Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-border">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4 text-primary" /> Delivery Address
                  </div>
                  <p className="font-semibold text-foreground text-sm">{activeAddress.fullName}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {activeAddress.address}<br />
                    {activeAddress.city}, {activeAddress.state} — {activeAddress.pincode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="font-medium text-foreground">Phone:</span> {activeAddress.phone}
                  </p>
                  {activeAddress.email && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Email:</span> {activeAddress.email}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    <CreditCard className="h-4 w-4 text-primary" /> Payment & Billing
                  </div>
                  <p className="font-semibold text-foreground text-sm">
                    {activeMethod === "cod" ? "Cash on Delivery" : "Online Payment (Razorpay)"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status:{" "}
                    <span className={`font-semibold ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>
                      {isPaid ? "Paid in Full" : "Payment Pending (To be paid on delivery)"}
                    </span>
                  </p>
                  {completedOrder?.paymentId && (
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      Ref: {completedOrder.paymentId}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    Billed by: <span className="font-medium text-foreground">Rudraksh Collection</span>
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                  Items Ordered ({invoiceData.items.reduce((s, i) => s + i.quantity, 0)})
                </h3>

                <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                  {displayItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 hover:bg-muted/10 transition-colors">
                      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-muted border border-border">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <ShoppingBag className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground line-clamp-1">{item.name}</p>
                        {item.brand && <p className="text-xs text-muted-foreground">{item.brand}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          {item.size && (
                            <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              Size: {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              Color: {item.color}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{item.quantity} × {formatPrice(item.price)}</p>
                        <p className="font-semibold font-mono text-sm sm:text-base text-foreground mt-0.5">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formatted Bill Breakdown */}
              <div className="rounded-xl border border-border bg-muted/10 p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Bill Summary
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Items Subtotal</span>
                    <span className="font-mono text-foreground">{formatPrice(activeTotals.subtotal)}</span>
                  </div>

                  {activeTotals.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>Promotion / Coupon Discount {activeTotals.couponCode ? `(${activeTotals.couponCode})` : ""}</span>
                      <span className="font-mono">−{formatPrice(activeTotals.discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery Charges</span>
                    <span className="font-mono text-foreground">
                      {activeTotals.shipping === 0 ? <strong className="text-emerald-600">FREE</strong> : formatPrice(activeTotals.shipping)}
                    </span>
                  </div>

                  {activeTotals.tax > 0 && (
                    <div className="flex justify-between text-muted-foreground text-xs">
                      <span>Estimated GST (5% Included)</span>
                      <span className="font-mono">{formatPrice(activeTotals.tax)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-border pt-3 text-base sm:text-lg font-bold text-foreground">
                    <span>Order Total</span>
                    <span className="font-mono">{formatPrice(activeTotals.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal for viewing & printing Tax Invoice */}
        {showInvoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl my-8">
              <TaxInvoice
                data={invoiceData}
                onClose={() => setShowInvoiceModal(false)}
                showPrintButton={true}
              />
            </div>
          </div>
        )}
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
                    <Input id="fullName" name="name" autoComplete="name" aria-required="true" value={address.fullName}
                      onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                      placeholder="Enter your full name" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" name="tel" type="tel" inputMode="numeric" autoComplete="tel-national" aria-required="true" value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      placeholder="10-digit mobile number" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input id="email" name="email" type="email" autoComplete="email" value={address.email}
                    onChange={(e) => setAddress({ ...address, email: e.target.value })}
                    placeholder="your@email.com" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input id="address" name="street-address" autoComplete="street-address" aria-required="true" value={address.address}
                    onChange={(e) => setAddress({ ...address, address: e.target.value })}
                    placeholder="House no., Building, Street, Area" className="mt-1" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" name="city" autoComplete="address-level2" aria-required="true" value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder="City" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input id="state" name="state" autoComplete="address-level1" aria-required="true" value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      placeholder="State" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input id="pincode" name="postal-code" inputMode="numeric" autoComplete="postal-code" aria-required="true" value={address.pincode}
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

                <div className="space-y-3" role="radiogroup" aria-label="Payment method">
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
                    <><Spinner className="mr-2 h-4 w-4" /> {paymentMethod === "razorpay" ? "Waiting for payment..." : "Placing Order..."}</>
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
                <BuyAssurance className="mt-4" />
                <StoreTrust className="mt-3" />
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
                      writePendingCoupon(null);
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
                    aria-label="Coupon code"
                    autoComplete="off"
                    className="h-10 font-mono uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void applyCoupon()}
                    disabled={couponBusy || !couponInput.trim()}
                  >
                    {couponBusy ? <Spinner className="h-4 w-4" /> : "Apply"}
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
                  <div className="flex justify-between text-sage-ink">
                    <span>Discount</span>
                    <span>−{formatPrice(totals.discount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Shipping
                    {quotedFee !== null && typeof deliveryQuote?.distanceKm === "number"
                      ? ` (about ${deliveryQuote.distanceKm} km)`
                      : ""}
                  </span>
                  <span>{shipping === 0 ? <span className="text-sage-ink">FREE</span> : formatPrice(shipping)}</span>
                </div>
                {distancePricing && quotedFee === null && shipping > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Delivery is priced by distance — enter your PIN code for the exact charge.
                  </p>
                ) : null}
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
        <main id="main">
          <CheckoutContent />
        </main>
        <Footer />
      </div>
    </>
  );
}
