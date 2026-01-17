"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, MapPin, CreditCard, Banknote, Wallet, Check, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CartProvider, useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/store-data";
import { toast } from "sonner";

type Address = {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

function CheckoutContent() {
  const router = useRouter();
  const { items, getCartTotal, getProduct, clearCart } = useCart();
  const [step, setStep] = useState<"address" | "payment" | "success">("address");
  const [address, setAddress] = useState<Address>({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const cartTotal = getCartTotal();
  const shipping = cartTotal >= 999 ? 0 : 99;
  const grandTotal = cartTotal + shipping - discount;

  if (items.length === 0 && step !== "success") {
    router.push("/cart");
    return null;
  }

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === "FESTIVE50") {
      const discountAmount = Math.min(cartTotal * 0.1, 500);
      setDiscount(discountAmount);
      toast.success(`Coupon applied! You save ${formatPrice(discountAmount)}`);
    } else {
      toast.error("Invalid coupon code");
    }
  };

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
    await new Promise((resolve) => setTimeout(resolve, 2000));
    clearCart();
    setStep("success");
    setIsProcessing(false);
  };

  if (step === "success") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
        >
          <Check className="h-10 w-10 text-green-600" />
        </motion.div>
        <h1 className="mt-6 font-serif text-2xl font-bold">Order Placed Successfully!</h1>
        <p className="mt-2 text-muted-foreground">
          Thank you for shopping with Rudraksh Collection. Your order will be delivered within 3-5 business days.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Order confirmation sent to your phone via SMS.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button asChild>
            <Link href="/products">Continue Shopping</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/account">Track Your Order</Link>
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
        <ChevronLeft className="h-4 w-4" />
        Back to Cart
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-6 flex items-center gap-4">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              step === "address" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              1
            </div>
            <span className={step === "address" ? "font-medium" : "text-muted-foreground"}>
              Delivery Address
            </span>
            <div className="h-px flex-1 bg-border" />
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              step === "payment" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              2
            </div>
            <span className={step === "payment" ? "font-medium" : "text-muted-foreground"}>
              Payment
            </span>
          </div>

          {step === "address" && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-lg font-semibold">Delivery Address</h2>
              </div>

              <form onSubmit={handleAddressSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={address.fullName}
                      onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                      placeholder="Enter your full name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      placeholder="10-digit mobile number"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address.address}
                    onChange={(e) => setAddress({ ...address, address: e.target.value })}
                    placeholder="House no., Building, Street, Area"
                    className="mt-1"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder="City"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      placeholder="State"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={address.pincode}
                      onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                      placeholder="6-digit pincode"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full">
                  Continue to Payment
                </Button>
              </form>
            </motion.div>
          )}

          {step === "payment" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">Delivering to</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep("address")}>
                    Change
                  </Button>
                </div>
                <p className="text-sm">
                  {address.fullName}, {address.phone}
                  <br />
                  {address.address}
                  <br />
                  {address.city}, {address.state} - {address.pincode}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h2 className="font-serif text-lg font-semibold">Payment Method</h2>
                </div>

                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  <div className={`flex items-center gap-3 rounded-lg border p-4 ${
                    paymentMethod === "upi" ? "border-primary bg-primary/5" : "border-border"
                  }`}>
                    <RadioGroupItem value="upi" id="upi" />
                    <Label htmlFor="upi" className="flex flex-1 cursor-pointer items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <span className="text-sm font-bold">UPI</span>
                      </div>
                      <div>
                        <p className="font-medium">UPI Payment</p>
                        <p className="text-xs text-muted-foreground">Google Pay, PhonePe, Paytm</p>
                      </div>
                    </Label>
                  </div>

                  <div className={`flex items-center gap-3 rounded-lg border p-4 ${
                    paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border"
                  }`}>
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex flex-1 cursor-pointer items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Credit / Debit Card</p>
                        <p className="text-xs text-muted-foreground">Visa, Mastercard, RuPay</p>
                      </div>
                    </Label>
                  </div>

                  <div className={`flex items-center gap-3 rounded-lg border p-4 ${
                    paymentMethod === "wallet" ? "border-primary bg-primary/5" : "border-border"
                  }`}>
                    <RadioGroupItem value="wallet" id="wallet" />
                    <Label htmlFor="wallet" className="flex flex-1 cursor-pointer items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Wallet</p>
                        <p className="text-xs text-muted-foreground">Paytm, Amazon Pay</p>
                      </div>
                    </Label>
                  </div>

                  <div className={`flex items-center gap-3 rounded-lg border p-4 ${
                    paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-border"
                  }`}>
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="flex flex-1 cursor-pointer items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Banknote className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Cash on Delivery</p>
                        <p className="text-xs text-muted-foreground">Pay when you receive</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                <Button
                  size="lg"
                  className="mt-6 w-full"
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : `Place Order - ${formatPrice(grandTotal)}`}
                </Button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Secure payment powered by Razorpay</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-serif text-lg font-semibold">Order Summary</h2>

              <div className="mt-4 max-h-64 space-y-3 overflow-y-auto">
                {items.map((item) => {
                  const product = getProduct(item.productId);
                  if (!product) return null;
                  return (
                    <div key={`${item.productId}-${item.size}`} className="flex gap-3">
                      <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image src={product.image} alt={product.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.size} × {item.quantity}
                        </p>
                        <p className="text-sm font-medium">{formatPrice(product.price * item.quantity)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
                <Button variant="outline" onClick={applyCoupon}>
                  Apply
                </Button>
              </div>

              <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? <span className="text-green-600">FREE</span> : formatPrice(shipping)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(grandTotal)}</span>
                </div>
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
