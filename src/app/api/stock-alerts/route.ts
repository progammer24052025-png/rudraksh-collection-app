/**
 * Back-in-stock emails.
 *
 * POST /api/stock-alerts  { productId }   (admin caller)
 *
 * Called by the admin product screen when a sold-out product is restocked.
 * Everyone who asked to be told gets one email, and the waiting list is then
 * cleared so nobody is mailed twice for the same restock.
 */
import { backInStockEmail } from "@/lib/server/email-templates";
import { crossOriginResponse, isSameOrigin } from "@/lib/server/http";
import { callerFrom } from "@/lib/server/id-token";
import { adminDelete, adminGet, isSecureCheckout } from "@/lib/server/rtdb-admin";
import { isMailConfigured, sendMail } from "@/lib/server/smtp";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";
// `node:tls` powers the SMTP connection, so this route must not run on Edge.
export const runtime = "nodejs";

/** A restock should not turn into a mass mailing from a personal mailbox. */
const MAX_RECIPIENTS = 200;

const json = (data: unknown, status = 200) => Response.json(data, { status });
const isEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse();
  if (!isSecureCheckout() || !isMailConfigured()) {
    return json({ ok: true, sent: 0, skipped: "not-configured" });
  }

  const caller = await callerFrom(request);
  if (!caller) return json({ ok: false, error: "Sign in required." }, 401);

  const body = (await request.json().catch(() => null)) as { productId?: unknown } | null;
  const productId = String(body?.productId ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(productId)) {
    return json({ ok: false, error: "Unknown product." }, 400);
  }

  try {
    const isAdmin = await adminGet<unknown>(`admins/${caller.uid}`);
    if (!isAdmin) return json({ ok: false, error: "Admins only." }, 403);

    const product = await adminGet<Product>(`products/${productId}`);
    if (!product || product.status !== "active" || !(product.stock > 0)) {
      return json({ ok: true, sent: 0, skipped: "not-in-stock" });
    }

    const waiting = (await adminGet<Record<string, { email?: string }>>(`stockAlerts/${productId}`)) ?? {};
    const emails = Array.from(
      new Set(
        Object.values(waiting)
          .map((entry) => (entry?.email ?? "").trim().toLowerCase())
          .filter(isEmail),
      ),
    ).slice(0, MAX_RECIPIENTS);

    let sent = 0;
    const mail = backInStockEmail({ ...product, id: product.id || productId });
    for (const to of emails) {
      const result = await sendMail({ to, ...mail });
      if (result.ok) sent += 1;
    }

    // Cleared even if a send failed: a retry would mail everyone else twice.
    if (Object.keys(waiting).length) await adminDelete(`stockAlerts/${productId}`);

    return json({ ok: true, sent, waiting: emails.length });
  } catch (error) {
    console.error("Back-in-stock mailing failed:", error);
    return json({ ok: false, error: "Could not send the alerts." }, 500);
  }
}
