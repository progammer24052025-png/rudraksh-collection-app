/**
 * Full store backup, for admins.
 *
 * GET /api/admin/backup   (admin's ID token in the Authorization header)
 *
 * Firebase's automatic backups are a paid feature, so this gives the owner a
 * free one: a single JSON file of everything that matters — products, orders,
 * customers, coupons, settings, reviews. Short-lived counters and caches are
 * left out. Keep downloaded backups somewhere private: they contain customers'
 * names, phone numbers and addresses.
 */
import { callerFrom } from "@/lib/server/id-token";
import { adminGet, isSecureCheckout } from "@/lib/server/rtdb-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Rebuildable or short-lived data, not worth backing up. */
const SKIP = new Set(["rateLimits", "pincodeGeo", "pendingPayments"]);

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });

export async function GET(request: Request) {
  if (!isSecureCheckout()) return json({ ok: false, error: "Server credentials are not configured." }, 503);
  const caller = await callerFrom(request);
  if (!caller) return json({ ok: false, error: "Sign in required." }, 401);

  try {
    if (!(await adminGet<unknown>(`admins/${caller.uid}`))) return json({ ok: false, error: "Admins only." }, 403);

    const everything = (await adminGet<Record<string, unknown>>("")) ?? {};
    const data = Object.fromEntries(Object.entries(everything).filter(([key]) => !SKIP.has(key)));
    const stamp = new Date().toISOString().slice(0, 10);
    console.info(`Backup downloaded by admin ${caller.uid}`);

    return new Response(JSON.stringify({ exported_at: new Date().toISOString(), data }, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="rudraksh-backup-${stamp}.json"`,
        "cache-control": "no-store",
        "x-robots-tag": "noindex",
      },
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return json({ ok: false, error: "Could not create the backup." }, 500);
  }
}
