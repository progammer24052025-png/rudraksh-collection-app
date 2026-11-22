/**
 * New-arrival emails to customers.
 *
 * Runs from the daily job (and from "Announce new arrivals now" in the admin).
 * Products added since the last announcement are gathered into ONE email, so
 * adding twenty products in an afternoon sends each customer a single message
 * the next morning rather than twenty.
 *
 * Large lists go out in daily portions within the mailbox limit, so every
 * customer is reached within a few days.
 *
 * Who gets it: every customer account with an email address, unless they have
 * switched "New arrival emails" off in Account → Profile or used the
 * unsubscribe link, which works without signing in. Every message carries
 * that link.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import { siteUrl } from "@/lib/config";
import { newArrivalsEmail } from "@/lib/server/email-templates";
import { bulkMailAllowance } from "@/lib/server/mail-budget";
import { adminDelete, adminGet, adminSet, adminUpdate, isSecureCheckout, serverSecret } from "@/lib/server/rtdb-admin";
import { isMailConfigured, sendMail } from "@/lib/server/smtp";
import type { Product, UserProfile } from "@/lib/types";

/** Only recent additions are announced, so old stock is never "new" by accident. */
const NEW_WITHIN_DAYS = 14;
const MAX_PRODUCTS_PER_EMAIL = 8;
/**
 * A free mailbox sends only a few hundred emails a day, so an announcement to
 * every customer goes out in daily portions: whatever the allowance leaves
 * after keeping room for orders and sign-in codes (see mail-budget.ts).
 * Customers not reached yet wait in a queue for the next daily run.
 */
const QUEUE_PATH = "serverState/announceQueue";
/** A queued announcement older than this is dropped; the products are no longer new. */
const QUEUE_MAX_DAYS = 7;
/** Each email opens its own mail connection; stop in time and continue tomorrow. */
const TIME_BUDGET_MS = 150_000;

type AnnounceQueue = {
  created_at: string;
  product_keys: string[];
  more_count: number;
  pending: string[];
  sent: number;
  failed: number;
};

/** Server-only marker: products created before this moment are never announced. */
const STARTED_PATH = "serverState/newArrivalsSince";

const isEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value);

// ── Unsubscribe links ───────────────────────────────────────────────────────

/** A per-customer token, so the link cannot be guessed for somebody else. */
export function unsubscribeToken(uid: string): string | null {
  const secret = serverSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(`new-arrivals:${uid}`).digest("hex").slice(0, 40);
}

