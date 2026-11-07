/**
 * Transactional email endpoint.
 *
 * POST /api/email
 *   { kind: "welcome" }                                  (signed-in caller)
 *   { kind: "order", orderNumber, event, email?, phoneLast4? }
 *
 * Mail goes out over SMTP from the store's own mailbox (src/lib/server/smtp.ts),
 * so the mailbox password stays on the server. Who may trigger what:
 *
 *  · welcome — only for the caller's own verified address, once per 10 minutes.
 *  · order   — the order is re-read from the database with the caller's own ID
 *              token, so a customer can only mail their own order and an admin
 *              can mail any order they are allowed to read.
 *  · guest   — when no order is readable (guest checkout) a "placed" receipt is
 *              only sent for an existing tracking record whose phone last four
 *              digits match, and only to the address the caller supplied.
 *
 * Bodies are never taken from the request, so the endpoint cannot be used to
 * send arbitrary branded mail to arbitrary addresses.
 */

import { isMailConfigured, mailSender, sendMail, verifySmtp } from "@/lib/server/smtp";
import {
  loginAlertEmail,
  orderPlacedEmail,
  orderStatusEmail,
  toEmailOrder,
  welcomeEmail,
  type EmailOrder,
} from "@/lib/server/email-templates";
import type { Order, OrderStatus, OrderTracking } from "@/lib/types";

export const dynamic = "force-dynamic";
// `node:tls` powers the SMTP connection, so this route must not run on Edge.
export const runtime = "nodejs";

const DB_URL = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/$/, "");
const DB_ROOT = process.env.NEXT_PUBLIC_FIREBASE_DB_ROOT || "rudraksh";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";

const ORDER_STATUSES: OrderStatus[] = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

const json = (data: unknown, status = 200) => Response.json(data, { status });

const isEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value);

// ── Throttles ──────────────────────────────────────────────
// In-memory only: per instance, best effort. Enough to stop a loop from
// mailing a customer twenty times, without another table to maintain.
const seen = new Map<string, number>();
const WINDOW_MS = 10 * 60 * 1000;

function reserve(key: string): boolean {
  const now = Date.now();
  for (const [existing, at] of seen) if (now - at > WINDOW_MS) seen.delete(existing);
  if (seen.has(key)) return false;
  if (seen.size > 500) seen.clear();
  seen.set(key, now);
  return true;
}

const hits = new Map<string, { count: number; resetAt: number }>();

function allow(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    if (hits.size > 2000) hits.clear();
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= 12;
}

// ── Firebase helpers (REST, no admin SDK) ──────────────────
type Caller = { uid: string; email: string | null; name: string | null };

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/** Verifies a Firebase ID token with the public web API key. */
async function verifyIdToken(idToken: string): Promise<Caller | null> {
  if (!API_KEY) return null;
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      users?: { localId?: string; email?: string; displayName?: string }[];
    };
    const user = data.users?.[0];
    if (!user?.localId) return null;
    return {
      uid: user.localId,
      email: user.email ?? null,
      name: user.displayName ?? null,
    };
  } catch {
    return null;
  }
}

async function readPath<T>(
  path: string,
  options: { idToken?: string | null; params?: Record<string, string> } = {},
): Promise<T | null> {
  if (!DB_URL) return null;
  const params = new URLSearchParams(options.params ?? {});
  if (options.idToken) params.set("auth", options.idToken);
  const query = params.toString();
  const url = `${DB_URL}/${DB_ROOT}/${path}.json${query ? `?${query}` : ""}`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T | null;
  } catch {
    return null;
  }
}

/**
 * Reads one order as the caller. Owners are indexed under `ordersByUser`, which
 * keeps working when `/orders` itself is not listable; admins can also query.
 */
