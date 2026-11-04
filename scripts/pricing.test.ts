import { computeTotals, validateCoupon, DEFAULT_PRICING } from "../src/lib/pricing";
import type { Coupon } from "../src/lib/types";

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.log(`FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
  else console.log(`ok   ${name} = ${JSON.stringify(got)}`);
};

const line = (price: number, quantity = 1) => [{ productId: "p", name: "x", price, quantity }];
const ten: Coupon = { code: "TEN", title: "10%", type: "percent", value: 10, min_order: 0, active: true };

// inclusive 5%, free shipping at 999
eq("1000 no coupon", computeTotals({ lines: line(1000) }),
  { subtotal: 1000, discount: 0, taxableBase: 1000, tax: 48, shipping: 0, total: 1000, couponCode: null, freeShippingRemaining: 0 });

eq("500 no coupon", computeTotals({ lines: line(500) }),
  { subtotal: 500, discount: 0, taxableBase: 500, tax: 24, shipping: 99, total: 599, couponCode: null, freeShippingRemaining: 499 });

// A coupon must never make the basket more expensive: shipping stays free
// because the pre-discount subtotal cleared the threshold.
eq("1000 + 10%", computeTotals({ lines: line(1000), coupon: ten }),
  { subtotal: 1000, discount: 100, taxableBase: 900, tax: 43, shipping: 0, total: 900, couponCode: "TEN", freeShippingRemaining: 0 });

eq("5% coupon never costs more",
  computeTotals({ lines: line(1000), coupon: { ...ten, value: 5 } }).total <= computeTotals({ lines: line(1000) }).total, true);

// quantity multiplies
eq("2 x 300", computeTotals({ lines: line(300, 2) }).subtotal, 600);

// exclusive tax adds on top
eq("exclusive 5%", computeTotals({ lines: line(1000), config: { ...DEFAULT_PRICING, tax: { ...DEFAULT_PRICING.tax, inclusive: false } } }).total, 1050);

// tax disabled
eq("tax off", computeTotals({ lines: line(500), config: { ...DEFAULT_PRICING, tax: { ...DEFAULT_PRICING.tax, enabled: false } } }).tax, 0);

// coupon guards
eq("expired", validateCoupon({ ...ten, ends_at: "2020-01-01T00:00:00.000Z" }, 1000).ok, false);
eq("inactive", validateCoupon({ ...ten, active: false }, 1000).ok, false);
eq("min order", validateCoupon({ ...ten, min_order: 2000 }, 1000).ok, false);
eq("exhausted", validateCoupon({ ...ten, max_uses: 5, used_count: 5 }, 1000).ok, false);
eq("valid", validateCoupon(ten, 1000).ok, true);

// flat coupon larger than cart never exceeds subtotal
eq("flat > subtotal", computeTotals({ lines: line(200), coupon: { ...ten, type: "flat", value: 500 } }).discount, 200);

console.log(fails ? `\n${fails} FAILED` : "\nall pricing assertions passed");
process.exit(fails ? 1 : 0);
