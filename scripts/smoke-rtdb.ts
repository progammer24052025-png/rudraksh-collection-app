/**
 * Smoke test for the Realtime Database layer.
 * Runs the exact modules the browser uses (with a `window` shim) against the
 * configured database, then deletes the records it created.
 *
 *   bun run scripts/smoke-rtdb.ts
 */

// The Firebase web SDK needs a window-like global for its browser branch.
if (typeof globalThis.window === "undefined") {
  (globalThis as unknown as { window: unknown }).window = globalThis;
}

const dbUrl = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/$/, "");
const root = process.env.NEXT_PUBLIC_FIREBASE_DB_ROOT || "rudraksh";

async function main() {
  const fb = await import("../src/lib/firebase");

  if (!fb.isFirebaseConfigured()) throw new Error("Firebase env vars are missing");
  console.log(`database: ${dbUrl}/${root}`);

  const products = await fb.fetchProducts();
  console.log(`products read: ${products.length}`);
  if (products.length === 0) throw new Error("catalogue is empty — run `bun run seed`");

  const sample = products.find((product) => product.slug === "boys-cotton-casual-shirt") ?? products[0];
  const bySlug = await fb.fetchProductBySlug(sample.slug);
  if (!bySlug) throw new Error(`fetchProductBySlug failed for ${sample.slug}`);
  console.log(`product lookup: ${bySlug.name} (₹${bySlug.price})`);

  const order = await fb.placeOrder({
    user_id: null,
    customer_name: "SMOKE TEST — ignore",
    phone: "9999900001",
    email: null,
    address: "Test address",
    city: "Vadodara",
    state: "Gujarat",
    pincode: "390001",
    items: [
      {
        productId: sample.id,
        name: sample.name,
        brand: sample.brand_name ?? "",
        size: sample.sizes?.[0] ?? "Free Size",
        color: sample.colors?.[0]?.name ?? "",
        quantity: 1,
        price: fb.effectivePrice(sample),
        image: sample.images?.[0] ?? "",
      },
    ],
    subtotal: fb.effectivePrice(sample),
    shipping: 0,
    total: fb.effectivePrice(sample),
    payment_method: "cod",
    notes: "smoke test",
  });
  console.log(`order created: ${order.order_number} (${order.id})`);
  if (!order.order_number.startsWith("RC-")) throw new Error("order number format is wrong");

  const tracking = await fb.findOrderForTracking(order.order_number, "0001");
  if (!tracking) throw new Error("tracking lookup failed");
  console.log(`tracking lookup: ${tracking.order_status} / phone ..${tracking.phone_last4}`);

  const wrongPhone = await fb.findOrderForTracking(order.order_number, "1234");
  if (wrongPhone) throw new Error("tracking lookup did not reject a wrong phone suffix");
  console.log("tracking rejects wrong phone suffix: ok");

  await fb.updateOrderStatus(order.id, "confirmed");
  const updated = await fb.findOrderForTracking(order.order_number, "0001");
  if (updated?.order_status !== "confirmed") throw new Error("status update did not reach tracking");
  console.log(`status update: placed → ${updated.order_status} (history ${updated.status_history.length})`);

  await fb.saveSettings({
    storeName: "Rudraksh Collection",
    tagline: "Little Moments, Beautifully Dressed",
    announcement: "Free shipping on orders above ₹999",
    freeShippingThreshold: 999,
    shippingFee: 99,
    codAvailable: true,
    razorpayEnabled: false,
  });
  const settings = await fb.readSettings();
  if (settings?.freeShippingThreshold !== 999) throw new Error("settings round-trip failed");
  console.log("settings round-trip: ok");

  // Clean up everything this test created.
  await fb.removeValue(["orders", order.id]);
  await fb.removeValue(["ordersByUser", "guest", order.id]);
  await fb.removeValue(["tracking", order.order_number]);
  console.log("cleanup: ok");
  console.log("ALL CHECKS PASSED");
  process.exit(0);
}

main().catch((error) => {
  console.error("SMOKE TEST FAILED:", error?.message ?? error);
  process.exit(1);
});
