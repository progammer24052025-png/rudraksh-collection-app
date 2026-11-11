/**
 * Razorpay REST helpers — plain `fetch`, no SDK dependency.
 *
 * Both keys are server-only. `RAZORPAY_KEY_ID` is public knowledge (it appears
 * in the checkout modal) but is still read on the server and handed to the
 * browser only after the amount has been priced from the database.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.razorpay.com/v1";

const keyId = () => (process.env.RAZORPAY_KEY_ID ?? "").trim();
const keySecret = () => (process.env.RAZORPAY_KEY_SECRET ?? "").trim();

/** True only when both halves of the key pair are present. */
export const razorpayConfigured = (): boolean => Boolean(keyId() && keySecret());

export const razorpayPublicKey = (): string => keyId();

function authHeader(): string {
  return `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString("base64")}`;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!razorpayConfigured()) throw new Error("Razorpay keys are not configured");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      authorization: authHeader(),
      "content-type": "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Razorpay ${path} failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return (await response.json()) as T;
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string | null;
};

export async function createRazorpayOrder(input: {
  /** Amount in paise. */
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  return call<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: input.notes ?? {},
      // Auto-capture; `captureRazorpayPayment` below covers accounts set to
      // manual capture, where success arrives as `authorized`.
    }),
  });
}

export type RazorpayPayment = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  captured: boolean;
  method?: string;
};

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

/** Settles an `authorized` payment. Best effort — the order is still recorded. */
export async function captureRazorpayPayment(
  paymentId: string,
  amountPaise: number,
): Promise<void> {
  await call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}/capture`, {
    method: "POST",
    body: JSON.stringify({ amount: amountPaise, currency: "INR" }),
  });
}

/**
 * HMAC-SHA256 of `order_id|payment_id` keyed with the secret — exactly what
 * Razorpay signs when checkout succeeds.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const secret = keySecret();
  if (!secret || !orderId || !paymentId || !signature) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * A payment may be `authorized` (customer approved, not yet captured) because
 * the order is created with `payment_capture: 0`. Both states mean the money is
 * committed, which is what "success" has to mean for us.
 */
export const isPaidStatus = (status: string): boolean =>
  status === "captured" || status === "authorized";
