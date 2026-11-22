"use client";

/**
 * "Email me a code" sign-in: no password to remember, no SMS needed.
 * Step 1 asks for the email, step 2 for the 6-digit code from the inbox.
 */
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { requestEmailCode, signInWithEmailCode } from "@/lib/firebase";

export function EmailCodeSignIn({ onBack, backLabel }: { onBack?: () => void; backLabel?: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const value = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy("send");
    setError(null);
    try {
      await requestEmailCode(value);
      setStep("code");
      setCode("");
      toast.success(`Code sent to ${value}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    if (code.length !== 6) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    setBusy("verify");
    setError(null);
    try {
      await signInWithEmailCode(email, code);
      toast.success("Signed in");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code did not work.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {step === "email" ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <div>
            <Label htmlFor="code-email" className="text-sm font-medium">
              Email address
            </Label>
            <Input
              id="code-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              className="mt-2 h-12 rounded-xl text-base"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              We email you a 6-digit code. No password needed — new customers get an account automatically.
            </p>
          </div>
          <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={busy !== null}>
            {busy === "send" ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Sending code…
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" /> Email me a code
              </>
            )}
          </Button>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void verify();
          }}
        >
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to</p>
            <p className="mt-1 break-all font-medium">{email.trim()}</p>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              className="mt-1 text-sm text-primary hover:underline"
            >
              Change email
            </button>
          </div>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="6-digit code"
            className="h-14 text-center text-2xl tracking-[0.5em]"
          />
          <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={busy !== null}>
            {busy === "verify" ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Checking…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Not in your inbox? Check Spam or Promotions, or{" "}
            <button type="button" onClick={() => void send()} className="text-primary hover:underline" disabled={busy !== null}>
              send a new code
            </button>
            .
          </p>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center justify-center gap-1 text-center text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> {backLabel ?? "Back"}
        </button>
      )}
    </div>
  );
}
