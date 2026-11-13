"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "@/components/store-image";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Edit2,
  FileText,
  Heart,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store-context";
import {
  effectivePrice,
  formatPrice,
  normalizeAddress,
  subscribeProducts,
  subscribeUserOrders,
} from "@/lib/firebase";
import type { ActivityEvent, Address, Order, Product } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import { useWishlist } from "@/lib/use-wishlist";
import { SignInForm } from "@/components/kit/sign-in-form";
import { AccountSection, ActivityRow } from "@/components/kit/account-card";
import { PageSpinner } from "@/components/kit/spinner";
import {
  createEmailAccount,
  logActivity,
  setRememberSession,
  signInWithEmailAccount,
  subscribeActivity,
} from "@/lib/firebase";

import { Spinner } from "@/components/ui/spinner";
import { SealLoader } from "@/components/kit/brand-mark";
import { CustomerCancelOrder } from "@/components/customer-cancel-order";
const ORDER_STEPS: Array<{ key: Order["order_status"]; label: string }> = [
  { key: "placed", label: "Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

const statusClasses: Record<string, string> = {
  placed: "bg-muted text-muted-foreground",
  confirmed: "bg-amber-100 text-amber-700",
  packed: "bg-amber-100 text-amber-700",
  shipped: "bg-blue-100 text-blue-700",
  delivered: "bg-sage/10 text-sage-ink",
  cancelled: "bg-destructive/10 text-destructive",
};

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

function FirebaseNotConfigured() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
        <AlertCircle className="h-10 w-10 text-amber-600" />
      </div>
      <h1 className="mt-6 font-serif text-2xl font-bold">Sign-in is not configured</h1>
      <p className="mt-3 text-muted-foreground">
        Firebase credentials are missing from this deployment. Add the{" "}
        <code className="rounded bg-muted px-1">FIREBASE_*</code> environment variables
        and rebuild.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Continue Shopping</Link>
      </Button>
    </div>
  );
}

