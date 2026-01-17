"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, Package, MapPin, Heart, LogOut, Phone, ChevronRight, Mail, Shield, CheckCircle2, Sparkles, Edit2, Plus, Trash2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type Address } from "@/lib/firebase";

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
    <div className="relative min-h-[80vh] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-saffron/5" />
      <div className="relative mx-auto max-w-md px-4 py-16 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="mt-6 font-serif text-2xl font-bold">Firebase Setup Required</h1>
          <p className="mt-3 text-muted-foreground">
            To enable authentication, please configure Firebase credentials in your environment variables.
          </p>
          
            <div className="mt-8 rounded-xl border border-border bg-card p-6 text-left">
              <h3 className="font-semibold mb-3">Required Environment Variables:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground font-mono">
                <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
                <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
                <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
                <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
                <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
                <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
              </ul>
            </div>

          <Button asChild className="mt-6">
            <Link href="/">Continue Shopping</Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function LoginScreen() {
  const { initRecaptcha, sendPhoneOTP, verifyPhoneOTP, loginWithGoogle, error, clearError, isConfigured } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isConfigured && recaptchaRef.current) {
      initRecaptcha("recaptcha-container");
    }
  }, [initRecaptcha, isConfigured]);

  if (!isConfigured) {
    return <FirebaseNotConfigured />;
  }

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    setIsLoading(true);
    const success = await sendPhoneOTP(phone);
    setIsLoading(false);
    if (success) {
      setStep("otp");
      toast.success("OTP sent successfully!");
    } else if (error) {
      toast.error(error);
      clearError();
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }
    setIsLoading(true);
    const success = await verifyPhoneOTP(otp);
    setIsLoading(false);
    if (success) {
      toast.success("Phone verified successfully!");
    } else if (error) {
      toast.error(error);
      clearError();
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const success = await loginWithGoogle();
    setIsLoading(false);
    if (success) {
      toast.success("Signed in with Google!");
    } else if (error) {
      toast.error(error);
      clearError();
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = otp.split("");
    newOtp[index] = value;
    setOtp(newOtp.join(""));
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="relative min-h-[80vh] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-saffron/5" />
      <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-saffron/10 blur-3xl" />
      
      <div className="relative mx-auto max-w-md px-4 py-16 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
            <Sparkles className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="mt-6 font-serif text-3xl font-bold bg-gradient-to-r from-primary to-terracotta bg-clip-text text-transparent">
            Welcome to Rudraksh
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to access your account
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8"
        >
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-xl shadow-black/5">
            <AnimatePresence mode="wait">
              {step === "phone" ? (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                    <div className="mt-2 flex gap-2">
                      <div className="flex h-12 items-center rounded-xl border border-input bg-muted/50 px-4 text-sm font-medium">
                        🇮🇳 +91
                      </div>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="Enter 10-digit number"
                        className="h-12 flex-1 rounded-xl text-lg"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleSendOTP} 
                    className="h-12 w-full rounded-xl text-base font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                        />
                        Sending OTP...
                      </span>
                    ) : (
                      <>
                        <Phone className="mr-2 h-4 w-4" />
                        Send OTP
                      </>
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

                  <Button
                    variant="outline"
                    onClick={handleGoogleLogin}
                    className="h-12 w-full rounded-xl text-base"
                    disabled={isLoading}
                  >
                    <GoogleIcon />
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
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code sent to
                    </p>
                    <p className="mt-1 font-medium">+91 {phone}</p>
                    <button
                      onClick={() => setStep("phone")}
                      className="mt-1 text-sm text-primary hover:underline"
                    >
                      Change number
                    </button>
                  </div>
                  
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        ref={(el) => { otpInputsRef.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otp[index] || ""}
                        onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="h-14 w-12 rounded-xl border border-input bg-background text-center text-xl font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    ))}
                  </div>

                  <Button
                    onClick={handleVerifyOTP}
                    className="h-12 w-full rounded-xl text-base font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? "Verifying..." : "Verify OTP"}
                  </Button>

                  <button
                    onClick={handleSendOTP}
                    className="w-full text-center text-sm text-primary hover:underline"
                  >
                    Resend OTP
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>

        <div id="recaptcha-container" ref={recaptchaRef} />
      </div>
    </div>
  );
}

function PhoneVerificationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { initRecaptcha, sendPhoneOTP, verifyPhoneOTP, updateProfile, error, clearError, isConfigured } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && isConfigured && recaptchaRef.current) {
      initRecaptcha("modal-recaptcha");
    }
  }, [isOpen, initRecaptcha, isConfigured]);

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    setIsLoading(true);
    const success = await sendPhoneOTP(phone);
    setIsLoading(false);
    if (success) {
      setStep("otp");
      toast.success("OTP sent!");
    } else if (error) {
      toast.error(error);
      clearError();
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error("Enter valid 6-digit OTP");
      return;
    }
    setIsLoading(true);
    const success = await verifyPhoneOTP(otp);
    if (success) {
      await updateProfile({ phone: `+91${phone}`, phoneVerified: true });
      toast.success("Phone verified!");
      onClose();
    } else if (error) {
      toast.error(error);
      clearError();
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Verify Phone Number
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {step === "phone" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Verify your phone number once for order updates and notifications.
              </p>
              <div className="flex gap-2">
                <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">+91</div>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit number"
                  className="flex-1"
                />
              </div>
              <Button onClick={handleSendOTP} className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send OTP"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Enter OTP sent to +91 {phone}
              </p>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit OTP"
                className="text-center text-lg tracking-widest"
              />
              <Button onClick={handleVerify} className="w-full" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify"}
              </Button>
            </>
          )}
        </div>
        <div id="modal-recaptcha" ref={recaptchaRef} />
      </DialogContent>
    </Dialog>
  );
}