async function findOrder(
  orderNumber: string,
  caller: Caller,
  idToken: string,
): Promise<Order | null> {
  const index = await readPath<Record<string, { order_number?: string }>>(
    `ordersByUser/${caller.uid}`,
    { idToken },
  );
  if (index) {
    const match = Object.entries(index).find(([, entry]) => entry?.order_number === orderNumber);
    if (match) {
      const order = await readPath<Order>(`orders/${match[0]}`, { idToken });
      if (order?.order_number) return order;
    }
  }

  const found = await readPath<Record<string, Order>>("orders", {
    idToken,
    params: {
      orderBy: JSON.stringify("order_number"),
      equalTo: JSON.stringify(orderNumber),
      limitToFirst: "1",
    },
  });
  const first = found ? Object.values(found)[0] : null;
  return first?.order_number === orderNumber ? first : null;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Diagnostics. GET /api/email reports whether email is wired up;
 * GET /api/email?check=smtp additionally logs in to the mailbox and hangs up.
 */
export async function GET(request: Request) {
  const configured = isMailConfigured();
  if (!configured) return json({ ok: false, configured, sender: "" });

  if (new URL(request.url).searchParams.get("check") !== "smtp") {
    return json({ ok: true, configured, sender: mailSender() });
  }

  if (!allow(clientIp(request))) return json({ ok: false, error: "Too many requests." }, 429);
  const result = await verifySmtp();
  return json(
    { ok: result.ok, configured, sender: mailSender(), error: result.error },
    result.ok ? 200 : 502,
  );
}

export async function POST(request: Request) {
  if (!isMailConfigured()) {
    return json({ ok: false, error: "Email is not configured." }, 503);
  }

  if (!allow(clientIp(request))) return json({ ok: false, error: "Too many requests." }, 429);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: "Could not read the request." }, 400);

  const idToken = bearer(request);
  const caller = idToken ? await verifyIdToken(idToken) : null;

  if (body.kind === "welcome") {
    if (!caller?.email) return json({ ok: true, skipped: "no-email" });
    if (!reserve(`welcome:${caller.uid}`)) return json({ ok: true, skipped: "duplicate" });

    const mail = welcomeEmail({ name: caller.name, email: caller.email });
    const result = await sendMail({ to: caller.email, ...mail });
    return result.ok ? json({ ok: true }) : json({ ok: false, error: result.error }, 502);
  }

  if (body.kind === "login_alert") {
    if (!caller?.email) return json({ ok: true, skipped: "no-email" });
    if (!reserve(`login:${caller.uid}`)) return json({ ok: true, skipped: "duplicate" });

    const mail = loginAlertEmail({
      name: caller.name,
      email: caller.email,
      method: String(body.method ?? "Unknown"),
      ip: String(body.ip ?? clientIp(request)),
      userAgent: String(body.userAgent ?? request.headers.get("user-agent") ?? ""),
    });
    const result = await sendMail({ to: caller.email, ...mail });
    return result.ok ? json({ ok: true }) : json({ ok: false, error: result.error }, 502);
  }

  if (body.kind !== "order") {
    return json({ ok: false, error: "Unknown email type." }, 400);
  }

  const orderNumber = String(body.orderNumber ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{5,31}$/.test(orderNumber)) {
    return json({ ok: false, error: "Invalid order number." }, 400);
  }

  const requested = String(body.event ?? "placed");
  const event: OrderStatus = ORDER_STATUSES.includes(requested as OrderStatus)
    ? (requested as OrderStatus)
    : "placed";

  const order = caller && idToken ? await findOrder(orderNumber, caller, idToken) : null;

  if (order) {
    const recipient = (order.email || caller?.email || "").trim();
    if (!recipient) return json({ ok: true, skipped: "no-email" });
    if (!isEmail(recipient)) {
      return json({ ok: false, error: "This order has no usable email address." }, 400);
    }
    if (!reserve(`order:${orderNumber}:${event}`)) return json({ ok: true, skipped: "duplicate" });

    const mail =
      event === "placed"
        ? orderPlacedEmail(toEmailOrder(order))
        : orderStatusEmail(toEmailOrder(order), event);

    const result = await sendMail({ to: recipient, ...mail });
    return result.ok ? json({ ok: true }) : json({ ok: false, error: result.error }, 502);
  }

  // Guest checkout — or a signed-in customer whose order the rules do not let
  // us read. Only a receipt is allowed, and only against a real tracking record.
  if (event !== "placed") {
    return json({ ok: false, error: "That update is not allowed for this caller." }, 403);
  }

  const email = String(body.email ?? "").trim();
  const phoneLast4 = String(body.phoneLast4 ?? "").replace(/\D/g, "").slice(-4);

  if (!isEmail(email)) return json({ ok: false, error: "A valid email is required." }, 400);
  if (phoneLast4.length !== 4) {
    return json({ ok: false, error: "Phone verification failed." }, 403);
  }

  const tracking = await readPath<OrderTracking>(`tracking/${orderNumber}`);
  if (!tracking || tracking.phone_last4 !== phoneLast4) {
    return json({ ok: false, error: "Order not found." }, 404);
  }
  if (!reserve(`order:${orderNumber}:${event}`)) return json({ ok: true, skipped: "duplicate" });

  const compact: EmailOrder = {
    order_number: tracking.order_number,
    total: tracking.total,
    order_status: tracking.order_status,
    payment_method: null,
    items: [],
  };

  const result = await sendMail({ to: email, ...orderPlacedEmail(compact) });
  return result.ok ? json({ ok: true }) : json({ ok: false, error: result.error }, 502);
}
