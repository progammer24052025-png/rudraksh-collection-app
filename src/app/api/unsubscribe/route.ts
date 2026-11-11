/**
 * Unsubscribe from new-arrival emails — no sign-in needed.
 *
 *   GET  /api/unsubscribe?u=<uid>&t=<token>   shows a confirm page
 *   POST /api/unsubscribe?u=<uid>&t=<token>   switches the emails off
 *
 * The link in each email is signed for that one customer. GET only shows a
 * button, because mail scanners open links on their own and must not be able
 * to unsubscribe people by accident. POST also serves the one-click
 * unsubscribe button mail apps show (RFC 8058), which posts to the same URL.
 *
 * It only ever turns the setting off; turning it back on is done from
 * Account → Profile.
 */
import { storeConfig } from "@/lib/config";
import { verifyUnsubscribeToken } from "@/lib/server/announce";
import { adminUpdate, isSecureCheckout } from "@/lib/server/rtdb-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${escapeHtml(title)} | ${escapeHtml(storeConfig.name)}</title>
    <style>
      body{margin:0;background:#faf7f2;color:#2b2622;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
      main{max-width:440px;margin:12vh auto;padding:28px;background:#fff;border:1px solid #eae3d9;border-radius:14px;text-align:center}
      h1{font-family:Georgia,"Times New Roman",serif;font-weight:normal;font-size:22px;margin:0 0 10px}
      p{font-size:15px;line-height:1.6;color:#6b6560;margin:0 0 16px}
      button,a.button{display:inline-block;border:0;border-radius:10px;background:#2b2622;color:#faf7f2;font-size:15px;font-weight:600;padding:12px 22px;cursor:pointer;text-decoration:none}
      a{color:#2b2622}
    </style>
  </head>
  <body><main>${body}</main></body>
</html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function read(request: Request): { uid: string; token: string; valid: boolean } {
  const params = new URL(request.url).searchParams;
  const uid = (params.get("u") ?? "").trim();
  const token = (params.get("t") ?? "").trim();
  const valid =
    /^[A-Za-z0-9_-]{1,128}$/.test(uid) && isSecureCheckout() && verifyUnsubscribeToken(uid, token);
  return { uid, token, valid };
}

const invalid = () =>
  page(
    "Link not valid",
    `<h1>This link is not valid</h1>
     <p>It may be incomplete or out of date. You can switch new-arrival emails off from your account instead.</p>
     <a class="button" href="/account">Open my account</a>`,
    400,
  );

export async function GET(request: Request) {
  const { uid, token, valid } = read(request);
  if (!valid) return invalid();

  return page(
    "Unsubscribe",
    `<h1>Stop new-arrival emails?</h1>
     <p>You will still get emails about your own orders. You can switch these back on any time from your account.</p>
     <form method="post" action="/api/unsubscribe?u=${encodeURIComponent(uid)}&amp;t=${encodeURIComponent(token)}">
       <button type="submit">Yes, unsubscribe me</button>
     </form>`,
  );
}

export async function POST(request: Request) {
  const { uid, valid } = read(request);
  if (!valid) return invalid();

  try {
    await adminUpdate(`users/${uid}/notifications`, { newProducts: false });
  } catch (error) {
    console.error("Unsubscribe failed:", error);
    return page(
      "Something went wrong",
      `<h1>We could not update that</h1>
       <p>Please try the link again in a minute, or switch the emails off from your account.</p>
       <a class="button" href="/account">Open my account</a>`,
      500,
    );
  }

  return page(
    "Unsubscribed",
    `<h1>You are unsubscribed</h1>
     <p>We will not email you about new arrivals. Order updates will still reach you.</p>
     <a class="button" href="/">Back to the shop</a>`,
  );
}
