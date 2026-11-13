/**
 * The contact form.
 *
 * POST /api/contact  { name, email, phone?, subject?, message, website? }
 *
 * Messages used to be written straight into the database from the browser,
 * which let a script fill the inbox. Now every message is checked and
 * throttled here first; the database rules allow only the server (and admins)
 * to write messages.
 *
 * `website` is a honeypot: a field real visitors never see. Bots that fill
 * every field get a normal-looking reply and nothing is stored.
 */
import { clientIp, crossOriginResponse, isSameOrigin, rateLimit, tooManyRequestsResponse } from "@/lib/server/http";
import { callerFrom } from "@/lib/server/id-token";
import { adminPush, isSecureCheckout } from "@/lib/server/rtdb-admin";

export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) => Response.json(data, { status });
const isEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value);
/** Keeps text on one line where it should be, and strips control characters. */
const clean = (value: unknown, max: number, multiline = false) =>
  String(value ?? "")
    .replace(multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, max);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse();

  // Five messages per ten minutes from one address is plenty for a real person.
  const gate = await rateLimit(`contact:${clientIp(request)}`, 5, 10 * 60 * 1000);
  if (!gate.ok) return tooManyRequestsResponse(gate.retryAfter);

  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > 8000) return json({ ok: false, error: "Your message is too long." }, 400);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "Could not read your message." }, 400);
  }

  if (clean(body.website, 200)) return json({ ok: true }); // honeypot filled: a bot

  const name = clean(body.name, 120);
  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.phone, 20).replace(/[^\d+\s-]/g, "");
  const subject = clean(body.subject, 160);
  const message = clean(body.message, 4000, true);

  if (!name || !message) return json({ ok: false, error: "Please add your name and a message." }, 400);
  if (!isEmail(email)) return json({ ok: false, error: "Please enter a valid email address." }, 400);
  // Link-stuffed messages are almost always spam.
  if ((message.match(/https?:\/\//gi) ?? []).length > 3) {
    return json({ ok: false, error: "Please remove some of the links and try again." }, 400);
  }

  if (!isSecureCheckout()) {
    return json({ ok: false, error: "Messages cannot be received right now. Please call or WhatsApp us." }, 503);
  }

  const caller = await callerFrom(request);
  try {
    await adminPush("messages", {
      name,
      email,
      ...(phone ? { phone } : {}),
      subject,
      message,
      uid: caller?.uid ?? null,
      status: "new",
      created_at: new Date().toISOString(),
    });
    return json({ ok: true });
  } catch (error) {
    console.error("Contact message not saved:", error);
    return json({ ok: false, error: "Your message could not be sent. Please try WhatsApp or email." }, 500);
  }
}
