"use client";

// ─────────────────────────────────────────────────────────────
// Firebase singletons + Realtime Database access layer.
//
// Auth  : Firebase Authentication (phone OTP, Google, email/password)
// Data  : Firebase Realtime Database ONLY  →  /{DB_ROOT}/...
//
// Firestore and SQL are intentionally not used anywhere in this app.
// Everything below is browser-only; import it from client components.
// ─────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type Auth,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  child,
  remove,
  onValue,
  query,
  orderByChild,
  equalTo,
  type Database,
} from "firebase/database";

import type {
  ActivityEvent,
  Address,
  AdminRecord,
  Banner,
  Brand,
  Category,
  ContactMessage,
  Coupon,
  Order,
  OrderStatus,
  OrderStatusEvent,
  OrderTracking,
  Product,
  StoreSettings,
  UserProfile,
} from "./types";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    (projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : undefined),
};

/** Root node inside the Realtime Database reserved for this store. */
export const DB_ROOT = process.env.NEXT_PUBLIC_FIREBASE_DB_ROOT || "rudraksh";

/** Email allowed to bootstrap the first admin account. */
export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@rudrakshcollection.in";

export const isFirebaseConfigured = (): boolean =>
  Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      firebaseConfig.databaseURL,
  );

// ── Lazily created singletons (browser only) ──────────────────
let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Database | null = null;

function appInstance(): FirebaseApp {
  if (!cachedApp) {
    cachedApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth is only available in the browser");
  }
  if (!cachedAuth) cachedAuth = getAuth(appInstance());
  return cachedAuth;
}

export function getFirebaseDb(): Database {
  if (typeof window === "undefined") {
    throw new Error("Firebase Realtime Database is only available in the browser");
  }
  if (!cachedDb) cachedDb = getDatabase(appInstance());
  return cachedDb;
}

/** Build a Realtime Database reference path, e.g. rtdbRef("products", id). */
export const rtdbRef = (...segments: string[]) =>
  ref(getFirebaseDb(), [DB_ROOT, ...segments.filter(Boolean)].join("/"));

export const rtdbPath = (...segments: string[]) =>
  [DB_ROOT, ...segments.filter(Boolean)].join("/");

// ── Generic Realtime Database helpers ────────────────────────
export async function readValue<T>(segments: string[]): Promise<T | null> {
  try {
    const snapshot = await get(rtdbRef(...segments));
    return (snapshot.val() as T) ?? null;
  } catch (error) {
    console.error(`RTDB read failed (${segments.join("/")}):`, error);
    return null;
  }
}

export function subscribeValue<T>(
  segments: string[],
  callback: (value: T | null) => void,
  onError?: (error: unknown) => void,
): () => void {
  let unsubscribe = () => {};
  try {
    unsubscribe = onValue(
      rtdbRef(...segments),
      (snapshot) => callback((snapshot.val() as T) ?? null),
      (error) => {
        console.error(`RTDB subscription failed (${segments.join("/")}):`, error);
        onError?.(error);
        callback(null);
      },
    );
  } catch (error) {
    console.error(`RTDB subscription could not start (${segments.join("/")}):`, error);
    onError?.(error);
  }
  return unsubscribe;
}

export async function writeValue(segments: string[], value: unknown): Promise<void> {
  await set(rtdbRef(...segments), value);
}

export async function updateValue(segments: string[], value: Record<string, unknown>): Promise<void> {
  await update(rtdbRef(...segments), value);
}

export async function pushValue(segments: string[], value: unknown): Promise<string> {
  const newRef = push(rtdbRef(...segments));
  await set(newRef, value);
  return newRef.key ?? "";
}

export async function removeValue(segments: string[]): Promise<void> {
  await remove(rtdbRef(...segments));
}

// ── Collection helpers ──────────────────────────────────────
type EntityMap<T> = Record<string, Omit<T, "id"> & { id?: string }>;

const toList = <T>(map: EntityMap<T> | null): T[] =>
  map
    ? Object.entries(map)
        .map(([id, value]) => ({ ...(value as object), id } as T))
        .filter((item) => Boolean((item as { id?: string }).id))
    : [];

