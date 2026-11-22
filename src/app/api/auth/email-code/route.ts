/**
 * Sign in with a code sent by email.
 *
 * POST /api/auth/email-code { action: "send", email }
 *   → { ok: true }   (always the same answer, whether or not the email has an account)
 * POST /api/auth/email-code { action: "verify", email, code }
 *   → { ok: true, token }   a custom token for signInWithCustomToken
 *
 * See src/lib/server/email-code.ts for how codes are stored and checked.
 */
import { signInCodeEmail } from "@/lib/server/email-templates";
import {
  CODE_MINUTES,
  checkCode,
  discardCode,
  isEmailAddress,
  issueCode,
  normalizeEmail,
  signInTokenFor,
} from "@/lib/server/email-code";
import { clientIp, crossOriginResponse, isSameOrigin, rateLimit, tooManyRequestsResponse } from "@/lib/server/http";
import { canSendMail } from "@/lib/server/mail-budget";
import { isSecureCheckout } from "@/lib/server/rtdb-admin";
import { isMailConfigured, sendMail } from "@/lib/server/smtp";

export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse();
  if (!isSecureCheckout() || !isMailConfigured()) {
    return json({ ok: false, error: "Email sign-in is not available right now. Please use Google." }, 503);
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = String(body?.action ?? "");
  const email = normalizeEmail(body?.email);
  if (!isEmailAddress(email)) return json({ ok: false, error: "Enter a valid email address." }, 400);
  const ip = clientIp(request);

  try {
    if (action === "send") {
      const perNetwork = await rateLimit(`email-code-send:${ip}`, 8, 60 * 60 * 1000);
      if (!perNetwork.ok) return tooManyRequestsResponse(perNetwork.retryAfter);
      const perEmail = await rateLimit(`email-code-send:${email}`, 6, 60 * 60 * 1000);
      if (!perEmail.ok) return tooManyRequestsResponse(perEmail.retryAfter);

      if (!(await canSendMail())) {
        return json(
          { ok: false, error: "We have sent too many emails today. Please sign in with Google, or try tomorrow." },
          503,
        );
      }

      const issued = await issueCode(email);
      if ("wait" in issued) {
        return json({ ok: false, error: `A code was just sent. Wait ${issued.wait} seconds to ask for another.` }, 429);
      }
      const sent = await sendMail({ to: email, ...signInCodeEmail({ code: issued.code, minutes: CODE_MINUTES }) });
      if (!sent.ok) {
        await discardCode(email);
        return json({ ok: false, error: "We could not send the email. Please try again in a minute." }, 502);
      }
      return json({ ok: true, minutes: CODE_MINUTES });
    }

    if (action === "verify") {
      const gate = await rateLimit(`email-code-verify:${ip}`, 20, 10 * 60 * 1000);
      if (!gate.ok) return tooManyRequestsResponse(gate.retryAfter);
      const code = String(body?.code ?? "").replace(/\D/g, "");
      if (code.length !== 6) return json({ ok: false, error: "Enter the 6-digit code." }, 400);

      const result = await checkCode(email, code);
      if (result === "expired") {
        return json({ ok: false, error: "That code has expired or was tried too often. Ask for a new one." }, 400);
      }
      if (result === "wrong") return json({ ok: false, error: "That code is not right. Check the email and try again." }, 400);

      const token = await signInTokenFor(email);
      if (!token) return json({ ok: false, error: "This account is turned off. Please contact the store." }, 403);
      return json({ ok: true, token });
    }

    return json({ ok: false, error: "Unknown action." }, 400);
  } catch (error) {
    console.error("Email-code sign-in failed:", error);
    return json({ ok: false, error: "Sign-in is not working right now. Please try again or use Google." }, 500);
  }
}
