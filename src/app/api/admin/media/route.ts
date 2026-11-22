/**
 * Upload a photo (admins only).
 *
 * POST /api/admin/media  { type, data (base64), name? }  →  { ok, url: "/media/…" }
 *
 * Photos are shrunk in the browser before they are sent; this route checks
 * who is uploading, that the file really is an image, and its size, then
 * stores it and returns its permanent address.
 */
import { crossOriginResponse, isSameOrigin, rateLimit, tooManyRequestsResponse } from "@/lib/server/http";
import { callerFrom } from "@/lib/server/id-token";
import { storeMedia } from "@/lib/server/media";
import { adminGet, isSecureCheckout } from "@/lib/server/rtdb-admin";

export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) => Response.json(data, { status });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse();
  if (!isSecureCheckout()) return json({ ok: false, error: "Photo storage is not set up on the server." }, 503);

  const caller = await callerFrom(request);
  if (!caller) return json({ ok: false, error: "Sign in required." }, 401);
  const gate = await rateLimit(`media:${caller.uid}`, 120, 10 * 60 * 1000);
  if (!gate.ok) return tooManyRequestsResponse(gate.retryAfter);

  try {
    if (!(await adminGet<unknown>(`admins/${caller.uid}`))) return json({ ok: false, error: "Admins only." }, 403);

    const body = (await request.json().catch(() => null)) as { type?: unknown; data?: unknown; name?: unknown } | null;
    const result = await storeMedia({
      type: String(body?.type ?? ""),
      base64: String(body?.data ?? ""),
      name: typeof body?.name === "string" ? body.name : undefined,
    });
    return result.ok ? json(result) : json(result, 400);
  } catch (error) {
    console.error("Photo upload failed:", error);
    return json({ ok: false, error: "The photo could not be saved. Please try again." }, 500);
  }
}
