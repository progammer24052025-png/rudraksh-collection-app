/**
 * New-arrival emails to customers.
 *
 * Runs from the daily job (and from "Announce new arrivals now" in the admin).
 * Products added since the last announcement are gathered into ONE email, so
 * adding twenty products in an afternoon sends each customer a single message
 * the next morning rather than twenty.
 *
 * Who gets it: every customer account with an email address, unless they have
 * switched "New arrival emails" off in Account → Profile or used the
 * unsubscribe link, which works without signing in. Every message carries
 * that link.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import { siteUrl } from "@/lib/config";
import { newArrivalsEmail } from "@/lib/server/email-templates";
import { adminGet, adminSet, adminUpdate, isSecureCheckout, serverSecret } from "@/lib/server/rtdb-admin";
import { isMailConfigured, sendMail } from "@/lib/server/smtp";
import type { Product, UserProfile } from "@/lib/types";

/** Only recent additions are announced, so old stock is never "new" by accident. */
const NEW_WITHIN_DAYS = 14;
const MAX_PRODUCTS_PER_EMAIL = 8;
/**
 * A personal mailbox (Gmail allows roughly 500 messages a day) must keep room
 * for order emails, so one announcement goes to at most this many customers.
 */
const MAX_RECIPIENTS = 200;

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
  skipped?: "not-configured" | "first-run" | "no-new-products" | "no-recipients";
  products: number;
  sent: number;
  failed: number;
  /** Customers left out because of the per-run limit. */
  overLimit: number;
};

export async function announceNewProducts(): Promise<AnnounceResult> {
  const empty = { products: 0, sent: 0, failed: 0, overLimit: 0 };
  if (!isSecureCheckout() || !isMailConfigured()) {
    return { ok: true, skipped: "not-configured", ...empty };
  }

  const now = Date.now();

  // The first run only records a starting point. Without it, switching this on
  // would announce the whole existing catalogue to every customer at once.
  const since = await adminGet<string>(STARTED_PATH);
  if (!since) {
    await adminSet(STARTED_PATH, new Date(now).toISOString());
    return { ok: true, skipped: "first-run", ...empty };
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

  if (!fresh.length) return { ok: true, skipped: "no-new-products", ...empty };

  const users = (await adminGet<Record<string, UserProfile>>("users")) ?? {};
  const seen = new Set<string>();
  const everyone: Array<{ uid: string; email: string; name: string | null }> = [];
  for (const [uid, profile] of Object.entries(users)) {
    const email = (profile?.email ?? "").trim().toLowerCase();
    // Default is on: only an explicit `false` opts a customer out.
    if (!isEmail(email) || profile?.notifications?.newProducts === false || seen.has(email)) continue;
    seen.add(email);
    everyone.push({ uid, email, name: profile.displayName ?? null });
  }

  // Marked before sending: if the run is cut short, a few customers miss this
  // one announcement, which is better than the rest receiving it twice.
  const stamp = new Date(now).toISOString();
  for (const product of fresh) {
    await adminUpdate(`products/${product.key}`, { announced_at: stamp });
  }

  if (!everyone.length) {
    return { ok: true, skipped: "no-recipients", ...empty, products: fresh.length };
  }

  const recipients = everyone.slice(0, MAX_RECIPIENTS);
  const featured = fresh.slice(0, MAX_PRODUCTS_PER_EMAIL);
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const unsubscribe = unsubscribeUrl(recipient.uid);
    if (!unsubscribe) break;
    const mail = newArrivalsEmail({
      name: recipient.name,
      products: featured,
      moreCount: fresh.length - featured.length,
      unsubscribeUrl: unsubscribe,
    });
    const result = await sendMail({ to: recipient.email, ...mail, listUnsubscribe: unsubscribe });
    if (result.ok) sent += 1;
    else failed += 1;
  }

  return {
    ok: true,
    products: fresh.length,
    sent,
    failed,
    overLimit: everyone.length - recipients.length,
  };
}