export const subscribeProducts = (
  callback: (products: Product[]) => void,
  onError?: (error: unknown) => void,
) => subscribeValue<EntityMap<Product>>(["products"], (value) => callback(toList<Product>(value)), onError);

export const subscribeBrands = (callback: (brands: Brand[]) => void) =>
  subscribeValue<EntityMap<Brand>>(["brands"], (value) =>
    callback(toList<Brand>(value).sort((a, b) => a.name.localeCompare(b.name))),
  );

export const subscribeCategories = (callback: (categories: Category[]) => void) =>
  subscribeValue<EntityMap<Category>>(["categories"], (value) =>
    callback(
      toList<Category>(value).sort(
        (a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99) || a.name.localeCompare(b.name),
      ),
    ),
  );

export const fetchProducts = async (): Promise<Product[]> => toList<Product>(await readValue(["products"]));

export const fetchProductBySlug = async (slug: string): Promise<Product | null> => {
  const products = await fetchProducts();
  const direct = products.find((product) => product.slug === slug || product.id === slug);
  if (direct) return direct;

  const snapshot = await get(query(rtdbRef("products"), orderByChild("slug"), equalTo(slug)));
  const match = snapshot.val() as EntityMap<Product> | null;
  const [first] = toList<Product>(match);
  return first ?? null;
};

// ── Orders ─────────────────────────────────────────────────
export const subscribeOrders = (callback: (orders: Order[]) => void) =>
  subscribeValue<EntityMap<Order>>(["orders"], (value) =>
    callback(toList<Order>(value).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))),
  );

export const subscribeUserOrders = (uid: string, callback: (orders: Order[]) => void) =>
  subscribeValue<Record<string, true>>(["ordersByUser", uid], async (index) => {
    if (!index) {
      callback([]);
      return;
    }
    const orders = await Promise.all(
      Object.keys(index).map((orderId) => readValue<Order>(["orders", orderId])),
    );
    callback(
      orders
        .filter((order): order is Order => Boolean(order))
        .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
    );
  });

export const subscribeOrder = (orderId: string, callback: (order: Order | null) => void) =>
  subscribeValue<Order>(["orders", orderId], callback);

export function makeOrderNumber(): string {
  const stamp = new Date();
  const date = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(
    stamp.getDate(),
  ).padStart(2, "0")}`;
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RC-${date}-${random}`;
}

export interface NewOrderInput {
  user_id: string | null;
  customer_name: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: Order["items"];
  subtotal: number;
  discount?: number;
  tax?: number;
  coupon_code?: string | null;
  shipping: number;
  total: number;
  payment_method: Order["payment_method"];
  notes?: string | null;
}

/** Creates the order, the per-user index and the public tracking record. */
export async function placeOrder(input: NewOrderInput): Promise<Order> {
  const now = new Date().toISOString();
  const orderNumber = makeOrderNumber();
  const history: OrderStatusEvent[] = [{ status: "placed", at: now }];

  const order: Omit<Order, "id"> = {
    order_number: orderNumber,
    user_id: input.user_id,
    customer_name: input.customer_name,
    phone: input.phone,
    email: input.email ?? null,
    address: input.address,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    items: input.items,
    subtotal: input.subtotal,
    discount: input.discount ?? 0,
    tax: input.tax ?? 0,
    coupon_code: input.coupon_code ?? null,
    shipping: input.shipping,
    total: input.total,
    payment_method: input.payment_method,
    payment_status: "pending",
    order_status: "placed",
    notes: input.notes ?? null,
    status_history: history,
    created_at: now,
    updated_at: now,
  };

  const orderId = await pushValue(["orders"], order);

  await writeValue(["ordersByUser", input.user_id ?? "guest", orderId], { order_number: orderNumber });

  const tracking: OrderTracking = {
    order_number: orderNumber,
    order_status: "placed",
    payment_status: "pending",
    status_history: history,
    phone_last4: input.phone.slice(-4),
    total: input.total,
    created_at: now,
    updated_at: now,
  };
  await writeValue(["tracking", orderNumber], tracking);

  return { ...order, id: orderId };
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  extra: { payment_status?: Order["payment_status"]; note?: string } = {},
): Promise<void> {
  const current = await readValue<Order>(["orders", orderId]);
  if (!current) throw new Error("Order not found");

  const now = new Date().toISOString();
  const history: OrderStatusEvent[] = [
    ...(Array.isArray(current.status_history) ? current.status_history : []),
    { status, at: now, ...(extra.note ? { note: extra.note } : {}) },
  ];
  const paymentStatus = extra.payment_status ?? current.payment_status;

  await updateValue(["orders", orderId], {
    order_status: status,
    payment_status: paymentStatus,
    status_history: history,
    updated_at: now,
  });

  await updateValue(["tracking", current.order_number], {
    order_status: status,
    payment_status: paymentStatus,
    status_history: history,
    updated_at: now,
  });
}

