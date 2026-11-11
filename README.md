# Rudraksh Collection

A production-ready children's clothing storefront and admin console.

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Auth:** Firebase Authentication — phone OTP, Google, and email/password for staff
- **Database:** Firebase Realtime Database **only** (no SQL, no Firestore)
- **Hosting:** Freebuff Sites (Cloudflare Workers via OpenNext)

## Quick start

```bash
bun install          # or: npm install
cp .env.example .env # then fill in your Firebase web config
bun run seed         # write the starter catalogue into Realtime Database
bun run dev          # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `bun run dev` | Development server with hot reload |
| `bun run build` | Production build |
| `bun run start` | Serve the production build |
| `bun run seed` | Seed brands, collections, products and store settings |
| `bun run seed -- --force` | Same, but overwrite existing settings |
| `bunx tsc --noEmit` | Type check |
| `bun run scripts/smoke-rtdb.ts` | End-to-end smoke test of the Realtime Database layer |

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for the required Firebase console
steps (providers, authorized domains, security rules) and
[`firebase-rules.json`](./firebase-rules.json) for the database rules to publish.

## Data model

Everything lives under `/{NEXT_PUBLIC_FIREBASE_DB_ROOT}/` (default `rudraksh`):

| Node | Access |
| --- | --- |
| `products`, `brands`, `categories`, `settings` | public read, admin write |
| `users/{uid}` | owner only |
| `admins/{uid}` | own record + admins |
| `orders/{id}`, `ordersByUser/{uid}` | owner + admins |
| `tracking/{orderNumber}` | public read (order status + last 4 phone digits) |
| `messages/{id}` | anyone may create, admins read |

Orders are written in three places at once — the order itself, a per-customer
index, and a privacy-safe tracking record — so guest checkout works without an
account while customers still see live status.

## Routes

**Storefront:** `/` `/products` `/products/[slug]` `/collections` `/brands`
`/brands/[slug]` `/cart` `/checkout` `/wishlist` `/account` `/track-order`
`/contact` `/faq` `/shipping` `/returns` `/privacy` `/terms` `/story` `/visit`

**Admin:** `/admin` (sign in) `/admin/dashboard` `/admin/products`
`/admin/products/[id]` `/admin/orders` `/admin/messages` `/admin/settings`

Store contact details, opening hours, shipping thresholds and the announcement
bar are editable from **Admin → Settings** and update the storefront live — no
rebuild required. Empty fields are hidden rather than rendered as broken links.

## Realtime behaviour

Catalogue, orders, messages and store settings are subscribed with
`onValue`, so a status change in the admin console appears instantly on the
customer's order page and tracking page. Nothing polls.

## The hanging rail

The home page and product pages show new arrivals as pieces on a clothing rail.
A product photo is shown hung from a hanger; when a product has a cut-out, the
rail hangs the garment itself, and it swings, turns and shades like cloth.

Making a cut-out — no upload, no external service:

1. Admin → Products → edit a product whose photos are in place.
2. **Rail cut-out → Cut the piece out.** The browser separates the backdrop
   from the cover photo and previews the result.
3. Save the transparent file and commit it to the `/public` path shown, then
   save the product. The rail picks it up (`image_cutout` on the product).

Photos already served from our own domain are also separated automatically when
a product has no explicit cut-out, so a newly committed photo hangs as cloth
without the admin step. External image URLs are left alone: their pixels cannot
be read back in the browser, so those pieces keep the hung-photo treatment.

It works best on a garment photographed by itself against a plain, light
backdrop, with or without its own hanger. Model shots, busy backgrounds and a
garment that fills the whole frame are refused rather than mangled — the piece
then stays a photo.

## Notes

- The admin account is bootstrapped on first sign-in with
  `NEXT_PUBLIC_ADMIN_EMAIL`; credentials live in Firebase Authentication, never
  in the database or the browser.
- Payments: Cash on Delivery always, plus online payment through **Razorpay**
  (see below).
- Order confirmation emails/SMS require a transactional email or SMS provider,
  which is not part of this repository.

## Deploying to Vercel

This app is plain Next.js 16 (App Router) plus Firebase, so Vercel builds it
directly. The repo pins the build so the Cloudflare/OpenNext adapter is never
involved: `vercel.json` sets `bun install --frozen-lockfile` and `next build`,
and `next.config.ts` skips the Wrangler bootstrap whenever `VERCEL=1`.

1. **Import the repository** at vercel.com/new. Framework preset: Next.js.
   Root directory: repository root. No build overrides needed.
2. **Add environment variables** (Project → Settings → Environment Variables),
   for Production *and* Preview. Copy the names from [.env.example](.env.example):
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
   - `NEXT_PUBLIC_FIREBASE_DB_ROOT` (`rudraksh`)
   - `NEXT_PUBLIC_ADMIN_EMAIL`
   - `NEXT_PUBLIC_SITE_URL` (your real domain)
3. **`FIREBASE_SERVICE_ACCOUNT`** — the service-account JSON as one line. It is
   server-only (never `NEXT_PUBLIC_*`) and turns on server-validated order
   writing. Without it COD still works (the browser writes the order), but
   **online payment is refused**, because a real charge must never depend on a
   write the browser could lose.
4. **Online payment (optional):** `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
   from Razorpay → Settings → API keys. Then turn on **Show online payment** in
   Admin → Settings. Online payment also needs step 3.
5. **Firebase console:** Authentication → Settings → Authorized domains → add
   your `*.vercel.app` domain and the custom domain, or sign-in popups are
   blocked. Publish `firebase-rules.json` before going live.
6. Deploy. `next.config.ts` still sets `ignoreBuildErrors: true`, so a type
   error will not fail the deploy — but the app's own types are currently
   clean (`npx tsc --noEmit`).

`.env` is not read on Vercel — values come from the dashboard. Keep matching
values locally in `.env`.

## Online payments (Razorpay)

Cash on Delivery is always available. Online payment can be switched on in
**Admin → Settings → Show online payment**, and only appears at checkout when
the server can actually complete it.

How a paid order is created:

1. `POST /api/payments` — the server re-prices the bag from the Realtime
   Database (never the browser's numbers) and opens a Razorpay order for exactly
   that amount. Nothing is written to the database.
2. Razorpay's checkout modal collects the payment.
3. On success, the browser posts the signature back to `/api/checkout`, which:
   verifies the HMAC signature with `RAZORPAY_KEY_SECRET`, re-fetches the
   payment from Razorpay, and checks the order id, amount and currency match.
4. Only then is the order written — with `payment_status: "paid"`, the Razorpay
   ids, and status `confirmed`. Cancelled, failed or unverifiable payments
   create nothing, and a payment id can only ever produce one order (recorded at
   `rudraksh/payments/<payment_id>`).

Because step 3 writes the order server-side, online payment requires
`FIREBASE_SERVICE_ACCOUNT`. Without it the option stays hidden rather than
risking a customer being charged with no order to show for it.

No webhook is needed for the success path. A payment that is authorised but
never reaches step 3 (the customer closes the tab) shows up in the Razorpay
dashboard with no order; reconcile those by hand, or add a webhook later.
