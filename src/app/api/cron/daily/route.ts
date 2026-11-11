/**
 * The store's daily routine, run without anyone opening the admin.
 *
 *   GET  /api/cron/daily   Vercel Cron (see vercel.json), authorised by CRON_SECRET
 *   POST /api/cron/daily   "Send summary now" in Admin → Settings, authorised
 *                          by the signed-in admin's token
 *
 * It does two things:
 *   1. Emails the store's own mailbox one summary of what needs doing today —
 *      orders to confirm, pack and ship, parcels that look stuck, low stock,
 *      customers waiting on a restock, unread messages. Switch it off in
 *      Admin → Settings → Automation; the manual button always sends.
 *   2. Emails subscribed customers about products added since the last run
 *      (one message a day at most; see src/lib/server/announce.ts).
 *   3. Tidies records nobody needs any more (abandoned payment attempts and
 *      old rate-limit counters), so customer addresses are not kept longer
 *      than necessary.
 *
 * Nothing here changes an order. Decisions stay with the owner; this only
 * makes sure they are seen.
 */
import { timingSafeEqual } from "node:crypto";

import { SHIPPED_FOLLOW_UP_DAYS, resolveAutomation } from "@/lib/automation";
import { announceNewProducts, type AnnounceResult } from "@/lib/server/announce";
import { dailyDigestEmail, type DigestSection } from "@/lib/server/email-templates";
import { isSameOrigin } from "@/lib/server/http";
import { callerFrom } from "@/lib/server/id-token";
import { adminDelete, adminGet, isSecureCheckout } from "@/lib/server/rtdb-admin";
import { isMailConfigured, mailSender, sendMail } from "@/lib/server/smtp";
import type { ContactMessage, Order, Product, StoreSettings } from "@/lib/types";

export const dynamic = "force-dynamic";
// `node:tls` powers the SMTP connection, so this route must not run on Edge.
export const runtime = "nodejs";
// Room for the new-arrival mailing, which sends one message per customer.
export const maxDuration = 300;

const DAY_MS = 86_400_000;
const ABANDONED_PAYMENT_MS = 2 * DAY_MS;

