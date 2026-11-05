#!/usr/bin/env node
/**
 * Checks the deployed Realtime Database rules against what the storefront
 * actually needs, using only anonymous requests (what a browser can do).
 *
 *   node scripts/verify-rules.mjs
 *   node scripts/verify-rules.mjs --key=RC-20261104-AD1R   # also probe one order
 *
 * Reads nothing but metadata (`shallow=true`), so no customer data is printed.
 * Exit code is 1 when any expectation is not met — the rules in
 * firebase-rules.json are only live once they are published in the Firebase
 * Console (Realtime Database → Rules → Publish).
 */

const DB_ROOT = process.env.NEXT_PUBLIC_FIREBASE_DB_ROOT || "rudraksh";
const BASE =
  (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    "https://techstore-1aceb-default-rtdb.firebaseio.com").replace(/\/$/, "") + `/${DB_ROOT}`;

const keyArg = process.argv.find((arg) => arg.startsWith("--key="))?.slice("--key=".length);

/** Expected anonymous access per path. */
const checks = [
  ["products", "allow", "storefront needs the catalogue"],
  ["settings", "allow", "storefront reads shipping/tax settings"],
  ["coupons", "allow", "offers page lists live codes; checkout repricing reads them"],
  ["banners", "allow", "home page hero banner"],
  ["orders", "deny", "admin/customer only"],
  ["ordersByUser", "deny", "per-user index, not listable"],
  ["messages", "deny", "contact form inbox is admin only"],
  ["activity", "deny", "per-user only"],
  ["admins", "deny", "admin roster is admin only"],
  ["tracking", "deny", "must not be listable — order numbers would leak"],
];

if (keyArg) {
  checks.push([`tracking/${encodeURIComponent(keyArg.toUpperCase())}`, "allow", "track-order page reads one key"]);
}

const probes = [];

for (const [path, expected, why] of checks) {
  const url = `${BASE}/${path}.json?shallow=true`;
  let actual = "error";
  let detail = "";
  try {
    const response = await fetch(url, { cache: "no-store" });
    const body = await response.text();
    const denied = body.includes('"Permission denied"');
    actual = denied ? "deny" : response.ok ? "allow" : `http ${response.status}`;
    if (!denied && response.ok) {
      try {
        const parsed = JSON.parse(body);
        detail = parsed && typeof parsed === "object" ? `${Object.keys(parsed).length} key(s)` : "empty";
      } catch {
        detail = "unparsed";
      }
    }
  } catch (error) {
    detail = error instanceof Error ? error.message : String(error);
  }
  probes.push({ path, expected, actual, why, detail, ok: actual === expected });
}

const width = Math.max(...probes.map((p) => p.path.length));
console.log(`\nRules check → ${BASE}\n`);
for (const p of probes) {
  const mark = p.ok ? "PASS" : "FAIL";
  console.log(
    `  ${mark}  ${p.path.padEnd(width)}  expected ${p.expected.padEnd(5)}  got ${p.actual.padEnd(9)}  ${p.detail}`,
  );
  if (!p.ok) console.log(`        ↳ ${p.why}`);
}

const failed = probes.filter((p) => !p.ok);
console.log(
  failed.length
    ? `\n${failed.length} check(s) failed. Publish firebase-rules.json in the Firebase Console, then run this again.\n`
    : `\nAll ${probes.length} checks passed.\n`,
);

process.exit(failed.length ? 1 : 0);
