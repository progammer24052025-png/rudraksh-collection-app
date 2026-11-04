"use client";

import Link from "next/link";
import { useState } from "react";
import { Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Official Google mark, inlined so there is no external CDN dependency. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.5 14.5 0 0 1 9.77 24c0-1.6.27-3.15.76-4.59l-7.97-6.19A23.94 23.94 0 0 0 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/**
 * Reference #2 — Sign-in form, re-skinned.
 * Warm ivory card, sage focus rings, serif heading.
 * Apple + GitHub are intentionally absent: no provider exists behind them.
 */
export function SignInForm({
  title = "Sign in",
  subtitle,
  onSubmit,
  onGoogle,
  loading = false,
  error,
  notice,
  footer,
  showRemember = true,
  forgotHref,
  className,
}: {
  title?: string;
  subtitle?: string;
  onSubmit: (values: { email: string; password: string; remember: boolean }) => void | Promise<void>;
  onGoogle?: () => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
  notice?: string | null;
  footer?: React.ReactNode;
  showRemember?: boolean;
  forgotHref?: string;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  return (
    <div
      className={cn(
        "w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-[0_18px_50px_-30px_rgba(28,25,23,0.35)]",
        className,
      )}
    >
      <header className="mb-6">
        <h1 className="font-serif text-2xl text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </header>

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit({ email, password, remember });
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="signin-email">Email</Label>
          <div className="flex h-12 items-center gap-2 rounded-lg border border-input bg-background px-3 transition-shadow focus-within:ring-2 focus-within:ring-sage/40">
            <Mail className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              id="signin-email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-full border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signin-password">Password</Label>
          <div className="flex h-12 items-center gap-2 rounded-lg border border-input bg-background px-3 transition-shadow focus-within:ring-2 focus-within:ring-sage/40">
            <Lock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-full border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        {showRemember || forgotHref ? (
          <div className="flex items-center justify-between gap-3">
            {showRemember ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="signin-remember"
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked === true)}
                />
                <Label htmlFor="signin-remember" className="text-sm font-normal">
                  Remember me
                </Label>
              </div>
            ) : (
              <span />
            )}
            {forgotHref ? (
              <Link href={forgotHref} className="text-sm text-sage underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-lg bg-sage/10 px-3 py-2 text-sm text-sage">{notice}</p>
        ) : null}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-lg bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90"
        >
          {loading ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      {onGoogle ? (
        <div className="mt-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void onGoogle()}
            className="h-12 w-full rounded-lg border-border bg-background"
          >
            <GoogleMark className="h-5 w-5" />
            Continue with Google
          </Button>
        </div>
      ) : null}

      {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
