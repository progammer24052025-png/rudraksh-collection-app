"use client";

// Admin authentication.
//   Identity : Firebase Auth (email + password, or Google)
//   Authorisation : an explicit record at /{DB_ROOT}/admins/{uid}
//
// Nobody becomes an admin just by signing up. The owner email can bootstrap
// the first account, but only once its address is verified; every other
// account has to request access and be approved from Admin → Team. `isAdmin`
// is true only while the admin record actually exists.

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
    // The verified flag is cached with the session; refresh it so a link the
    // user has just clicked counts without signing out and in again.
    if (!firebaseUser.emailVerified) {
      try {
        await firebaseUser.reload();
        if (firebaseUser.emailVerified) await firebaseUser.getIdToken(true);
      } catch {
        /* offline — fall through with what we have */
      }
    }

    const email = (firebaseUser.email ?? "").toLowerCase();

    // Nobody is trusted with an address they have not proved they own — the
    // owner address included, since it is public. The database rules enforce
    // the same thing; this keeps the screen honest about it.
    if (usesPasswordProvider(firebaseUser) && !firebaseUser.emailVerified) {
      setNeedsVerification(true);
      setPending(false);
      return;
    }
    setNeedsVerification(false);

    // A verified owner address may claim the first admin record. The panel only
    // unlocks once that record exists (see the live subscription below), so a
    // refused write never shows an admin screen that cannot save anything.
    if (isAllowedAdminEmail(email) && firebaseUser.emailVerified) {
      try {
        await grantAdmin(firebaseUser.uid, email, "owner");
        setPending(false);
        return;
      } catch (err) {
        console.warn("Owner record was not written; requesting access instead:", err);
      }
    }

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

  // Signing in only establishes who the caller is. Whether they are an admin is
  // decided by `evaluateAccess` and the live admin record, never assumed here.
  const signIn = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setError(null);
      const normalized = email.trim().toLowerCase();
      try {
        await signInWithEmailAccount(normalized, password);
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

        // First-run setup for the owner address: create the account, then make
        // them prove the address before anything is unlocked.
        try {
          const credential = await createEmailAccount(normalized, password);
          setNeedsVerification(true);
          setPending(false);
          try {
            await sendVerificationFor(credential.user);
          } catch {
            /* the "resend" button covers a failed first send */
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
      await signInWithGoogleAccount();
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
