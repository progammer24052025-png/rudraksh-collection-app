import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, type User } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = isFirebaseConfigured() ? getAuth(app) : null;
const db = isFirebaseConfigured() ? getFirestore(app) : null;

export { app, auth, db };

// Auth functions
export const setupRecaptcha = (containerId: string) => {
  if (!auth) return null;
  return new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
  });
};

export const sendOTP = async (phone: string, verifier: RecaptchaVerifier) => {
  if (!auth) return null;
  const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
  return await signInWithPhoneNumber(auth, formattedPhone, verifier);
};

export const verifyOTP = async (confirmationResult: ConfirmationResult, otp: string) => {
  return await confirmationResult.confirm(otp);
};

export const signInWithGoogle = async () => {
  if (!auth) return null;
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
};

// Firestore functions
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!db) return null;
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
};

export const createUserProfile = async (user: User): Promise<UserProfile> => {
  if (!db) throw new Error("Database not initialized");
  const profile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    phone: user.phoneNumber,
    phoneVerified: !!user.phoneNumber,
    addresses: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "users", user.uid), profile);
  return profile;
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  if (!db) return;
  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile) => void) => {
  if (!db) return () => {};
  return onSnapshot(doc(db, "users", uid), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as UserProfile);
    }
  });
};

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  phone: string | null;
  phoneVerified: boolean;
  addresses: Address[];
  createdAt: any;
  updatedAt: any;
}
