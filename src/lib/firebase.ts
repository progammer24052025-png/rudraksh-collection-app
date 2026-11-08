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
  signInWithRedirect,
  getRedirectResult,
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

function cleanDatabaseUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  let url = raw.trim().replace(/^["']|["']$/g, "").trim();
  if (!url) return undefined;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    // Realtime Database URL MUST only be the origin (e.g. https://xyz-default-rtdb.firebaseio.com)
    return parsed.origin;
  } catch {
    return url.replace(/\/+$/, "").split("/").slice(0, 3).join("/");
  }
}

function cleanDbRoot(raw?: string | null): string {
  if (!raw) return "rudraksh";
  const cleaned = raw.trim().replace(/^["']|["']$/g, "").replace(/^\/+|\/+$/g, "").trim();
  return cleaned || "rudraksh";
}

const projectId = (
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  ""
).trim().replace(/^["']|["']$/g, "");

const databaseUrl = cleanDatabaseUrl(
  process.env.FIREBASE_DATABASE_URL ||
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    (projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : undefined),
);

const firebaseConfig = {
  apiKey: (process.env.FIREBASE_API_KEY ?? process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "").trim().replace(/^["']|["']$/g, ""),
  authDomain: (process.env.FIREBASE_AUTH_DOMAIN ?? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "").trim().replace(/^["']|["']$/g, ""),
  projectId,
  storageBucket: (process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "").trim().replace(/^["']|["']$/g, ""),
  messagingSenderId: (process.env.FIREBASE_MESSAGING_SENDER_ID ?? process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "").trim().replace(/^["']|["']$/g, ""),
  appId: (process.env.FIREBASE_APP_ID ?? process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "").trim().replace(/^["']|["']$/g, ""),
  databaseURL: databaseUrl,
};

/** Root node inside the Realtime Database reserved for this store. */
export const DB_ROOT = cleanDbRoot(
  process.env.FIREBASE_DB_ROOT || process.env.NEXT_PUBLIC_FIREBASE_DB_ROOT
);

/** Admin emails configured via environment variables */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

export const getAdminEmails = (): string[] => {
  const envList = `${process.env.ADMIN_EMAIL || ""} ${process.env.NEXT_PUBLIC_ADMIN_EMAIL || ""}`
    .split(/[\s,]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(envList));
};

export const DEFAULT_ADMIN_EMAILS = getAdminEmails();

export const isAllowedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
};

export const isFirebaseConfigured = (): boolean =>
  Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
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
  if (!cachedDb) {
    const app = appInstance();
    cachedDb = databaseUrl ? getDatabase(app, databaseUrl) : getDatabase(app);
  }
  return cachedDb;
}

/** Build a Realtime Database reference path, e.g. rtdbRef("products", id). */
export const rtdbRef = (...segments: string[]) => {
  const cleanSegments = [DB_ROOT, ...segments]
    .map((s) => (s ?? "").toString().trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
  return ref(getFirebaseDb(), cleanSegments.join("/"));
};

export const rtdbPath = (...segments: string[]) => {
  const cleanSegments = [DB_ROOT, ...segments]
    .map((s) => (s ?? "").toString().trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
  return cleanSegments.join("/");
};

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
    callback(
      toList<Brand>(value).sort(
        (a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99) || a.name.localeCompare(b.name),
      ),
    ),
  );

export const fetchBrands = async (): Promise<Brand[]> =>
  toList<Brand>(await readValue(["brands"])).sort(
    (a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99) || a.name.localeCompare(b.name),
  );

export async function saveBrand(brand: Partial<Brand> & { name: string }): Promise<Brand> {
  const now = new Date().toISOString();
  const slug = (brand.slug || brand.name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const id = brand.id?.trim() || slug || `brand-${Date.now().toString(36)}`;
  const existing = await readValue<Brand>(["brands", id]);
  const record: Brand = {
    ...(existing ?? ({} as Brand)),
    id,
    name: brand.name.trim(),
    slug: slug || id,
    logo: brand.logo?.trim() || null,
    description: brand.description?.trim() || null,
    status: brand.status ?? "active",
    sort_order: typeof brand.sort_order === "number" ? brand.sort_order : 0,
    category_slugs: brand.category_slugs ?? existing?.category_slugs ?? [],
    category_names: brand.category_names ?? existing?.category_names ?? [],
    category_source: brand.category_source ?? existing?.category_source ?? null,
    category_updated_at: brand.category_updated_at ?? existing?.category_updated_at,
    created_at: brand.created_at ?? existing?.created_at ?? now,
  };
  await writeValue(["brands", id], record);
  return record;
}

export const deleteBrand = (id: string) => removeValue(["brands", id]);

export const subscribeCategories = (callback: (categories: Category[]) => void) =>
  subscribeValue<EntityMap<Category>>(["categories"], (value) =>
    callback(
      toList<Category>(value).sort(
        (a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99) || a.name.localeCompare(b.name),
      ),
    ),
  );

export const fetchProducts = async (): Promise<Product[]> => toList<Product>(await readValue(["products"]));

export const fetchCategories = async (): Promise<Category[]> =>
  toList<Category>(await readValue(["categories"])).sort(
    (a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99) || a.name.localeCompare(b.name),
  );

/**
 * Categories are keyed by `id` (which defaults to the slug) so product
 * records keep resolving. Unspecified fields are preserved, which lets the
 * admin dialog save a partial record without wiping the cover photo or the
 * department links it hangs under.
 */
export async function saveCategory(
  category: Partial<Category> & { name: string },
): Promise<void> {
  const slug = (category.slug || category.name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const id = (category.id || slug).trim();
  if (!id) throw new Error("A category id is required");
  const now = new Date().toISOString();
  const existing = await readValue<Category>(["categories", id]);
  await writeValue(["categories", id], {
    ...(existing ?? {}),
    ...category,
    id,
    slug: slug || id,
    name: category.name.trim(),
    parent_slugs: category.parent_slugs ?? existing?.parent_slugs ?? [],
    parent_slug: category.parent_slug ?? existing?.parent_slug ?? null,
    updated_at: now,
    created_at: existing?.created_at || category.created_at || now,
  });
}

/** Removes the category only — products keep their now-orphaned category slug. */
export const deleteCategory = (idOrSlug: string) => removeValue(["categories", idOrSlug]);


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
      Object.keys(index).map(async (orderId) => {
        const order = await readValue<Order>(["orders", orderId]);
        return order ? ({ ...order, id: order.id || orderId } as Order) : null;
      }),
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
  payment_status?: Order["payment_status"];
  order_status?: Order["order_status"];
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  notes?: string | null;
}

/**
 * Asks the server to send one transactional email. Fire-and-forget on purpose:
 * mail must never block a sign-in or an order, and an unconfigured mailbox is
 * a silent no-op rather than a checkout error.
 */
async function requestEmail(payload: Record<string, unknown>): Promise<void> {
  try {
    const user = getFirebaseAuth().currentUser;
    const idToken = user ? await user.getIdToken() : null;
    const response = await fetch("/api/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok && response.status !== 503) {
      console.warn("Email notification skipped:", payload.kind, response.status);
    }
  } catch (error) {
    console.warn("Email notification failed:", error);
  }
}

/** Creates the order, the per-user index and the public tracking record. */
export async function placeOrder(input: NewOrderInput): Promise<Order> {
  const uid = input.user_id?.trim();
  if (!uid || uid === "guest") {
    throw new Error("Authentication required: You must be signed in to place an order.");
  }

  const now = new Date().toISOString();
  const orderNumber = makeOrderNumber();
  const history: OrderStatusEvent[] = [{ status: "placed", at: now }];

  const order: Omit<Order, "id"> = {
    order_number: orderNumber,
    user_id: uid,
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
    payment_status: input.payment_status || "pending",
    razorpay_order_id: input.razorpay_order_id ?? null,
    razorpay_payment_id: input.razorpay_payment_id ?? null,
    order_status: input.order_status || "placed",
    notes: input.notes ?? null,
    status_history: history,
    created_at: now,
    updated_at: now,
  };

  const orderId = await pushValue(["orders"], order);

  await writeValue(["ordersByUser", uid, orderId], { order_number: orderNumber });

  if (input.coupon_code) {
    const cleanCode = input.coupon_code.trim().toUpperCase();
    const phone10 = input.phone.replace(/\D/g, "").slice(-10);
    const redemptionRecord = {
      order_id: orderId,
      order_number: orderNumber,
      user_id: uid,
      phone: phone10,
      used_at: now,
    };
    await writeValue(["couponRedemptions", cleanCode, uid], redemptionRecord).catch(() => {});
    await writeValue(["userCoupons", uid, cleanCode], redemptionRecord).catch(() => {});
    if (phone10.length === 10) {
      await writeValue(["couponRedemptionsByPhone", cleanCode, phone10], redemptionRecord).catch(() => {});
    }
  }

  const tracking: OrderTracking = {
    order_number: orderNumber,
    order_status: order.order_status,
    payment_status: order.payment_status,
    status_history: history,
    phone_last4: input.phone.replace(/\D/g, "").slice(-4),
    total: input.total,
    created_at: now,
    updated_at: now,
  };
  await writeValue(["tracking", orderNumber], tracking);

  void requestEmail({
    kind: "order",
    orderNumber,
    event: "placed",
    email: order.email ?? undefined,
    phoneLast4: input.phone.slice(-4),
  });

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
  // Auto-mark COD orders as "paid" when delivered if payment is still pending
  const autoPaidOnDelivery =
    status === "delivered" &&
    current.payment_method === "cod" &&
    current.payment_status === "pending";

  const paymentStatus =
    extra.payment_status ?? (autoPaidOnDelivery ? "paid" : current.payment_status);

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

  // Customers hear about every meaningful step, not just the first one.
  if (status !== current.order_status) {
    void requestEmail({ kind: "order", orderNumber: current.order_number, event: status });
  }
}

export async function findOrderForTracking(
  orderNumber: string,
  phoneLast4?: string,
): Promise<OrderTracking | null> {
  const key = orderNumber
    .trim()
    .replace(/^#/, "")
    .replace(/^Order\s*#?/i, "")
    .trim()
    .toUpperCase();
  if (!key) return null;

  const cleanLast4 = (phoneLast4 ?? "").replace(/\D/g, "").slice(-4);

  const direct = await readValue<OrderTracking>(["tracking", key]);
  if (direct) {
    const directLast4 = (direct.phone_last4 ?? "").replace(/\D/g, "").slice(-4);
    if (cleanLast4 && directLast4 === cleanLast4) {
      return direct;
    }
  }

  // If a signed-in user is tracking their own order, allow lookup directly
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (currentUser) {
      const userIndex = await readValue<Record<string, { order_number?: string }>>([
        "ordersByUser",
        currentUser.uid,
      ]);
      if (userIndex) {
        const match = Object.entries(userIndex).find(
          ([, entry]) => (entry?.order_number || "").toUpperCase() === key,
        );
        if (match) {
          if (direct) return direct;
          const order = await readValue<Order>(["orders", match[0]]);
          if (order) {
            return {
              order_number: order.order_number,
              order_status: order.order_status,
              payment_status: order.payment_status,
              status_history: order.status_history || [{ status: order.order_status, at: order.created_at }],
              phone_last4: (order.phone || "").replace(/\D/g, "").slice(-4),
              total: order.total,
              created_at: order.created_at,
              updated_at: order.updated_at || order.created_at,
            };
          }
        }
      }
    }
  } catch {
    /* ignore auth index read failure */
  }

  // Fallback for older records
  try {
    const snapshot = await get(query(rtdbRef("tracking"), orderByChild("order_number"), equalTo(key)));
    const matches = toList<OrderTracking>(snapshot.val() as EntityMap<OrderTracking> | null);
    const match = matches.find(
      (entry) => (entry.phone_last4 ?? "").replace(/\D/g, "").slice(-4) === cleanLast4,
    );
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

/**
 * Checks whether a given user or mobile number has already redeemed this coupon.
 * Enforces strictly one-time-use per customer.
 */
export async function checkUserCouponUsed(
  couponCode: string,
  userId?: string | null,
  phone?: string | null,
): Promise<{ used: boolean; reason?: string }> {
  if (!couponCode) return { used: false };
  const cleanCode = couponKey(couponCode);

  // Check 1: couponRedemptions by userId
  if (userId && userId !== "guest") {
    const userRedemption = await readValue<{ order_number?: string; used_at?: string }>([
      "couponRedemptions",
      cleanCode,
      userId,
    ]);
    if (userRedemption) {
      return {
        used: true,
        reason: `You have already used coupon ${cleanCode}${userRedemption.order_number ? ` on order ${userRedemption.order_number}` : ""}. Each coupon can only be used once per customer.`,
      };
    }

    const userCoupon = await readValue<{ order_number?: string }>([
      "userCoupons",
      userId,
      cleanCode,
    ]);
    if (userCoupon) {
      return {
        used: true,
        reason: `Coupon ${cleanCode} has already been applied to your account.`,
      };
    }
  }

  // Check 2: by normalized 10-digit phone
  const phoneDigits = (phone ?? "").replace(/\D/g, "").slice(-10);
  if (phoneDigits.length === 10) {
    const phoneRedemption = await readValue<{ order_number?: string }>([
      "couponRedemptionsByPhone",
      cleanCode,
      phoneDigits,
    ]);
    if (phoneRedemption) {
      return {
        used: true,
        reason: `Coupon ${cleanCode} has already been redeemed for mobile number ending in ${phoneDigits.slice(-4)}.`,
      };
    }
  }

  // Check 3: Check recent orders of this user (covers orders before redemption index)
  if (userId && userId !== "guest") {
    try {
      const ordersIndex = await readValue<Record<string, { order_number?: string } | true>>([
        "ordersByUser",
        userId,
      ]);
      if (ordersIndex) {
        const orderIds = Object.keys(ordersIndex);
        for (const orderId of orderIds.slice(-20)) {
          const pastOrder = await readValue<Order>(["orders", orderId]);
          if (pastOrder && pastOrder.coupon_code && couponKey(pastOrder.coupon_code) === cleanCode) {
            return {
              used: true,
              reason: `You have already used coupon code ${cleanCode} on order ${pastOrder.order_number}.`,
            };
          }
        }
      }
    } catch {
      // Non-blocking
    }
  }

  return { used: false };
}

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
    // Returning user — send a login alert on every sign-in.
    void requestEmail({ kind: "login_alert", method: user.providerData?.[0]?.providerId ?? "unknown" });
    return { ...existing, ...patch } as UserProfile;
  }
  const profile = emptyProfile(user);
  await writeValue(["users", user.uid], profile);
  // First profile for this account = first sign-in, so send the welcome once.
  if (profile.email) void requestEmail({ kind: "welcome" });
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

/** Pop-up failures that mean "this browser will not open a pop-up". */
const REDIRECT_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/cancelled-popup-request",
]);

/**
 * Returns the signed-in user, or `null` when the redirect flow was started
 * instead — the browser leaves the page and comes back with a session that
 * `watchAuth` picks up.
 */
export async function signInWithGoogleAccount(): Promise<User | null> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const credential = await signInWithPopup(auth, provider);
    void logActivity(credential.user.uid, { type: "signin", label: "Signed in with Google" });
    return credential.user;
  } catch (err) {
    const code = (err as { code?: string } | null)?.code ?? "";
    // Mobile browsers, in-app webviews and iframed previews refuse pop-ups.
    // The redirect flow works there, so fall back instead of failing.
    if (REDIRECT_FALLBACK_CODES.has(code)) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

/** Finishes a Google redirect sign-in; resolves to null when there was none. */
export async function completeRedirectSignIn(): Promise<User | null> {
  const result = await getRedirectResult(getFirebaseAuth());
  return result?.user ?? null;
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
