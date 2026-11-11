/**
 * "Announce new arrivals now" — the manual trigger for the new-arrival email.
 *
 * POST /api/product-alerts   (admin caller)
 *
 * The daily job sends this automatically when the switch in Admin → Settings →
 * Automation is on. This route is for doing it by hand: right after a big
 * upload, or when the automatic send is switched off.
 */
import { announceNewProducts } from "@/lib/server/announce";
import { crossOriginResponse, isSameOrigin } from "@/lib/server/http";
import { callerFrom } from "@/lib/server/id-token";
import { adminGet, isSecureCheckout } from "@/lib/server/rtdb-admin";
import { isMailConfigured } from "@/lib/server/smtp";

export const dynamic = "force-dynamic";
// `node:tls` powers the SMTP connection, so this route must not run on Edge.
export const runtime = "nodejs";
export const maxDuration = 300;

const json = (data: unknown, status = 200) => Response.json(data, { status });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse();
  if (!isSecureCheckout()) {
    return json({ ok: false, error: "The server credentials (FIREBASE_SERVICE_ACCOUNT) are not set up yet." }, 503);
  }
  if (!isMailConfigured()) {
    return json({ ok: false, error: "Email is not configured, so nothing can be sent." }, 503);
  }

  const caller = await callerFrom(request);
  if (!caller) return json({ ok: false, error: "Sign in required." }, 401);

  try {
    if (!(await adminGet<unknown>(`admins/${caller.uid}`))) {
      return json({ ok: false, error: "Admins only." }, 403);
    }
    return json(await announceNewProducts());
  } catch (error) {
    console.error("New-arrival announcement failed:", error);
    return json({ ok: false, error: "Could not send the announcement." }, 500);
  }
}