export async function findOrderForTracking(
  orderNumber: string,
  phoneLast4: string,
): Promise<OrderTracking | null> {
  const key = orderNumber.trim().toUpperCase();
  if (!key) return null;

  const direct = await readValue<OrderTracking>(["tracking", key]);
  if (direct) {
    return direct.phone_last4 === phoneLast4.trim() ? direct : null;
  }

  // Fallback for records written before the key was always the order number.
  // `tracking` is no longer listable (only an exact order number is readable),
  // so this query is expected to be refused and must not throw at the caller.
  try {
    const snapshot = await get(query(rtdbRef("tracking"), orderByChild("order_number"), equalTo(key)));
    const matches = toList<OrderTracking>(snapshot.val() as EntityMap<OrderTracking> | null);
    const match = matches.find((entry) => entry.phone_last4 === phoneLast4.trim());
    return match ?? null;
  } catch {
    return null;
  }
}

// ── Settings & messages ────────────────────────────────────
export const subscribeSettings = (callback: (settings: StoreSettings | null) => void) =>
  subscribeValue<StoreSettings>(["settings"], callback);

export const readSettings = () => readValue<StoreSettings>(["settings"]);

export async function saveSettings(settings: StoreSettings): Promise<void> {
  await updateValue(["settings"], { ...settings, updated_at: new Date().toISOString() });
}

export async function sendContactMessage(
  message: Omit<ContactMessage, "id" | "status" | "created_at">,
): Promise<void> {
  await pushValue(["messages"], {
    ...message,
    status: "new",
    created_at: new Date().toISOString(),
  });
}

export const subscribeMessages = (callback: (messages: ContactMessage[]) => void) =>
  subscribeValue<EntityMap<ContactMessage>>(["messages"], (value) =>
    callback(toList<ContactMessage>(value).sort((a, b) => b.created_at.localeCompare(a.created_at))),
  );

// ── Coupons ────────────────────────────────────────────────
const couponKey = (code: string) => code.trim().toUpperCase();

export const subscribeCoupons = (callback: (coupons: Coupon[]) => void) =>
  subscribeValue<EntityMap<Coupon>>(["coupons"], (value) =>
    callback(
      toList<Coupon>(value).sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "")),
    ),
  );

export const readCoupons = async (): Promise<Coupon[]> =>
  toList<Coupon>(await readValue<EntityMap<Coupon>>(["coupons"]));

export const readCoupon = (code: string) =>
  readValue<Coupon>(["coupons", couponKey(code)]);

export async function saveCoupon(coupon: Coupon): Promise<void> {
  const code = couponKey(coupon.code);
  if (!code) throw new Error("A coupon code is required");
  const now = new Date().toISOString();
  const { id: _id, ...rest } = coupon as Coupon & { id?: string };
  await updateValue(["coupons", code], {
    ...rest,
    code,
    used_count: coupon.used_count ?? 0,
    updated_at: now,
    created_at: coupon.created_at ?? now,
  });
}