function ProfileContent() {
  const { user, profile, logout, updateProfile, isConfigured } = useAuth();
  const [showPhoneVerify, setShowPhoneVerify] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState(profile?.displayName || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<Address>>({});

  useEffect(() => {
    if (profile) {
      setName(profile.displayName || "");
      setEmail(profile.email || "");
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    await updateProfile({ displayName: name, email });
    setEditingProfile(false);
    toast.success("Profile updated!");
  };

  const handleAddAddress = async () => {
    if (!newAddress.fullName || !newAddress.phone || !newAddress.address || !newAddress.city || !newAddress.state || !newAddress.pincode) {
      toast.error("Please fill all fields");
      return;
    }
    const addresses = profile?.addresses || [];
    const address: Address = {
      ...newAddress as Address,
      id: Date.now().toString(),
      isDefault: addresses.length === 0,
    };
    await updateProfile({ addresses: [...addresses, address] });
    setShowAddAddress(false);
    setNewAddress({});
    toast.success("Address added!");
  };

  const handleDeleteAddress = async (id: string) => {
    const addresses = (profile?.addresses || []).filter((a) => a.id !== id);
    await updateProfile({ addresses });
    toast.success("Address removed");
  };

  if (!isConfigured) {
    return <FirebaseNotConfigured />;
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      
      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground shadow-lg">
            <div className="flex items-center gap-4">
              {profile?.photoURL ? (
                <Image
                  src={profile.photoURL}
                  alt="Profile"
                  width={72}
                  height={72}
                  className="rounded-full border-4 border-white/20"
                />
              ) : (
                <div className="flex h-18 w-18 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                  {(profile?.displayName || user.email || "U")[0].toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="font-serif text-2xl font-bold">
                  {profile?.displayName || "Welcome!"}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-primary-foreground/80">
                  {profile?.phoneVerified && profile.phone && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      {profile.phone}
                    </span>
                  )}
                  {profile?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {profile.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={logout}
              className="shrink-0"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>

          {!profile?.phoneVerified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 flex items-center justify-between rounded-xl border border-saffron/30 bg-saffron/10 p-4"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-saffron" />
                <div>
                  <p className="font-medium text-foreground">Verify your phone</p>
                  <p className="text-sm text-muted-foreground">Get order updates via SMS</p>
                </div>
              </div>
              <Button onClick={() => setShowPhoneVerify(true)} size="sm">
                Verify Now
              </Button>
            </motion.div>
          )}
        </motion.div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Package className="mr-2 h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="addresses" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <MapPin className="mr-2 h-4 w-4" />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Heart className="mr-2 h-4 w-4" />
              Wishlist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
                  <User className="h-5 w-5 text-primary" />
                  Personal Details
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setEditingProfile(!editingProfile)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  {editingProfile ? "Cancel" : "Edit"}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Full Name</Label>
                    {editingProfile ? (
                      <Input value={name} onChange={(e) => setName(e.target.value)} />
                    ) : (
                      <p className="font-medium">{profile?.displayName || "Not set"}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Email</Label>
                    {editingProfile ? (
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    ) : (
                      <p className="font-medium">{profile?.email || "Not set"}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Phone Number</Label>
                      <p className="flex items-center gap-2 font-medium">
                        {profile?.phone || "Not verified"}
                        {profile?.phoneVerified && (
                          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </p>
                    </div>
                    {!profile?.phoneVerified && (
                      <Button variant="outline" size="sm" onClick={() => setShowPhoneVerify(true)}>
                        Verify
                      </Button>
                    )}
                  </div>
                </div>

                {editingProfile && (
                  <Button onClick={handleSaveProfile} className="w-full">
                    Save Changes
                  </Button>
                )}
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="orders">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <h2 className="flex items-center gap-2 font-serif text-lg font-semibold mb-6">
                <Package className="h-5 w-5 text-primary" />
                My Orders
              </h2>
              <div className="flex flex-col items-center py-12 text-center">
                <div className="rounded-full bg-muted p-6">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="mt-4 font-medium">No orders yet</p>
                <p className="text-sm text-muted-foreground">Your orders will appear here</p>
                <Button asChild className="mt-6">
                  <Link href="/products">Start Shopping</Link>
                </Button>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="addresses">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
                  <MapPin className="h-5 w-5 text-primary" />
                  Saved Addresses
                </h2>
                <Button size="sm" onClick={() => setShowAddAddress(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New
                </Button>
              </div>

              {(profile?.addresses?.length || 0) > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {profile?.addresses?.map((addr) => (
                    <div key={addr.id} className="relative rounded-xl border border-border p-4">
                      {addr.isDefault && (
                        <span className="absolute right-2 top-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          Default
                        </span>
                      )}
                      <p className="font-medium">{addr.fullName}</p>
                      <p className="text-sm text-muted-foreground">{addr.phone}</p>
                      <p className="mt-2 text-sm">{addr.address}</p>
                      <p className="text-sm">{addr.city}, {addr.state} - {addr.pincode}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-destructive"
                        onClick={() => handleDeleteAddress(addr.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="rounded-full bg-muted p-6">
                    <MapPin className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="mt-4 font-medium">No addresses saved</p>
                  <p className="text-sm text-muted-foreground">Add an address for faster checkout</p>
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="wishlist">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <h2 className="flex items-center gap-2 font-serif text-lg font-semibold mb-6">
                <Heart className="h-5 w-5 text-primary" />
                My Wishlist
              </h2>
              <div className="flex flex-col items-center py-12 text-center">
                <div className="rounded-full bg-muted p-6">
                  <Heart className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="mt-4 font-medium">Wishlist is empty</p>
                <p className="text-sm text-muted-foreground">Save items you love</p>
                <Button asChild className="mt-6">
                  <Link href="/products">Browse Products</Link>
                </Button>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/track-order"
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="font-medium">Track Order</span>
                <p className="text-sm text-muted-foreground">Check delivery status</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-500/10 p-3">
                <Phone className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <span className="font-medium">Need Help?</span>
                <p className="text-sm text-muted-foreground">Chat on WhatsApp</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>

      <PhoneVerificationModal isOpen={showPhoneVerify} onClose={() => setShowPhoneVerify(false)} />

      <Dialog open={showAddAddress} onOpenChange={setShowAddAddress}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={newAddress.fullName || ""}
                  onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={newAddress.phone || ""}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={newAddress.address || ""}
                onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>City</Label>
                <Input
                  value={newAddress.city || ""}
                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={newAddress.state || ""}
                  onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Pincode</Label>
                <Input
                  value={newAddress.pincode || ""}
                  onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={handleAddAddress} className="w-full">Save Address</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AccountPage() {
  return (
    <CartProvider>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Header />
          <main>
            <ProfileContent />
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </CartProvider>
  );
}
