"use client";

// Admin authentication.
//   Identity : Firebase Auth (email + password, or Google)
//   Authorisation : an explicit record at /{DB_ROOT}/admins/{uid}
//
// Nobody becomes an admin just by signing up. The owner email can bootstrap
// the first account, but only once its address is verified; every other
// account has to request access and be approved from Admin → Team.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";

import {
  ADMIN_EMAIL,
  isAllowedAdminEmail,
  createEmailAccount,
  grantAdmin,
  isFirebaseConfigured,
  requestAdminAccess,
  resendVerificationEmail,
  sendVerificationFor,
  signInWithEmailAccount,
  signInWithGoogleAccount,
  signOutUser,
  subscribeAdminRecord,
  watchAuth,
} from "./firebase";
import { describeAuthError } from "./auth-context";

type AdminContextValue = {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  /** Signed in but not approved yet. */
  pending: boolean;
  /** Signed in with an email that still needs verifying. */
  needsVerification: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  resendVerification: () => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

const CREDENTIAL_ERRORS = new Set([
  "auth/invalid-credential",
  "auth/invalid-login-credentials",
  "auth/user-not-found",
  "auth/wrong-password",
]);

const usesPasswordProvider = (user: User) =>
  user.providerData.some((provider) => provider.providerId === "password");

export function AdminProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pending, setPending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const decidedFor = useRef<string | null>(null);

  const evaluateAccess = useCallback(async (firebaseUser: User) => {
    const email = (firebaseUser.email ?? "").toLowerCase();

    // Configured owner/admin emails can immediately bootstrap or claim owner status
    if (isAllowedAdminEmail(email)) {
      setNeedsVerification(false);
      setPending(false);
      setIsAdmin(true);
      try {
        await grantAdmin(firebaseUser.uid, email, "owner");
      } catch (err) {
        console.warn("Could not write admin record:", err);
      }
      return;
    }

    // Unverified password accounts cannot be trusted to claim anything.
    if (usesPasswordProvider(firebaseUser) && !firebaseUser.emailVerified) {
      setNeedsVerification(true);
      setPending(false);
      return;
    }
    setNeedsVerification(false);

    try {
      await requestAdminAccess(firebaseUser);
      setPending(true);
    } catch (err) {
      console.error("Could not record the admin access request:", err);
      setError("Could not request admin access. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      setError("Firebase is not configured for this deployment.");
      return;
    }

    let cancelled = false;
    let unsubscribeAdmin: (() => void) | null = null;

    const unsubscribeAuth = watchAuth(async (firebaseUser) => {
      if (cancelled) return;
      setUser(firebaseUser);

      unsubscribeAdmin?.();
      unsubscribeAdmin = null;

      if (!firebaseUser) {
        setIsAdmin(false);
        setPending(false);
        setNeedsVerification(false);
        setLoading(false);
        decidedFor.current = null;
        return;
      }

      // Live authorisation: approving or revoking a member takes effect at once.
      unsubscribeAdmin = subscribeAdminRecord(firebaseUser.uid, (record) => {
        if (cancelled) return;
        const authorised = Boolean(record);
        setIsAdmin(authorised);
        if (authorised) {
          setPending(false);
          setNeedsVerification(false);
        }
        setLoading(false);
      });

      if (decidedFor.current !== firebaseUser.uid) {
        decidedFor.current = firebaseUser.uid;
        await evaluateAccess(firebaseUser);
      }
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribeAdmin?.();
      unsubscribeAuth();
    };
  }, [configured, evaluateAccess]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setError(null);
      const normalized = email.trim().toLowerCase();
      try {
        const firebaseUser = await signInWithEmailAccount(normalized, password);
        if (isAllowedAdminEmail(normalized)) {
          setIsAdmin(true);
          setNeedsVerification(false);
          setPending(false);
          try {
            await grantAdmin(firebaseUser.uid, normalized, "owner");
          } catch {
            /* admin record may already exist */
          }
        }
        return true;
      } catch (err) {
        const code = (err as { code?: string }).code ?? "";
        if (!CREDENTIAL_ERRORS.has(code)) {
          setError(describeAuthError(err));
          return false;
        }

        if (!isAllowedAdminEmail(normalized)) {
          setError("Incorrect email or password for a store team account.");
          return false;
        }

        // First-run setup for the owner/admin address:
        try {
          const credential = await createEmailAccount(normalized, password);
          setIsAdmin(true);
          setNeedsVerification(false);
          setPending(false);
          try {
            await grantAdmin(credential.user.uid, normalized, "owner");
          } catch {
            /* admin record may already exist */
          }
          return true;
        } catch (createError) {
          setError(describeAuthError(createError));
          return false;
        }
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const googleUser = await signInWithGoogleAccount();
      if (googleUser && isAllowedAdminEmail(googleUser.email)) {
        setIsAdmin(true);
        setNeedsVerification(false);
        setPending(false);
        try {
          await grantAdmin(googleUser.uid, googleUser.email ?? "", "owner");
        } catch {
          /* ignore */
        }
      }
      return true;
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/popup-closed-by-user") return false;
      if (code === "auth/unauthorized-domain") {
        setError(
          "This Vercel domain is not yet authorized for Google sign-in. Go to Firebase Console → Authentication → Settings → Authorized domains and add: rudraksh-collection-app-beta.vercel.app"
        );
        return false;
      }
      setError(describeAuthError(err));
      return false;
    }
  }, []);

  const resendVerification = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      await resendVerificationEmail();
      return true;
    } catch (err) {
      setError(describeAuthError(err));
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOutUser();
    setIsAdmin(false);
    setPending(false);
    setNeedsVerification(false);
    decidedFor.current = null;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AdminContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        error,
        pending,
        needsVerification,
        signIn,
        signInWithGoogle,
        resendVerification,
        logout,
        clearError,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within an AdminProvider");
  return context;
}
