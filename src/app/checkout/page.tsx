"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, MapPin, Banknote, Check, Shield, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CartProvider, useCart } from "@/lib/cart-context";
import { formatPrice, createOrder } from "@/lib/store-data";
import { storeConfig } from "@/lib/config";
import { toast } from "sonner";

type Address = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

function CheckoutContent() {
  const { items, getCartTotal, getProduct, clearCart, setProducts, isHydrated } = useCart();
  const [step, setStep] = useState<"address" | "payment" | "success">("address");
  const [address, setAddress] = useState<Address>({
    fullName: "", phone: "", email: "", address: "", city: "", state: "", pincode: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">("cod");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const cartTotal = getCartTotal();
  const shipping = cartTotal >= storeConfig.freeShippingThreshold ? 0 : storeConfig.shippingFee;
  const grandTotal = cartTotal + shipping;

  useEffect(() => {
    if (items.length > 0) {
      fetch("/api/products?limit=100").then(r => r.json()).then(r => {
        if (r.products) setProducts(r.products);
      }).catch(() => {});
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

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    try {
      const orderItems = items.map(item => {
        const product = getProduct(item.productId);
        return {
          productId: item.productId,
          name: product?.name || "Unknown",
          brand: product?.brand_name || "",
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          price: product?.sale_price ?? product?.price ?? 0,
          image: product?.images[0] || "",
        };
      });

      const result = await createOrder({
        customer_name: address.fullName,
        phone: address.phone,
        email: address.email || undefined,
        address: address.address,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        items: orderItems,
        subtotal: cartTotal,
        shipping,
        total: grandTotal,
        payment_method: paymentMethod,
      });

      if (result.ok && result.order) {
        setOrderNumber(result.order.order_number);
        clearCart();
        setStep("success");
        toast.success("Order placed successfully!");
      } else {
        toast.error(result.error || "Failed to place order");
      }
    } catch {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (step === "success") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sage/10"
        >
          <Check className="h-10 w-10 text-sage" />
        </motion.div>
        <h1 className="mt-6 font-serif text-2xl font-medium">Order Confirmed!</h1>
        <p className="mt-2 text-muted-foreground">
          Thank you for shopping with Rudraksh Collection.
        </p>
        {orderNumber && (
          <p className="mt-3 text-sm">
            Order number: <span className="font-mono font-medium">{orderNumber}</span>
          </p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll contact you shortly to confirm your order.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button asChild>
            <Link href="/products">Continue Shopping</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/account">View Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/cart"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Cart
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-6 flex items-center gap-4">
            {(["address", "payment"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-4">
                {i > 0 && <div className="h-px w-12 bg-border sm:w-24" />}
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <span className={step === s ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
                  {s === "address" ? "Delivery Address" : "Payment"}
                </span>
              </div>
            ))}
          </div>

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

                  {storeConfig.razorpayEnabled && (
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

                <Button
                  size="lg" className="mt-6 w-full"
                  onClick={handlePlaceOrder} disabled={isProcessing}
                >
                  {isProcessing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing Order...</>
                  ) : (
                    `Place Order — ${formatPrice(grandTotal)}`
                  )}
                </Button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Secure checkout</span>
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

            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shipping === 0 ? <span className="text-sage">FREE</span> : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total</span>
                <span>{formatPrice(grandTotal)}</span>
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
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <main>
          <CheckoutContent />
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