export function verifyUnsubscribeToken(uid: string, token: string): boolean {
  const expected = unsubscribeToken(uid);
  if (!expected || !token) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(token, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function unsubscribeUrl(uid: string): string | null {
  const token = unsubscribeToken(uid);
  return token ? `${siteUrl}/api/unsubscribe?u=${encodeURIComponent(uid)}&t=${token}` : null;
}

// ── The announcement ────────────────────────────────────────────────────────

export type AnnounceResult = {
  ok: boolean;
  /** Why nothing was sent, when nothing was. */
  skipped?: "not-configured" | "first-run" | "no-new-products" | "no-recipients" | "daily-limit";
  products: number;
  sent: number;
  failed: number;
  /** Customers still waiting; they are emailed by the next daily runs. */
  overLimit: number;
};

type Recipient = { uid: string; email: string; name: string | null };

/** Every customer who wants new-arrival emails, one entry per address. */
async function subscribers(): Promise<Map<string, Recipient>> {
  const users = (await adminGet<Record<string, UserProfile>>("users")) ?? {};
  const seen = new Set<string>();
  const byUid = new Map<string, Recipient>();
  for (const [uid, profile] of Object.entries(users)) {
    const email = (profile?.email ?? "").trim().toLowerCase();
    // Default is on: only an explicit `false` opts a customer out.
    if (!isEmail(email) || profile?.notifications?.newProducts === false || seen.has(email)) continue;
    seen.add(email);
    byUid.set(uid, { uid, email, name: profile.displayName ?? null });
  }
  return byUid;
}

/** Starts a new announcement when products were added; returns it, or why not. */
async function startAnnouncement(now: number): Promise<AnnounceQueue | AnnounceResult["skipped"]> {
  // The first run only records a starting point. Without it, switching this on
  // would announce the whole existing catalogue to every customer at once.
  const since = await adminGet<string>(STARTED_PATH);
  if (!since) {
    await adminSet(STARTED_PATH, new Date(now).toISOString());
    return "first-run";
  }
  const sinceTime = Date.parse(since) || now;

  const productMap = (await adminGet<Record<string, Product>>("products")) ?? {};
  const fresh = Object.entries(productMap)
    .map(([id, product]) => ({ ...product, id: product.id || id, key: id }))
    .filter(
      (product) =>
        product.status === "active" &&
        product.stock > 0 &&
        !product.announced_at &&
        Date.parse(product.created_at || "") > sinceTime &&
        now - Date.parse(product.created_at || "") < NEW_WITHIN_DAYS * 86_400_000,
    )
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  if (!fresh.length) return "no-new-products";

  // Marked first, so the same products never start a second announcement.
  const stamp = new Date(now).toISOString();
  for (const product of fresh) {
    await adminUpdate(`products/${product.key}`, { announced_at: stamp });
  }

  const everyone = await subscribers();
  if (!everyone.size) return "no-recipients";

  const featured = fresh.slice(0, MAX_PRODUCTS_PER_EMAIL);
  const queue: AnnounceQueue = {
    created_at: stamp,
    product_keys: featured.map((product) => product.key),
    more_count: fresh.length - featured.length,
    pending: [...everyone.keys()],
    sent: 0,
    failed: 0,
  };
  await adminSet(QUEUE_PATH, queue);
  return queue;
}

export async function announceNewProducts(): Promise<AnnounceResult> {
  const empty = { products: 0, sent: 0, failed: 0, overLimit: 0 };
  if (!isSecureCheckout() || !isMailConfigured()) {
    return { ok: true, skipped: "not-configured", ...empty };
  }
  const startedAt = Date.now();

  // Finish the announcement already under way before starting a new one;
  // products added meanwhile go out in the next one.
  let queue = await adminGet<AnnounceQueue>(QUEUE_PATH);
  if (queue && startedAt - (Date.parse(queue.created_at) || 0) > QUEUE_MAX_DAYS * 86_400_000) {
    await adminDelete(QUEUE_PATH);
    queue = null;
  }
  if (!queue || !queue.pending?.length) {
    const started = await startAnnouncement(startedAt);
    if (typeof started === "string" || !started) return { ok: true, skipped: started, ...empty };
    queue = started;
  }

  const productMap = (await adminGet<Record<string, Product>>("products")) ?? {};
  const featured = queue.product_keys
    .map((key) => (productMap[key] ? { ...productMap[key], id: productMap[key].id || key } : null))
    .filter((product): product is Product => Boolean(product && product.status === "active"));
  if (!featured.length) {
    // Everything in it was deleted or hidden since; nothing left to announce.
    await adminDelete(QUEUE_PATH);
    return { ok: true, skipped: "no-new-products", ...empty };
  }

  const allowance = await bulkMailAllowance();
  if (allowance <= 0) {
    return { ok: true, skipped: "daily-limit", ...empty, products: featured.length, overLimit: queue.pending.length };
  }

  // Preferences are read again: a customer may have switched the emails off since.
  const everyone = await subscribers();
  const pending = [...queue.pending];
  let sent = 0;
  let failed = 0;

  while (pending.length && sent + failed < allowance && Date.now() - startedAt < TIME_BUDGET_MS) {
    const uid = pending.shift() as string;
    const recipient = everyone.get(uid);
    if (!recipient) continue;
    const unsubscribe = unsubscribeUrl(recipient.uid);
    if (!unsubscribe) break;
    const mail = newArrivalsEmail({
      name: recipient.name,
      products: featured,
      moreCount: queue.more_count,
      unsubscribeUrl: unsubscribe,
    });
    const result = await sendMail({ to: recipient.email, ...mail, listUnsubscribe: unsubscribe });
    if (result.ok) sent += 1;
    else failed += 1;
  }

  if (pending.length) {
    await adminSet(QUEUE_PATH, { ...queue, pending, sent: queue.sent + sent, failed: queue.failed + failed });
  } else {
    await adminDelete(QUEUE_PATH);
  }

  return { ok: true, products: featured.length, sent, failed, overLimit: pending.length };
}