function LoginScreen() {
  const { initRecaptcha, sendPhoneOTP, verifyPhoneOTP, loginWithGoogle, error, clearError, isConfigured } =
    useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState<"otp" | "verify" | "google" | null>(null);
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [creating, setCreating] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const recaptchaHostId = "recaptcha-container";

  const authMessage = (code: string) => {
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
  };

  const handleEmail = async ({ email, password, remember }: { email: string; password: string; remember: boolean }) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await setRememberSession(remember);
      if (creating) await createEmailAccount(email, password);
      else await signInWithEmailAccount(email, password);
      toast.success(creating ? "Account created" : "Signed in");
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "unknown";
      setAuthError(authMessage(code));
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (isConfigured && mode === "phone") initRecaptcha(recaptchaHostId);
  }, [initRecaptcha, isConfigured, mode]);

  if (!isConfigured) return <FirebaseNotConfigured />;

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setBusy("otp");
    const ok = await sendPhoneOTP(phone);
    setBusy(null);
    if (ok) {
      setStep("otp");
      toast.success("OTP sent to +91 " + phone);
    } else {
      toast.error(error || "Could not send the OTP");
      clearError();
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy("verify");
    const ok = await verifyPhoneOTP(otp);
    setBusy(null);
    if (ok) toast.success("Signed in successfully");
    else {
      toast.error(error || "That code did not work");
      clearError();
    }
  };

  const handleGoogle = async () => {
    setBusy("google");
    const result = await loginWithGoogle();
    setBusy(null);
    if (result.ok) toast.success("Signed in with Google");
    else {
      toast.error(result.error || "Google sign-in failed");
      clearError();
    }
  };

  return (
    <div className="relative min-h-[80vh] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-saffron/5" />
      <div className="relative mx-auto max-w-md px-4 py-16 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
            <Sparkles className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="mt-6 font-serif text-3xl font-bold">Welcome to Rudraksh</h1>
          <p className="mt-2 text-muted-foreground">Sign in to track orders and save addresses</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8 rounded-2xl border border-border bg-card/80 p-6 shadow-xl shadow-black/5 backdrop-blur-sm"
        >
          <AnimatePresence mode="wait">
            {mode === "email" ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <SignInForm
                  title={creating ? "Create your account" : "Sign in"}
                  subtitle={
                    creating
                      ? "One account for orders, addresses and saved pieces."
                      : "Welcome back — your orders and addresses are waiting."
                  }
                  onSubmit={handleEmail}
                  onGoogle={handleGoogle}
                  loading={authLoading || busy === "google"}
                  error={authError}
                  footer={
                    <div className="space-y-3 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setCreating((prev) => !prev);
                          setAuthError(null);
                        }}
                        className="w-full text-center text-primary hover:underline"
                      >
                        {creating ? "Already have an account? Sign in" : "New here? Create an account"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("phone")}
                        className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                      >
                        Prefer a mobile OTP? Use your number instead
                      </button>
                    </div>
                  }
                />
              </motion.div>
            ) : step === "phone" ? (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">Mobile Number</Label>
                  <div className="mt-2 flex gap-2">
                    <div className="flex h-12 items-center rounded-xl border border-input bg-muted/50 px-4 text-sm font-medium">
                      🇮🇳 +91
                    </div>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      autoComplete="tel"
                      className="h-12 flex-1 rounded-xl text-lg"
                    />
                  </div>
                </div>

                <div id={recaptchaHostId} className="flex justify-center" />

                <button
                  type="button"
                  onClick={() => setMode("email")}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  Use email and password instead
                </button>

                <Button onClick={handleSendOTP} className="h-12 w-full rounded-xl text-base" disabled={busy !== null}>
                  {busy === "otp" ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="h-4 w-4" /> Sending OTP…
                    </span>
                  ) : (
                    <><Phone className="mr-2 h-4 w-4" /> Send OTP</>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button variant="outline" onClick={handleGoogle} className="h-12 w-full rounded-xl text-base" disabled={busy !== null}>
                  {busy === "google" ? <Spinner className="mr-2 h-4 w-4" /> : <GoogleIcon />}
                  <span className="ml-2">Google</span>
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to</p>
                  <p className="mt-1 font-medium">+91 {phone}</p>
                  <button onClick={() => setStep("phone")} className="mt-1 text-sm text-primary hover:underline">
                    Change number
                  </button>
                </div>

                <Input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="h-14 text-center text-2xl tracking-[0.5em]"
                />

                <Button onClick={handleVerify} className="h-12 w-full rounded-xl text-base" disabled={busy !== null}>
                  {busy === "verify" ? (
                    <><Spinner className="mr-2 h-4 w-4" /> Verifying…</>
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>

                <button onClick={handleSendOTP} className="w-full text-center text-sm text-primary hover:underline">
                  Resend OTP
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

function PhoneVerificationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { initRecaptcha, sendPhoneOTP, verifyPhoneOTP, updateProfile, error, clearError, isConfigured } =
    useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const hostId = "modal-recaptcha";

  useEffect(() => {
    if (open && isConfigured) initRecaptcha(hostId);
  }, [open, initRecaptcha, isConfigured]);

  const reset = () => {
    setPhone("");
    setOtp("");
    setStep("phone");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Verify your mobile number
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === "phone" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Add a verified mobile number for order updates and delivery calls.
              </p>
              <div className="flex gap-2">
                <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">+91</div>
                <Input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit number"
                  inputMode="numeric"
                  className="flex-1"
                />
              </div>
              <div id={hostId} className="flex justify-center" />
              <Button
                onClick={async () => {
                  if (phone.length !== 10) return toast.error("Enter a valid 10-digit number");
                  setBusy(true);
                  const ok = await sendPhoneOTP(phone);
                  setBusy(false);
                  if (ok) {
                    setStep("otp");
                    toast.success("OTP sent");
                  } else {
                    toast.error(error || "Could not send OTP");
                    clearError();
                  }
                }}
                className="w-full"
                disabled={busy}
              >
                {busy ? <><Spinner className="mr-2 h-4 w-4" /> Sending…</> : "Send OTP"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground">Enter the code sent to +91 {phone}</p>
              <Input
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit OTP"
                inputMode="numeric"
                className="text-center text-lg tracking-[0.4em]"
              />
              <Button
                onClick={async () => {
                  if (otp.length !== 6) return toast.error("Enter the 6-digit code");
                  setBusy(true);
                  const ok = await verifyPhoneOTP(otp);
                  if (ok) {
                    await updateProfile({ phone: `+91${phone}`, phoneVerified: true });
                    toast.success("Mobile number verified");
                    reset();
                    onClose();
                  } else {
                    toast.error(error || "Verification failed");
                    clearError();
                  }
                  setBusy(false);
                }}
                className="w-full"
                disabled={busy}
              >
                {busy ? <><Spinner className="mr-2 h-4 w-4" /> Verifying…</> : "Verify"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OrdersTab() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeUserOrders(user.uid, setOrders);
  }, [user]);

  if (!user) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
          <Package className="h-5 w-5 text-primary" /> My Orders
        </h2>
        <span className="text-sm text-muted-foreground">
          {orders ? `${orders.length} order${orders.length === 1 ? "" : "s"}` : ""}
        </span>
      </div>

      {orders === null ? (
        <div className="flex justify-center py-12">
          <SealLoader size={40} showLabel={false} />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="rounded-full bg-muted p-6">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
          <p className="mt-4 font-medium">No orders yet</p>
          <p className="text-sm text-muted-foreground">Orders placed with this account appear here.</p>
          <Button asChild className="mt-6">
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, orderIndex) => (
            <div key={order.id || order.order_number || `order-${orderIndex}`} className="rounded-lg border border-border p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-medium">{order.order_number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusClasses[order.order_status] ?? "bg-muted"}`}>
                      {order.order_status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.items?.length ?? 0} item(s) • {order.payment_method.toUpperCase()} •{" "}
                    {new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.address}, {order.city}, {order.state} — {order.pincode}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{formatPrice(order.total)}</p>
                  <div className="mt-1 flex items-center justify-end gap-2">
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                      <Link href={`/invoice?order=${order.order_number}`}>
                        <FileText className="h-3.5 w-3.5" /> Invoice
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                      <Link href={`/track-order?order=${order.order_number}`}>Track order</Link>
                    </Button>
                    <CustomerCancelOrder order={order} />
                  </div>
                </div>
              </div>

              {order.items?.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-border pt-3">
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.productId}-${index}`}
                      className={`flex items-center justify-between text-sm ${item.cancelled ? "line-through opacity-60" : ""}`}
                    >
                      <span className="text-muted-foreground">
                        {item.name} ({item.size}{item.color ? `, ${item.color}` : ""}) × {item.quantity}
                        {item.cancelled ? " — cancelled" : ""}
                      </span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const { ids: wishlist } = useWishlist();

  useEffect(() => subscribeProducts(setProducts), []);

  const saved = useMemo(() => products.filter((product) => wishlist.includes(product.id)), [products, wishlist]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-6 flex items-center gap-2 font-serif text-lg font-semibold">
        <Heart className="h-5 w-5 text-primary" /> My Wishlist
      </h2>

      {saved.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="rounded-full bg-muted p-6">
            <Heart className="h-12 w-12 text-muted-foreground" />
          </div>
          <p className="mt-4 font-medium">Your wishlist is empty</p>
          <p className="text-sm text-muted-foreground">Tap the heart on any product to save it here.</p>
          <Button asChild className="mt-6">
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {saved.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="flex gap-3 rounded-xl border border-border p-3 hover:border-primary/30"
            >
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {product.images?.[0] && (
                  <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="64px" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium line-clamp-2">{product.name}</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatPrice(effectivePrice(product))}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressesTab() {
  const { profile, updateProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Address>>({});
  const addresses = profile?.addresses ?? [];

  const save = async () => {
    const address = normalizeAddress(draft);
    if (!address.fullName || !address.phone || !address.address || !address.city || !address.state || !address.pincode) {
      toast.error("Please fill in every field");
      return;
    }
    if (address.phone.replace(/\D/g, "").length !== 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    const next = [...addresses, { ...address, isDefault: addresses.length === 0 }];
    const ok = await updateProfile({ addresses: next });
    if (ok) {
      toast.success("Address saved");
      setDraft({});
      setOpen(false);
    } else {
      toast.error("Could not save the address");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
          <MapPin className="h-5 w-5 text-primary" /> Saved Addresses
        </h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="rounded-full bg-muted p-6">
            <MapPin className="h-12 w-12 text-muted-foreground" />
          </div>
          <p className="mt-4 font-medium">No addresses saved</p>
          <p className="text-sm text-muted-foreground">Save an address for faster checkout.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="relative rounded-xl border border-border p-4">
              {address.isDefault && (
                <span className="absolute right-2 top-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  Default
                </span>
              )}
              <p className="font-medium">{address.fullName}</p>
              <p className="text-sm text-muted-foreground">{address.phone}</p>
              <p className="mt-2 text-sm">{address.address}</p>
              <p className="text-sm">{address.city}, {address.state} — {address.pincode}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-destructive hover:text-destructive"
                onClick={async () => {
                  const ok = await updateProfile({ addresses: addresses.filter((item) => item.id !== address.id) });
                  if (ok) toast.success("Address removed");
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a new address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Full Name</Label>
                <Input value={draft.fullName ?? ""} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={draft.phone ?? ""}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  inputMode="numeric"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} className="mt-1" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>City</Label>
                <Input value={draft.city ?? ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>State</Label>
                <Input value={draft.state ?? ""} onChange={(e) => setDraft({ ...draft, state: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Pincode</Label>
                <Input
                  value={draft.pincode ?? ""}
                  onChange={(e) => setDraft({ ...draft, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  inputMode="numeric"
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={save} className="w-full">Save Address</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActivityFeed({ uid }: { uid: string }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeActivity(uid, (rows) => {
      setEvents(rows);
      setReady(true);
    });
    return unsubscribe;
  }, [uid]);

  const icons: Record<string, LucideIcon> = {
    signin: Shield,
    order: Package,
    wishlist: Heart,
    profile: User,
  };

  if (!ready) return <PageSpinner label="Loading activity" />;

  if (events.length === 0) {
    return (
      <AccountSection title="Recent activity" description="Sign-ins, orders and saved pieces show up here.">
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nothing yet — your first order or saved piece will appear here.
        </p>
      </AccountSection>
    );
  }

  return (
    <AccountSection title="Recent activity" description="Everything you have done on this account, newest first.">
      <div className="divide-y divide-border">
        {events.slice(0, 25).map((event) => (
          <ActivityRow
            key={event.id}
            icon={icons[event.type] ?? Sparkles}
            title={event.label}
            meta={event.meta ? `${event.meta} · ${new Date(event.at).toLocaleString("en-IN")}` : new Date(event.at).toLocaleString("en-IN")}
            href={event.href}
          />
        ))}
      </div>
    </AccountSection>
  );
}

function AccountContent() {
  const { user, profile, loading, logout, updateProfile, isConfigured } = useAuth();
  const store = useStore();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    setName(profile?.displayName ?? "");
    setEmail(profile?.email ?? "");
  }, [profile?.displayName, profile?.email]);

  if (!isConfigured) return <FirebaseNotConfigured />;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <SealLoader size={56} showLabel={false} />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const displayName = profile?.displayName || user.displayName || "Welcome";
  const initial = (displayName || user.email || "U")[0]?.toUpperCase() ?? "U";

  return (
    <div className="relative min-h-screen">
      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {profile?.photoURL ? (
                <Image
                  src={profile.photoURL}
                  alt="Profile"
                  width={72}
                  height={72}
                  className="h-18 w-18 rounded-full border-4 border-white/20 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                  {initial}
                </div>
              )}
              <div>
                <h1 className="font-serif text-2xl font-bold">{displayName}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-primary-foreground/80">
                  {profile?.phoneVerified && profile?.phone && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> {profile.phone}
                    </span>
                  )}
                  {(profile?.email || user.email) && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" /> {profile?.email || user.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>

        {!profile?.phoneVerified && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-saffron/30 bg-saffron/10 p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-saffron-ink" />
              <div>
                <p className="font-medium">Verify your mobile number</p>
                <p className="text-sm text-muted-foreground">Get delivery updates on SMS and WhatsApp</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setVerifyOpen(true)}>Verify Now</Button>
          </div>
        )}

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1 sm:grid-cols-5">
            <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" /> Profile</TabsTrigger>
            <TabsTrigger value="orders"><Package className="mr-2 h-4 w-4" /> Orders</TabsTrigger>
            <TabsTrigger value="addresses"><MapPin className="mr-2 h-4 w-4" /> Addresses</TabsTrigger>
            <TabsTrigger value="wishlist"><Heart className="mr-2 h-4 w-4" /> Wishlist</TabsTrigger>
            <TabsTrigger value="activity"><Sparkles className="mr-2 h-4 w-4" /> Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <ActivityFeed uid={user.uid} />
          </TabsContent>

          <TabsContent value="profile">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
                  <User className="h-5 w-5 text-primary" /> Personal Details
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
                  <Edit2 className="mr-2 h-4 w-4" /> {editing ? "Cancel" : "Edit"}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Full Name</Label>
                    {editing ? (
                      <Input value={name} onChange={(event) => setName(event.target.value)} />
                    ) : (
                      <p className="font-medium">{profile?.displayName || "Not set"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Email</Label>
                    {editing ? (
                      <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                    ) : (
                      <p className="font-medium">{profile?.email || user.email || "Not set"}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Mobile Number</Label>
                      <p className="flex items-center gap-2 font-medium">
                        {profile?.phone || "Not verified"}
                        {profile?.phoneVerified && (
                          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </span>
                        )}
                      </p>
                    </div>
                    {!profile?.phoneVerified && (
                      <Button variant="outline" size="sm" onClick={() => setVerifyOpen(true)}>Verify</Button>
                    )}
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
                  <label htmlFor="new-arrival-emails" className="cursor-pointer">
                    <span className="block text-sm font-medium">New arrival emails</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {profile?.email
                        ? "An email when we add new products — one a day at most. Order updates are sent either way."
                        : "Add an email address above to hear about new products."}
                    </span>
                  </label>
                  <Switch
                    id="new-arrival-emails"
                    checked={profile?.notifications?.newProducts !== false}
                    disabled={!profile?.email}
                    onCheckedChange={async (checked) => {
                      const ok = await updateProfile({ notifications: { newProducts: checked } });
                      if (ok) toast.success(checked ? "New arrival emails are on" : "New arrival emails are off");
                      else toast.error("Could not save that. Please try again.");
                    }}
                  />
                </div>

                {editing && (
                  <Button
                    className="w-full"
                    onClick={async () => {
                      const ok = await updateProfile({ displayName: name.trim(), email: email.trim() });
                      if (ok) {
                        void logActivity(user.uid, {
                          type: "profile",
                          label: "Profile details updated",
                          href: "/account",
                        });
                        toast.success("Profile updated");
                        setEditing(false);
                      } else {
                        toast.error("Could not update the profile");
                      }
                    }}
                  >
                    Save Changes
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders"><OrdersTab /></TabsContent>
          <TabsContent value="addresses"><AddressesTab /></TabsContent>
          <TabsContent value="wishlist"><WishlistTab /></TabsContent>
        </Tabs>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/track-order"
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary/10 p-3"><Package className="h-6 w-6 text-primary" /></div>
              <div>
                <span className="font-medium">Track Order</span>
                <p className="text-sm text-muted-foreground">Check delivery status</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/contact"
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-500/10 p-3"><Phone className="h-6 w-6 text-green-600" /></div>
              <div>
                <span className="font-medium">Need Help?</span>
                <p className="text-sm text-muted-foreground">Contact {store.name}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      <PhoneVerificationModal open={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main"><AccountContent /></main>
      <Footer />
    </div>
  );
}
