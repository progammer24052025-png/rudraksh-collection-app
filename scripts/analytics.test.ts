/**
 * Checks that the store's own analytics never keeps personal data and sums
 * correctly. Run with `npm test`.
 */
import { cleanPath, cleanSearch, cleanSource, combine, ranked, summarise, type Hit } from "../src/lib/analytics";

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    fails++;
    console.log(`FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  } else {
    console.log(`ok   ${name}`);
  }
};

// ── What is never recorded ──────────────────────────────────────────────────
eq("admin pages are never recorded", cleanPath("/admin/orders"), null);
eq("account pages are never recorded", cleanPath("/account"), null);
eq("invoices are never recorded", cleanPath("/invoice", "?order=RC-20261113-ABCD1234"), null);
eq("query strings are dropped (no order numbers)", cleanPath("/track-order", "?order=RC-1&phone=9876543210"), "/track-order");
eq("shop filters are kept", cleanPath("/products", "?category=boys-wear&search=my+phone+98765"), "/products?category=boys-wear");
eq("odd characters are refused", cleanPath("/products/<script>"), null);
eq("search terms with phone numbers are dropped", cleanSearch("call 9876543210"), null);
eq("search terms with emails are dropped", cleanSearch("me@example.com"), null);
eq("normal search terms are kept, tidied", cleanSearch("  Boys  KURTA "), "boys kurta");

// ── Where visits come from ──────────────────────────────────────────────────
eq("own site counts as direct", cleanSource("https://www.shop.example/products", "shop.example"), "direct");
eq("google domains collapse", cleanSource("https://www.google.co.in/", "shop.example"), "google");
eq("instagram link shim", cleanSource("https://l.instagram.com/?u=x", "shop.example"), "instagram");
eq("campaign tag wins", cleanSource("https://www.google.com/", "shop.example", "Insta_Diwali!"), "campaign:insta_diwali");
eq("no referrer is direct", cleanSource("", "shop.example"), "direct");

// ── Summing ─────────────────────────────────────────────────────────────────
const t = 0;
const hits: Hit[] = [
  { e: "page_view", p: "/", r: "google", d: "mobile", s: 1, n: 1, t },
  { e: "page_view", p: "/products/shirt", r: "google", d: "mobile", t },
  { e: "add_to_cart", p: "/products/shirt", r: "google", d: "mobile", t },
  { e: "page_view", p: "/", r: "direct", d: "desktop", s: 1, t },
  { e: "search", p: "/products", r: "direct", d: "desktop", q: "kurta", t },
];
const day = summarise(hits);
eq("views", day.views, 3);
eq("visits are counted once per session", day.sessions, 2);
eq("first-time visitors", day.newVisitors, 1);
eq("sources count visits, not pages",
  ranked(day.sources).sort((a, b) => a.key.localeCompare(b.key)),
  [{ key: "direct", count: 1 }, { key: "google", count: 1 }]);
eq("top page", ranked(day.pages)[0], { key: "/", count: 2 });
eq("events", day.events["add_to_cart"], 1);
eq("searches", ranked(day.searches), [{ key: "kurta", count: 1 }]);
eq("combining days adds up", combine([day, day]).sessions, 4);

console.log(fails ? `\n${fails} analytics check(s) failed` : "\nall analytics checks passed");
process.exit(fails ? 1 : 0);