export const deleteCoupon = (code: string) => removeValue(["coupons", couponKey(code)]);

// ── Banners ────────────────────────────────────────────────
export const subscribeBanners = (callback: (banners: Banner[]) => void) =>
  subscribeValue<EntityMap<Banner>>(["banners"], (value) =>
    callback(toList<Banner>(value).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))),
  );

export async function saveBanner(banner: Banner): Promise<void> {
  const now = new Date().toISOString();
  const id = banner.id?.trim() || `banner-${Date.now().toString(36)}`;
  await writeValue(["banners", id], {
    ...banner,
    id,
    created_at: banner.created_at ?? now,
    updated_at: now,
  });
}

export const deleteBanner = (id: string) => removeValue(["banners", id]);

/** Active right now — used by both the storefront and the admin preview. */
export function isBannerLive(banner: Banner, now: Date = new Date()): boolean {
  if (!banner.active) return false;
  const stamp = now.getTime();
  if (banner.starts_at && new Date(banner.starts_at).getTime() > stamp) return false;
  if (banner.ends_at && new Date(banner.ends_at).getTime() < stamp) return false;
  return true;
}

// ── Activity feed ──────────────────────────────────────────
export async function logActivity(
  uid: string | null | undefined,
  event: Omit<ActivityEvent, "id" | "at"> & { at?: string },
): Promise<void> {
  if (!uid) return;
  try {
    await pushValue(["activity", uid], { ...event, at: event.at ?? new Date().toISOString() });
  } catch {
    /* activity is a nicety — never break the action that triggered it */
  }
}

export const subscribeActivity = (uid: string, callback: (events: ActivityEvent[]) => void) =>
  subscribeValue<EntityMap<ActivityEvent>>(["activity", uid], (value) =>
    callback(
      toList<ActivityEvent>(value)
        .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""))
        .slice(0, 25),
    ),
  );

