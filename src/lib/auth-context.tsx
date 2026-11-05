"use client";

// Customer authentication context.
// Auth  : Firebase Authentication
// Profile: Firebase Realtime Database  /{DB_ROOT}/users/{uid}
//
// Loading state never waits on a database round-trip, so a slow or
// misconfigured database can no longer leave the login screen spinning.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ConfirmationResult, RecaptchaVerifier, User } from "firebase/auth";

import {
  completeRedirectSignIn,
  confirmPhoneCode,
  createRecaptchaVerifier,
  emptyProfile,
  ensureProfile,
  isFirebaseConfigured,
  requestPhoneCode,
  saveProfile,
  signInWithGoogleAccount,
  signOutUser,
  subscribeProfile,
  watchAuth,
} from "./firebase";
import type { UserProfile } from "./types";

const OTP_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, label: string, ms = OTP_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} is taking too long. Please check your connection and try again.`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function describeAuthError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "auth/invalid-phone-number":
      return "That phone number doesn't look right. Use a 10-digit Indian mobile number.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/quota-exceeded":
      return "SMS quota exceeded for today. Please try again later.";
    case "auth/captcha-check-failed":
    case "auth/invalid-app-credential":
    case "auth/missing-app-credential":
      return "The verification check failed. Refresh the page and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled for the store yet.";
    case "auth/unauthorized-domain":
      return "This website address is not authorised for sign-in yet.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window. Allow pop-ups and retry.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection and try again.";
    case "auth/invalid-verification-code":
      return "That code is incorrect. Please check the SMS and try again.";
    case "auth/code-expired":
      return "That code has expired. Request a new OTP.";
    case "auth/credential-already-in-use":
    case "auth/account-exists-with-different-credential":
      return "This number is already linked to another sign-in method. Contact the store for help.";
    default:
      return error instanceof Error ? error.message : "Something went wrong. Please try again.";
  }
}

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  confirmationResult: ConfirmationResult | null;
  recaptchaReady: boolean;
  initRecaptcha: (containerId: string) => void;
  sendPhoneOTP: (phone: string) => Promise<boolean>;
  verifyPhoneOTP: (otp: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<{ ok: boolean; error: string | null }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const verifierContainerRef = useRef<string | null>(null);

  // ── Auth listener: never blocks on the database ────────────
  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let unsubscribeProfile: (() => void) | null = null;

    // A Google sign-in that used the redirect fallback lands back here; without
    // this its failure would be silent until the next attempt.
    completeRedirectSignIn()
      .then((returned) => {
        if (returned) {
          ensureProfile(returned).catch((err) =>
            console.warn("Could not sync profile after redirect sign-in:", err),
          );
        }
      })
      .catch((err) => {
        console.error("Redirect sign-in failed:", err);
        setError(describeAuthError(err));
      });

    let unsubscribeAuth: () => void = () => {};
    try {
      unsubscribeAuth = watchAuth((firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);

        unsubscribeProfile?.();
        unsubscribeProfile = null;

        if (!firebaseUser) {
          setProfile(null);
          return;
        }

        setProfile((current) => current ?? emptyProfile(firebaseUser));

        ensureProfile(firebaseUser)
          .then((fresh) => {
            setProfile((current) => (current?.updatedAt === fresh.updatedAt ? current : fresh));
          })
          .catch((err) => console.warn("Could not sync profile to Realtime Database:", err));

        unsubscribeProfile = subscribeProfile(firebaseUser.uid, (databaseProfile) => {
          if (databaseProfile) setProfile(databaseProfile);
        });
      });
    } catch (err) {
      console.error("Firebase auth listener failed:", err);
      setLoading(false);
    }

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, [configured]);

  useEffect(
    () => () => {
      try {
        verifierRef.current?.clear();
      } catch {
        /* ignore */
      }
      verifierRef.current = null;
    },
    [],
  );

  const initRecaptcha = useCallback((containerId: string) => {
    if (!configured) return;
    if (verifierRef.current && verifierContainerRef.current === containerId) {
      setRecaptchaReady(true);
      return;
    }
    try {
      verifierRef.current?.clear();
    } catch {
      /* ignore */
    }
    try {
      const verifier = createRecaptchaVerifier(containerId);
      verifierRef.current = verifier;
      verifierContainerRef.current = containerId;
      // Render the widget up-front so the visitor can complete the check
      // before pressing "Send OTP" instead of staring at a spinner.
      verifier.render().catch((err: unknown) => {
        console.error("Could not render the reCAPTCHA widget:", err);
        setRecaptchaReady(false);
      });
      setRecaptchaReady(true);
    } catch (err) {
      console.error("Could not start the reCAPTCHA check:", err);
      setRecaptchaReady(false);
    }
  }, [configured]);

  const sendPhoneOTP = useCallback(async (phone: string): Promise<boolean> => {
    setError(null);
    try {
      if (!verifierRef.current) {
        setError("The verification check is still loading. Please wait a second and try again.");
        return false;
      }
      const result = await withTimeout(
        requestPhoneCode(phone, verifierRef.current),
        "Sending the OTP",
      );
      setConfirmationResult(result);
      return true;
    } catch (err) {
      console.error("sendPhoneOTP:", err);
      setError(describeAuthError(err));
      // A failed attempt consumes the token — rebuild the verifier for the retry.
      try {
        verifierRef.current?.clear();
      } catch {
        /* ignore */
      }
      verifierRef.current = null;
      verifierContainerRef.current = null;
      setRecaptchaReady(false);
      return false;
    }
  }, []);

  const verifyPhoneOTP = useCallback(
    async (otp: string): Promise<boolean> => {
      setError(null);
      try {
        if (!confirmationResult) {
          setError("Please request a new OTP.");
          return false;
        }
        const verifiedUser = await withTimeout(
          confirmPhoneCode(confirmationResult, otp),
          "Verifying the code",
        );
        await ensureProfile(verifiedUser);
        return true;
      } catch (err) {
        console.error("verifyPhoneOTP:", err);
        setError(describeAuthError(err));
        return false;
      }
    },
    [confirmationResult],
  );

  const loginWithGoogle = useCallback(async (): Promise<{ ok: boolean; error: string | null }> => {
    setError(null);
    try {
      const googleUser = await withTimeout(signInWithGoogleAccount(), "Google sign-in", 90_000);
      // null means the pop-up was refused and the redirect flow took over: the
      // page navigates away and `watchAuth` finishes the sign-in on return.
      if (googleUser) await ensureProfile(googleUser);
      return { ok: true, error: null };
    } catch (err) {
      console.error("loginWithGoogle:", err);
      // Returned as well as stored: callers read the result synchronously, so the
      // state update above is not visible to them in the same tick.
      const message = describeAuthError(err);
      setError(message);
      return { ok: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOutUser();
      setProfile(null);
      setConfirmationResult(null);
    } catch (err) {
      setError(describeAuthError(err));
    }
  }, []);

  const updateProfileData = useCallback(
    async (data: Partial<UserProfile>): Promise<boolean> => {
      if (!user) return false;
      try {
        await saveProfile(user.uid, data);
        setProfile((current) => (current ? { ...current, ...data } : current));
        return true;
      } catch (err) {
        console.error("updateProfile:", err);
        setError(err instanceof Error ? err.message : "Could not save your profile.");
        return false;
      }
    },
    [user],
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        isConfigured: configured,
        confirmationResult,
        recaptchaReady,
        initRecaptcha,
        sendPhoneOTP,
        verifyPhoneOTP,
        loginWithGoogle,
        logout,
        updateProfile: updateProfileData,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
