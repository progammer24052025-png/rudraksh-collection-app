/**
 * Checks for the calculations that decide what customers pay and get back.
 * Run with `npm test` (no database or network needed).
 */
import { cancellationMoney } from "../src/lib/cancellation";
import {
  discountPercent,
  isValidPincode,
  lowStockCount,
  maxQuantity,
  savingsPerUnit,
} from "../src/lib/merch";
import { feeForDistance, haversineKm, normalizeShipping } from "../src/lib/shipping";

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

// ── Cancellation ────────────────────────────────────────────────────────────
// Prices include 5% GST (inclusive): total = subtotal - discount + shipping.
const inclusive = { subtotal: 1500, discount: 150, shipping: 0, total: 1350, tax_rate: 0.05 };

eq("cancel one of two lines: totals follow what is left, discount shrinks in proportion",
  cancellationMoney(inclusive, [{ price: 500, quantity: 1 }], 1),
  { fullCancel: false, subtotal: 1000, discount: 100, taxableBase: 900, tax: 43, total: 900, refund: 450 });

eq("cancel everything: the whole amount paid comes back",
  cancellationMoney(inclusive, [{ price: 500, quantity: 1 }, { price: 1000, quantity: 1 }], 0),
  { fullCancel: true, subtotal: 0, discount: 0, taxableBase: 0, tax: 0, total: 1350, refund: 1350 });

const withDelivery = { subtotal: 600, discount: 0, shipping: 99, total: 699, tax_rate: 0.05 };
eq("partial cancel keeps the delivery charge",
  cancellationMoney(withDelivery, [{ price: 200, quantity: 1 }], 1).total, 499);
eq("partial refund is only the cancelled goods",
  cancellationMoney(withDelivery, [{ price: 200, quantity: 1 }], 1).refund, 200);
eq("full cancel refunds delivery too",
  cancellationMoney(withDelivery, [{ price: 600, quantity: 1 }], 0).refund, 699);

// Tax added on top (exclusive): total = subtotal + tax + shipping.
const exclusive = { subtotal: 1000, discount: 0, shipping: 0, total: 1050, tax_rate: 0.05 };
eq("exclusive tax: half cancelled halves the total",
  cancellationMoney(exclusive, [{ price: 250, quantity: 2 }], 1),
  { fullCancel: false, subtotal: 500, discount: 0, taxableBase: 500, tax: 25, total: 525, refund: 525 });

eq("never refunds more than was paid",
  cancellationMoney(inclusive, [{ price: 99999, quantity: 3 }], 1).refund <= inclusive.total, true);
eq("bad quantities are treated as zero, not negative",
  cancellationMoney(inclusive, [{ price: 500, quantity: -4 }], 1).refund, 0);

// ── Delivery by distance ────────────────────────────────────────────────────
const rules = normalizeShipping({
  shipping: {
    distanceEnabled: true,
    storePincode: "390019",
    slabs: [{ upToKm: 50, fee: 60 }, { upToKm: 10, fee: 30 }],
    beyondFee: 150,
  },
});
eq("bands are sorted, so the nearest band wins", feeForDistance(rules, 8), 30);
eq("band edges are inclusive", feeForDistance(rules, 50), 60);
eq("beyond the last band", feeForDistance(rules, 51), 150);
eq("distance pricing stays off without a store PIN code",
  normalizeShipping({ shipping: { distanceEnabled: true, storePincode: "" } }).distanceEnabled, false);
eq("negative or broken bands are dropped",
  normalizeShipping({ shipping: { slabs: [{ upToKm: -5, fee: 10 }, { upToKm: 20, fee: -1 }] } }).slabs.length > 0, true);
const vadodaraToAhmedabad = haversineKm({ lat: 22.3072, lng: 73.1812 }, { lat: 23.0225, lng: 72.5714 });
eq("Vadodara to Ahmedabad is about 100 km", vadodaraToAhmedabad > 95 && vadodaraToAhmedabad < 105, true);

// ── Merchandising signals ───────────────────────────────────────────────────
eq("percent off", discountPercent({ price: 599, sale_price: 499 }), 17);
eq("no sale, no percent", discountPercent({ price: 599, sale_price: null }), 0);
eq("a sale price above MRP is ignored", discountPercent({ price: 599, sale_price: 799 }), 0);
eq("savings per unit", savingsPerUnit({ price: 599, sale_price: 499 }), 100);
eq("low stock shows only when it is really low", [lowStockCount({ stock: 3 }), lowStockCount({ stock: 40 }), lowStockCount({ stock: 0 })], [3, null, null]);
eq("quantity is capped at stock", maxQuantity({ stock: 2 }), 2);
eq("quantity is capped at the per-order limit", maxQuantity({ stock: 500 }), 20);
eq("PIN codes", [isValidPincode("390019"), isValidPincode("012345"), isValidPincode("39001")], [true, false, false]);

console.log(fails ? `\n${fails} money check(s) failed` : "\nall money checks passed");
process.exit(fails ? 1 : 0);