// ── Users / profile ────────────────────────────────────────
export const emptyProfile = (user: User): UserProfile => ({
  uid: user.uid,
  displayName: user.displayName ?? null,
  email: user.email ?? null,
  photoURL: user.photoURL ?? null,
  phone: user.phoneNumber ?? null,
  phoneVerified: Boolean(user.phoneNumber),
  addresses: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const subscribeProfile = (uid: string, callback: (profile: UserProfile | null) => void) =>
  subscribeValue<UserProfile>(["users", uid], callback);

export async function ensureProfile(user: User): Promise<UserProfile> {
  const existing = await readValue<UserProfile>(["users", user.uid]);
  if (existing) {
    // Keep the auth-provided fields fresh without clobbering user edits.
    const patch: Partial<UserProfile> = { updatedAt: new Date().toISOString() };
    if (!existing.email && user.email) patch.email = user.email;
    if (!existing.displayName && user.displayName) patch.displayName = user.displayName;
    if (!existing.photoURL && user.photoURL) patch.photoURL = user.photoURL;
    if (Object.keys(patch).length > 1) await updateValue(["users", user.uid], patch);
    return { ...existing, ...patch } as UserProfile;
  }
  const profile = emptyProfile(user);
  await writeValue(["users", user.uid], profile);
  return profile;
}

export async function saveProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await updateValue(["users", uid], { ...data, updatedAt: new Date().toISOString() });
}

export const newAddressId = () =>
  `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const normalizeAddress = (address: Partial<Address>): Address => ({
  id: address.id ?? newAddressId(),
  fullName: address.fullName?.trim() ?? "",
  phone: address.phone?.trim() ?? "",
  address: address.address?.trim() ?? "",
  city: address.city?.trim() ?? "",
  state: address.state?.trim() ?? "",
  pincode: address.pincode?.trim() ?? "",
  isDefault: Boolean(address.isDefault),
});

// ── Admins ─────────────────────────────────────────────────
export const subscribeAdminRecord = (uid: string, callback: (record: unknown) => void) =>
  subscribeValue(["admins", uid], callback);

export const readAdminRecord = (uid: string) => readValue<Record<string, unknown>>(["admins", uid]);

export async function anyAdminExists(): Promise<boolean> {
  const admins = await readValue<Record<string, unknown>>(["admins"]);
  return Boolean(admins && Object.keys(admins).length > 0);
}

export async function grantAdmin(uid: string, email: string, role: "owner" | "manager" = "owner") {
  await writeValue(["admins", uid], {
    uid,
    email,
    role,
    created_at: new Date().toISOString(),
  });
  await removeValue(["adminRequests", uid]);
}

export async function revokeAdmin(uid: string) {
  await removeValue(["admins", uid]);
}

export const subscribeAdmins = (callback: (admins: AdminRecord[]) => void) =>
  subscribeValue<EntityMap<AdminRecord>>(["admins"], (value) => callback(toList<AdminRecord>(value)));

// ── Staff access requests ──────────────────────────────────
// Anyone can ask for access; only an existing admin can approve it.
export interface AdminRequest {
  uid: string;
  email: string | null;
  name: string | null;
  requested_at: string;
}

export async function requestAdminAccess(user: User): Promise<void> {
  const existing = await readValue<AdminRequest>(["adminRequests", user.uid]);
  if (existing) return;
  await writeValue(["adminRequests", user.uid], {
    uid: user.uid,
    email: user.email ?? null,
    name: user.displayName ?? null,
    requested_at: new Date().toISOString(),
  });
}

export const subscribeAdminRequests = (callback: (requests: AdminRequest[]) => void) =>
  subscribeValue<EntityMap<AdminRequest>>(["adminRequests"], (value) =>
    callback(toList<AdminRequest>(value).sort((a, b) => a.requested_at.localeCompare(b.requested_at))),
  );

export const denyAdminRequest = (uid: string) => removeValue(["adminRequests", uid]);

export async function resendVerificationEmail(): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Sign in first, then request a new verification email.");
  if (user.emailVerified) return;
  await sendEmailVerification(user);
}

export async function sendVerificationFor(user: User): Promise<void> {
  if (!user.emailVerified) await sendEmailVerification(user);
}

// ── Auth actions ───────────────────────────────────────────
export const watchAuth = (callback: (user: User | null) => void) =>
  onAuthStateChanged(getFirebaseAuth(), callback);

export const signOutUser = () => firebaseSignOut(getFirebaseAuth());

export function createRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  return new RecaptchaVerifier(getFirebaseAuth(), containerId, {
    size: "normal",
    callback: () => {},
    "expired-callback": () => {},
  });
}

const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
};

export async function requestPhoneCode(
  phone: string,
  verifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(getFirebaseAuth(), normalizePhone(phone), verifier);
}

export async function confirmPhoneCode(result: ConfirmationResult, code: string): Promise<User> {
  const credential = await result.confirm(code);
  return credential.user;
}

export async function signInWithGoogleAccount(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(getFirebaseAuth(), provider);
  void logActivity(credential.user.uid, { type: "signin", label: "Signed in with Google" });
  return credential.user;
}

export async function setRememberSession(remember: boolean) {
  const { setPersistence, browserLocalPersistence, browserSessionPersistence } = await import("firebase/auth");
  await setPersistence(getFirebaseAuth(), remember ? browserLocalPersistence : browserSessionPersistence);
}

export const signInWithEmailAccount = async (email: string, password: string) => {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  void logActivity(credential.user.uid, { type: "signin", label: "Signed in with email" });
  return credential.user;
};

export const createEmailAccount = (email: string, password: string) =>
  createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);

// ── Misc ───────────────────────────────────────────────────
export const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(Number.isFinite(price) ? price : 0);

export const getFirebaseProjectId = () => projectId || "rudraksh";

export const effectivePrice = (product: Pick<Product, "price" | "sale_price">) =>
  product.sale_price != null && product.sale_price < product.price ? product.sale_price : product.price;

export type {
  ActivityEvent,
  Address,
  Banner,
  Brand,
  Category,
  ContactMessage,
  Coupon,
  Order,
  Product,
  StoreSettings,
  UserProfile,
};