const json = (data: unknown, status = 200) => Response.json(data, { status });
const rupees = (value: number) => `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function ageLabel(iso: string | undefined, now: number): string {
  const days = Math.floor((now - Date.parse(iso || "")) / DAY_MS);
  if (!Number.isFinite(days) || days <= 0) return "today";
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function cronAuthorised(request: Request): boolean {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;
  const given = Buffer.from((request.headers.get("authorization") ?? "").trim(), "utf8");
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

type RunResult = {
  ok: true;
  emailed: boolean;
  headline: string;
  counts: Record<string, number>;
  cleaned: { pendingPayments: number; rateLimits: boolean };
  /** The new-arrival mailing, when this run did one. */
  newArrivals: AnnounceResult | null;
};

async function run(options: { forceEmail: boolean; announce: boolean }): Promise<RunResult> {
  const now = Date.now();
  const [settings, orderMap, productMap, messageMap, alertMap, pendingMap] = await Promise.all([
    adminGet<StoreSettings>("settings"),
    adminGet<Record<string, Order>>("orders"),
    adminGet<Record<string, Product>>("products"),
    adminGet<Record<string, ContactMessage>>("messages"),
    adminGet<Record<string, Record<string, unknown>>>("stockAlerts"),
    adminGet<Record<string, { created_at?: string }>>("pendingPayments"),
  ]);

  const automation = resolveAutomation(settings);
  const orders = Object.values(orderMap ?? {}).filter(Boolean);
  const products = Object.entries(productMap ?? {}).map(([id, product]) => ({ ...product, id: product.id || id }));

  const oldestFirst = (a: Order, b: Order) => (a.created_at || "").localeCompare(b.created_at || "");
  const withStatus = (status: Order["order_status"]) =>
    orders.filter((order) => order.order_status === status).sort(oldestFirst);

  const toConfirm = withStatus("placed");
  const toPack = withStatus("confirmed");
  const toShip = withStatus("packed");
  const stuck = withStatus("shipped").filter(
    (order) => now - Date.parse(order.updated_at || order.created_at || "") > SHIPPED_FOLLOW_UP_DAYS * DAY_MS,
  );
  const unverified = orders.filter(
    (order) => order.client_written && !["delivered", "cancelled"].includes(order.order_status),
  );

  const active = products.filter((product) => product.status === "active");
  const soldOut = active.filter((product) => typeof product.stock === "number" && product.stock <= 0);
  const low = active
    .filter(
      (product) =>
        typeof product.stock === "number" && product.stock > 0 && product.stock <= automation.lowStockThreshold,
    )
    .sort((a, b) => a.stock - b.stock);

  const waiting = Object.entries(alertMap ?? {})
    .map(([productId, people]) => ({
      name: productMap?.[productId]?.name ?? productId,
      count: Object.keys(people ?? {}).length,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);

  const newMessages = Object.values(messageMap ?? {}).filter((message) => message?.status === "new").length;

  const sinceYesterday = orders.filter(
    (order) => order.order_status !== "cancelled" && now - Date.parse(order.created_at || "") < DAY_MS,
  );

  const sections: DigestSection[] = [];
  const orderLine = (order: Order) =>
    `${order.order_number} · ${order.customer_name} · ${rupees(order.total)} · ${ageLabel(order.created_at, now)}`;

  const queue = [...toConfirm, ...toPack, ...toShip];
  if (queue.length) {
    sections.push({
      title: `${plural(queue.length, "order")} waiting for you`,
      href: "/admin/orders",
      lines: [
        [
          toConfirm.length ? `${toConfirm.length} to confirm` : null,
          toPack.length ? `${toPack.length} to pack` : null,
          toShip.length ? `${toShip.length} to ship` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        ...queue.slice(0, 8).map(orderLine),
        ...(queue.length > 8 ? [`…and ${queue.length - 8} more`] : []),
      ],
    });
  }
  if (stuck.length) {
    sections.push({
      title: `${plural(stuck.length, "parcel")} shipped over ${SHIPPED_FOLLOW_UP_DAYS} days ago`,
      href: "/admin/orders?status=shipped",
      lines: [
        "Check with the courier, then mark them delivered.",
        ...stuck.slice(0, 6).map(orderLine),
      ],
    });
  }
  if (unverified.length) {
    sections.push({
      title: `${plural(unverified.length, "order")} with a total to double-check`,
      href: "/admin/orders",
      lines: [
        "These were saved by the customer's browser, not the server. Compare prices before dispatch.",
        ...unverified.slice(0, 6).map(orderLine),
      ],
    });
  }
  if (low.length || soldOut.length) {
    sections.push({
      title: `Stock: ${[low.length ? `${low.length} running low` : null, soldOut.length ? `${soldOut.length} sold out` : null].filter(Boolean).join(", ")}`,
      href: "/admin/products",
      lines: [
        ...low.slice(0, 8).map((product) => `${product.name} — ${product.stock} left`),
        ...soldOut.slice(0, 6).map((product) => `${product.name} — sold out`),
      ],
    });
  }
  if (waiting.length) {
    sections.push({
      title: "Customers waiting for a restock",
      href: "/admin/products",
      lines: [
        "They are emailed automatically when you add stock.",
        ...waiting.slice(0, 6).map((entry) => `${entry.name} — ${plural(entry.count, "customer")} waiting`),
      ],
    });
  }
  if (newMessages) {
    sections.push({
      title: `${plural(newMessages, "unread message")}`,
      href: "/admin/messages",
      lines: ["From the contact form."],
    });
  }

  const headlineParts = [
    queue.length ? `${plural(queue.length, "order")} to handle` : null,
    stuck.length ? `${plural(stuck.length, "parcel")} to chase` : null,
    low.length + soldOut.length ? `${plural(low.length + soldOut.length, "product")} low on stock` : null,
    newMessages ? `${plural(newMessages, "new message")}` : null,
  ].filter(Boolean);
  const sales = sinceYesterday.length
    ? `${plural(sinceYesterday.length, "order")} in the last 24 hours (${rupees(sinceYesterday.reduce((sum, order) => sum + (order.total || 0), 0))})`
    : null;
  const headline = [headlineParts.length ? headlineParts.join(", ") : "nothing needs your attention", sales]
    .filter(Boolean)
    .join(" — ");

  // ── Housekeeping ──────────────────────────────────────────────────────────
  let cleanedPayments = 0;
  for (const [id, pending] of Object.entries(pendingMap ?? {})) {
    const created = Date.parse(pending?.created_at || "");
    if (!Number.isFinite(created) || now - created > ABANDONED_PAYMENT_MS) {
      try {
        await adminDelete(`pendingPayments/${id}`);
        cleanedPayments += 1;
      } catch {
        /* tried again tomorrow */
      }
    }
  }
  // Counters only matter for minutes; clearing them once a day keeps the node small.
  const cleanedRateLimits = await adminDelete("rateLimits").then(
    () => true,
    () => false,
  );

  // ── Email ─────────────────────────────────────────────────────────────────
  // The scheduled run stays quiet on a day with nothing to do and no sales.
  const worthSending = sections.length > 0 || sinceYesterday.length > 0;
  let emailed = false;
  if (isMailConfigured() && mailSender() && (options.forceEmail || (automation.dailyDigest && worthSending))) {
    const date = new Date(now).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Asia/Kolkata",
    });
    const mail = dailyDigestEmail({ date, headline, sections });
    emailed = (await sendMail({ to: mailSender(), ...mail })).ok;
  }

  // ── New arrivals to customers ─────────────────────────────────────────────
  // Last, so a slow mailing can never hold up the owner's summary. The manual
  // "Send summary now" button never mails customers.
  let newArrivals: AnnounceResult | null = null;
  if (options.announce && automation.newProductEmails) {
    try {
      newArrivals = await announceNewProducts();
    } catch (error) {
      console.error("New-arrival announcement failed:", error);
    }
  }

  return {
    ok: true,
    emailed,
    newArrivals,
    headline,
    counts: {
      toConfirm: toConfirm.length,
      toPack: toPack.length,
      toShip: toShip.length,
      stuck: stuck.length,
      unverified: unverified.length,
      lowStock: low.length,
      soldOut: soldOut.length,
      newMessages,
    },
    cleaned: { pendingPayments: cleanedPayments, rateLimits: cleanedRateLimits },
  };
}

/** Vercel Cron. */
export async function GET(request: Request) {
  if (!cronAuthorised(request)) return json({ ok: false, error: "Not authorised." }, 401);
  if (!isSecureCheckout()) return json({ ok: false, error: "FIREBASE_SERVICE_ACCOUNT is not configured." }, 503);
  try {
    return json(await run({ forceEmail: false, announce: true }));
  } catch (error) {
    console.error("Daily routine failed:", error);
    return json({ ok: false, error: "Daily routine failed." }, 500);
  }
}

/** "Send summary now" from the admin. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ ok: false, error: "This request came from another site." }, 403);
  if (!isSecureCheckout()) {
    return json({ ok: false, error: "The server credentials (FIREBASE_SERVICE_ACCOUNT) are not set up yet." }, 503);
  }
  const caller = await callerFrom(request);
  if (!caller) return json({ ok: false, error: "Sign in required." }, 401);

  try {
    if (!(await adminGet<unknown>(`admins/${caller.uid}`))) {
      return json({ ok: false, error: "Admins only." }, 403);
    }
    if (!isMailConfigured()) {
      return json({ ok: false, error: "Email is not configured, so the summary cannot be sent." }, 503);
    }
    return json(await run({ forceEmail: true, announce: false }));
  } catch (error) {
    console.error("Manual summary failed:", error);
    return json({ ok: false, error: "Could not send the summary." }, 500);
  }
}
