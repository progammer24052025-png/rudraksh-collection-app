# Email (SMTP — no third-party service)

Transactional mail leaves from the store's **own mailbox** over SMTP. There is no
mail provider, no API key and no npm dependency: `src/lib/server/smtp.ts` opens a
TLS connection with `node:tls`, authenticates with `AUTH LOGIN` and posts a
`multipart/alternative` message (plain text + themed HTML).

## What is sent, and when

| Email | Trigger | Recipient |
| --- | --- | --- |
| Welcome | A new account's profile is created — Google, email/password or first sign-in | The account's own verified address |
| Order confirmation | Right after an order is placed | The order's email, else the signed-in customer's |
| Status update | Admin → Orders changes the status: confirmed, packed, shipped, delivered, cancelled | The order's customer |

Everything is fire-and-forget: a mail failure is logged and never blocks a
sign-in or a checkout. Bodies are built on the server from the stored order, so
the request cannot dictate the content.

## Gmail setup (about five minutes)

1. **Turn on 2-Step Verification** for the account that will send
   (Google Account → Security → 2-Step Verification). App passwords do not
   exist without it.
2. **Create an App password**: Google Account → Security → App passwords →
   app *Mail*, device *Other (storefront)*. Google shows a 16-character
   password; copy it (spaces are optional).
   *Missing this menu usually means the mailbox belongs to a Google Workspace
   organisation that has disabled app passwords — use a personal Gmail address,
   or ask the Workspace admin to allow them.*
3. **Add these variables on Vercel** (Project → Settings → Environment
   Variables, for Production *and* Preview), then redeploy — env changes only
   apply to new deployments:

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your-store@gmail.com
   SMTP_PASSWORD=the-16-character-app-password
   SMTP_FROM_NAME=Rudraksh Collection
   ```

   These are **server-only**. Never prefix them with `NEXT_PUBLIC_` and never
   commit the real values; `.env.example` lists the names only.

The route pins `runtime = "nodejs"` because SMTP needs a real socket. Port 465
(implicit TLS) is required; STARTTLS on 587 is not implemented.

## Verify

- `GET /api/email` → `{"ok":true,"configured":true,"sender":"your-store@gmail.com"}`
- `GET /api/email?check=smtp` → logs in to the mailbox and hangs up without
  sending. `{"ok":true}` means the credentials are good; a `502` carries the
  server's reply.
- Then use it for real: sign in with a new account (welcome), place a COD order
  (confirmation), and move that order to *shipped* in Admin → Orders.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `535 5.7.8 Username and Password not accepted` | Wrong or revoked App password, or 2-Step Verification is off |
| `Connection timed out` / `ECONNREFUSED` | Port 465 blocked, or `SMTP_HOST` is not the mailbox host |
| Response `{"skipped":"no-email"}` | The account or order has no email address — phone-only sign-in, or a guest order without one |
| Welcome never arrives, order mail does | The account already had a profile; the welcome is only sent once per new profile |
| Status updates never arrive, confirmation does | The signed-in admin cannot read `/orders` under the database rules — the route re-reads the order with the admin's own token |
| Guests get the short receipt without items | `/orders` is not readable without an account; the receipt is built from the public tracking record instead, guarded by order number + phone last four |

Check the Vercel function logs for `SMTP send failed:` — the reply line from the
mailbox is included.

## Limits and behaviour

- Gmail allows roughly **500 recipients/day** on Workspace and **~100/day** on a
  free Gmail account. Fine for a small storefront, not for a mailing list.
- Sending from the Gmail address means SPF/DKIM are Google's own, so mail
  arrives as ordinary Gmail. Customer replies land in the store's inbox.
- There is **no retry queue**: a failed send is dropped after being logged. The
  order itself is unaffected.
- Per-instance throttles in `/api/email` stop accidental floods (one welcome per
  account per 10 minutes, one mail per order + status per 10 minutes).
- Any SMTP mailbox works if it offers implicit TLS on 465 — set `SMTP_HOST` and
  `SMTP_PORT` and keep `SMTP_USER` as the full address.
