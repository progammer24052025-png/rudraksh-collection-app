"use client";

// Auth Context for Firebase
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { onAuthStateChanged, signOut, type User, type ConfirmationResult } from "firebase/auth";
import {
  auth,
  setupRecaptcha,
  sendOTP,
  verifyOTP,
  signInWithGoogle,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  subscribeToUserProfile,
  isFirebaseConfigured,
  type UserProfile,
} from "./firebase";
import type { RecaptchaVerifier } from "firebase/auth";

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  confirmationResult: ConfirmationResult | null;
  initRecaptcha: (containerId: string) => Promise<void>;
  sendPhoneOTP: (phone: string) => Promise<boolean>;
  verifyPhoneOTP: (otp: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const existingProfile = await getUserProfile(firebaseUser.uid);
        if (!existingProfile) {
          const newProfile = await createUserProfile(firebaseUser);
          setProfile(newProfile);
        }
        const unsubProfile = subscribeToUserProfile(firebaseUser.uid, (p) => {
          setProfile(p);
        });
        setLoading(false);
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [configured]);

  const initRecaptcha = useCallback(async (containerId: string) => {
    if (!configured) return;
    try {
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
      }
      const verifier = await setupRecaptcha(containerId);
      if (verifier) {
        setRecaptchaVerifier(verifier);
      }
    } catch (err: unknown) {
      console.error("Recaptcha setup error:", err);
    }
  }, [recaptchaVerifier, configured]);

  const sendPhoneOTP = async (phone: string): Promise<boolean> => {
    if (!configured) {
      setError("Firebase not configured");
      return false;
    }
    try {
      setError(null);
      if (!recaptchaVerifier) {
        setError("Please wait for verification to initialize");
        return false;
      }
      const result = await sendOTP(phone, recaptchaVerifier);
      if (result) {
        setConfirmationResult(result);
        return true;
      }
      return false;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      setError(message);
      return false;
    }
  };

  const verifyPhoneOTP = async (otp: string): Promise<boolean> => {
    try {
      setError(null);
      if (!confirmationResult) {
        setError("Please request OTP first");
        return false;
      }
      const result = await verifyOTP(confirmationResult, otp);
      if (result.user) {
        const existingProfile = await getUserProfile(result.user.uid);
        if (!existingProfile) {
          await createUserProfile(result.user);
        } else if (!existingProfile.phoneVerified) {
          await updateUserProfile(result.user.uid, {
            phone: result.user.phoneNumber,
            phoneVerified: true,
          });
        }
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid OTP";
      setError(message);
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    if (!configured) {
      setError("Firebase not configured");
      return false;
    }
    try {
      setError(null);
      const result = await signInWithGoogle();
      if (result?.user) {
        const existingProfile = await getUserProfile(result.user.uid);
        if (!existingProfile) {
          await createUserProfile(result.user);
        }
        return true;
      }
      return false;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      setError(message);
      return false;
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setProfile(null);
      setConfirmationResult(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Logout failed";
      setError(message);
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await updateUserProfile(user.uid, data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Update failed";
      setError(message);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        isConfigured: configured,
        confirmationResult,
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
