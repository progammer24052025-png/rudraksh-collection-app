"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/lib/admin-context";
import { ADMIN_EMAIL } from "@/lib/firebase";

export default function AdminLoginPage() {
  const router = useRouter();
  const {
    user,
    isAdmin,
    loading,
    pending,
    needsVerification,
    signIn,
    signInWithGoogle,
    resendVerification,
    logout,
    error,
    clearError,
  } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAdmin) router.replace("/admin/dashboard");
  }, [isAdmin, loading, router]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || password.length < 8) {
      toast.error("Enter your email and a password of at least 8 characters");
      return;
    }
    setSubmitting(true);
    const ok = await signIn(email, password);
    setSubmitting(false);
    // The effect above opens the dashboard once the admin record is confirmed;
    // an unverified or unapproved account stays here and is told why.
    if (ok) toast.success("Signed in");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (needsVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center">
          <Mail className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-4 font-serif text-xl font-medium">Confirm your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a verification link to <strong>{user?.email}</strong>. Open it, then reload this
            page to finish setting up admin access.
          </p>
          <Button
            className="mt-5 w-full"
            onClick={async () => {
              const ok = await resendVerification();
              toast[ok ? "success" : "error"](ok ? "Verification email sent" : error || "Could not send the email");
              clearError();
            }}
          >
            Resend verification email
          </Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={logout}>Use a different account</Button>
        </div>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-amber-600" />
          <h1 className="mt-4 font-serif text-xl font-medium">Access requested</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <strong>{user?.email}</strong> has asked for store admin access. An existing owner has to
            approve it from Admin → Team. You can leave this page open — it unlocks automatically once
            approved.
          </p>
          <div className="mt-5 flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/">Back to store</Link>
            </Button>
            <Button variant="ghost" className="flex-1" onClick={logout}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-medium">Rudraksh Collection</h1>
          <p className="mt-1 text-sm text-muted-foreground">Store admin sign in</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@rudrakshcollection.in or your email"
                className="pl-9"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="pl-9"
                autoComplete="current-password"
                minLength={8}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>
            ) : (
              "Sign In"
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              const ok = await signInWithGoogle();
              setSubmitting(false);
              if (ok) toast.success("Signed in");
            }}
          >
            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            The first sign-in with the store owner email creates the admin account. Google accounts
            must be granted access from the database or by another admin.
          </p>
        </form>
      </div>
    </div>
  );
}
