# Firebase setup — Realtime Database + Authentication

This store keeps **all** persistent data in Firebase Realtime Database and signs
people in with Firebase Authentication. There is no SQL database, no Firestore
and no server session store.

```
/{DB_ROOT}                 DB_ROOT = NEXT_PUBLIC_FIREBASE_DB_ROOT (default: rudraksh)
  products/{productId}
  brands/{brandId}
  categories/{categoryId}
  settings                   store contact details + shipping rules
  users/{uid}                customer profile, saved addresses
  admins/{uid}               staff accounts allowed into /admin
  adminRequests/{uid}        pending requests waiting for owner approval
  orders/{orderId}           full order records (private)
  ordersByUser/{uid}/{id}    per-customer index
  tracking/{orderNumber}     public status lookup (last 4 phone digits only)
  messages/{messageId}       contact-form submissions
```

## 1. Values used by the app

All of these are public (`NEXT_PUBLIC_*`) values that are baked into the client
bundle at build time. They live in `.env` locally and must also be present in the
hosting environment when the site is built.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `<project>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project id |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `<project>.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender id |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Web app id |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | **`https://<project>-default-rtdb.firebaseio.com`** |
| `NEXT_PUBLIC_FIREBASE_DB_ROOT` | Node name used by this store (`rudraksh`) |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Email allowed to bootstrap the first admin |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL used in metadata/sitemap |

> The previous value `https://<project>.firebaseio.com` pointed at a database that
> does not exist and made every database call fail. The `-default-rtdb` host is
> the correct one for projects created after the Realtime Database split.

## 2. Authentication providers to enable

Firebase Console → Authentication → Sign-in method:

1. **Phone** — used for customer OTP sign-in. Add a test number if you do not
   want to send real SMS during development.
2. **Google** — used for one-tap style customer sign-in.
3. **Email/Password** — used by the store admin at `/admin`.

Firebase Console → Authentication → Settings → **Authorized domains** must list
every hostname the site is served from, for example:

- `localhost`
- `<project>.firebaseapp.com`
- `<project>.web.app`
- your production domain
- the preview hostname you test on (e.g. `site-….freebuff.page`)

Without this, Google sign-in fails with `auth/unauthorized-domain` and phone
sign-in can hang while reCAPTCHA refuses the origin.

## 3. Security rules

The database currently ships wide open, which lets anyone read every customer
profile and order. Paste the contents of [`firebase-rules.json`](./firebase-rules.json)
into Firebase Console → Realtime Database → **Rules** and publish.

What the rules do:

- Catalogue (`products`, `brands`, `categories`), `settings`, `coupons` and
  `banners` are publicly readable — the storefront needs them before anyone
  signs in, and `/offers` lists the live coupon codes on purpose.
- `tracking` is **not** listable: only `tracking/{order-number}` can be read, one
  key at a time, so nobody can download the order book. This is what makes the
  order-number + phone-digits check on `/track-order` meaningful.
- Everything else is private. Customers can read and write only their own
  `users/{uid}` profile and `activity/{uid}`, and see only their own orders.
- Orders and tracking records may be **created** by guests (needed for guest
  checkout) but never overwritten by them; only admins can update.
- `admins/{uid}` can be bootstrapped **once**, by the account whose email matches
  `NEXT_PUBLIC_ADMIN_EMAIL`, only while no admin exists, and only after that
  address is verified (`auth.token.email_verified === true`).
- `adminRequests/{uid}` lets any signed-in account ask for access; only admins
  can read the list, approve or dismiss it.
- Contact messages can be created by anyone, read only by admins.

Publish the rules **before** going live with real customer data. Publishing is a
manual step (the repo is the source of truth, the console is what enforces it):

```bash
node scripts/verify-rules.mjs                      # anonymous check, no data printed
node scripts/verify-rules.mjs --key=RC-20260101-AB12  # + one order lookup
```

The script fails while `coupons` / `banners` are denied or `tracking` is still
listable, and passes once the rules above are published.

## 4. Creating the first admin

1. Open `/admin`.
2. Sign in with `NEXT_PUBLIC_ADMIN_EMAIL` and a password of at least 8
   characters. If no account exists yet, one is created and a verification email
   is sent.
3. Open the verification link, then reload `/admin`. The verified address claims
   `/{DB_ROOT}/admins/{uid}` — but only while the store has no admins at all.

Google sign-in works on the same page. A Google account that is not already an
admin does **not** get access automatically; it files a request instead.

## 5. Adding staff

1. The team member opens `/admin` and signs in with Google or email/password.
2. They see “Access requested”. Their account appears in **Admin → Team**.
3. An existing admin approves the request; the new member's dashboard unlocks
   live, with no reload.

Removing someone from **Admin → Team** revokes access immediately. Nobody can
remove their own access, so the store always keeps at least one owner.

## 6. Seeding the catalogue

```bash
npm run seed          # writes brands, categories, products, settings
npm run seed -- --force   # also overwrite existing settings
```

The seed is idempotent for the catalogue: it replaces the `products`, `brands`
and `categories` nodes. It never touches orders, users or messages.

## 7. What deliberately is *not* here

- **No Firestore.** Profiles, orders and catalogue all live in Realtime Database.
- **No SQL / D1 / Turso.** The old `src/lib/db.ts`, `src/lib/storage.ts` and the
  `/api/*` routes were removed with the migration.
- **No password database.** Admin credentials live in Firebase Authentication,
  never in the database or the browser.

## 6. Secure checkout (service account)

Orders are priced on the server by `src/app/api/checkout/route.ts`: it re-reads
product prices, validates the coupon against `/coupons`, applies GST and
shipping, and — when it can — writes the order itself.

That last part needs credentials:

1. Firebase Console → Project settings → **Service accounts** → *Generate new
   private key*. A JSON file downloads.
2. Add its **contents** as the secret `FIREBASE_SERVICE_ACCOUNT` in this
   project's Settings → Secrets. Never commit the file, never paste it in chat.
3. Redeploy.

Without the secret the store still works: the route returns server-computed
totals, and the browser writes the order (the pre-existing behaviour). With it,
`secure: true` and the totals cannot be tampered with.

### Tax

Admin → Settings → **Tax** holds the rate (default 5%), whether catalogue
prices already include it, the label shown on orders, and an optional GSTIN.
Nothing is hard-coded: change the rate and the next order uses it.

### Coupons

Admin → Coupons. One coupon per order, applied to the discounted subtotal
(sale items included, never stacked). Expired, inactive, over-used and
below-minimum codes are rejected by the server, not just hidden in the UI.
