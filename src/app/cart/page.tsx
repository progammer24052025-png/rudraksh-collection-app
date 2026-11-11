"use client";

import Link from "next/link";
import Image from "@/components/store-image";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-context";
import { effectivePrice, fetchProducts, formatPrice, type Product } from "@/lib/store-data";
import { useStore } from "@/lib/store-context";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CartOffers } from "@/components/cart-offers";
import { FreeShippingBar } from "@/components/free-shipping-bar";
import { ProductCard } from "@/components/product-card";
import { RecentlyViewed } from "@/components/recently-viewed";
import { BuyAssurance } from "@/components/trust-strip";
import { couponDiscount } from "@/lib/pricing";
import { lowStockCount, maxQuantity, savingsPerUnit } from "@/lib/merch";
import type { Coupon } from "@/lib/types";

function CartContent() {
  const storeConfig = useStore();
  const { items, updateQuantity, removeItem, getCartTotal, getProduct, setProducts, isHydrated } = useCart();
  const cartTotal = getCartTotal();
  // With distance pricing the charge is unknown until a PIN code is entered at
  // checkout, so the cart shows "calculated at checkout" instead of a guess.
  const byDistance = Boolean(storeConfig.shipping?.distanceEnabled);
  const freeDelivery = cartTotal >= storeConfig.freeShippingThreshold;
  const shipping = freeDelivery || byDistance ? 0 : storeConfig.shippingFee;
  const [catalogue, setCatalogue] = useState<Product[]>([]);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const handleCoupon = useCallback((next: Coupon | null) => setCoupon(next), []);

  // An estimate: checkout re-prices everything and confirms the coupon.
  const discount = coupon ? couponDiscount(coupon, cartTotal) : 0;
  const grandTotal = Math.max(0, cartTotal - discount) + shipping;

  // What the bag saves against list prices — real money, worth showing.
  const listSavings = items.reduce((sum, item) => {
    const product = getProduct(item.productId);
    return product ? sum + savingsPerUnit(product) * item.quantity : sum;
  }, 0);

  // Ensure products are loaded for cart display (Realtime Database).
  useEffect(() => {
    if (items.length > 0) {
      fetchProducts()
        .then((r) => {
          setProducts(r.products);
          setCatalogue(r.products);
          // A saved bag can hold pieces that were since removed from the shop. They used to be
          // hidden here while still counted in the header badge and "N items", so the count
          // looked one too high. Take them out and say so. An empty catalogue means the fetch
          // went wrong, not that everything sold out, so nothing is removed then.
          if (r.products.length === 0) return;
          const live = new Set(r.products.map((product) => product.id));
          const gone = items.filter((item) => !live.has(item.productId));
          if (gone.length === 0) return;
          gone.forEach((item) => removeItem(item.productId, item.size, item.color));
          toast.info(
            gone.length === 1
              ? "1 item in your bag is no longer available, so we removed it."
              : `${gone.length} items in your bag are no longer available, so we removed them.`,
          );
        })
        .catch(() => {});
    }
  }, [items.length, setProducts]);

  // Pieces that would take the bag over the free-delivery line: the cheapest
  // ones that close the gap first, so the suggestion is useful, not an upsell.
  const inBag = useMemo(() => new Set(items.map((item) => item.productId)), [items]);
  const gap = Math.max(0, storeConfig.freeShippingThreshold - cartTotal);
  const suggestions = useMemo(() => {
    if (gap <= 0) return [];
    const candidates = catalogue.filter((product) => !inBag.has(product.id) && product.stock > 0);
    const closing = candidates
      .filter((product) => effectivePrice(product) >= gap)
      .sort((a, b) => effectivePrice(a) - effectivePrice(b));
    const rest = candidates
      .filter((product) => effectivePrice(product) < gap)
      .sort((a, b) => effectivePrice(b) - effectivePrice(a));
    return [...closing, ...rest].slice(0, 4);
  }, [catalogue, gap, inBag]);

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="mt-6 font-serif text-2xl font-medium">Your cart is empty</h1>
          <p className="mt-2 text-muted-foreground">Add some items to get started</p>
          <Button asChild className="mt-6">
            <Link href="/products">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-medium sm:text-3xl">Shopping Cart</h1>
      <p className="mt-1 text-sm text-muted-foreground">{items.length} {items.length === 1 ? "item" : "items"}</p>

      <FreeShippingBar
        className="mt-6"
        subtotal={cartTotal}
        threshold={storeConfig.freeShippingThreshold}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item, idx) => {
              const product = getProduct(item.productId);
              if (!product) return null;
              const price = effectivePrice(product);
              const maxQty = maxQuantity(product);
              const lowStock = lowStockCount(product);

              return (
                <motion.div
                  key={`${item.productId}-${item.size}-${item.color}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex gap-4 rounded-lg border border-border bg-card p-4"
                >
                  <Link href={`/products/${product.slug}`} className="shrink-0">
                    <div className="relative h-28 w-24 overflow-hidden rounded-md bg-muted sm:h-32 sm:w-28">
                      {product.images[0] && (
                        <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                      )}
                    </div>
                  </Link>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      {product.brand_name && (
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {product.brand_name}
                        </p>
                      )}
                      <Link href={`/products/${product.slug}`}>
                        <h2 className="text-sm font-medium hover:text-primary">{product.name}</h2>
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.size}{item.color && ` • ${item.color}`}
                      </p>
                      {product.stock <= 0 ? (
                        <p className="mt-1 text-xs font-medium text-destructive">
                          Sold out — remove it to check out
                        </p>
                      ) : lowStock !== null ? (
                        <p className="mt-1 text-xs font-medium text-destructive">Only {lowStock} left</p>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline" size="icon" className="h-8 w-8"
                          aria-label={`Decrease quantity of ${product.name}`}
                          onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium" aria-live="polite" aria-label={`Quantity ${item.quantity}`}>{item.quantity}</span>
                        <Button
                          variant="outline" size="icon" className="h-8 w-8"
                          aria-label={`Increase quantity of ${product.name}`}
                          disabled={item.quantity >= maxQty}
                          onClick={() => updateQuantity(item.productId, item.size, item.color, Math.min(maxQty, item.quantity + 1))}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{formatPrice(price * item.quantity)}</span>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${product.name} from cart`}
                          onClick={() => removeItem(item.productId, item.size, item.color)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6">
            <Link href="/products" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Continue Shopping
            </Link>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-lg border border-border bg-card p-6">
            <h2 className="font-serif text-lg font-medium">Order Summary</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">
                  {freeDelivery ? (
                    <span className="text-sage-ink">FREE</span>
                  ) : byDistance ? (
                    <span className="text-muted-foreground">At checkout</span>
                  ) : (
                    formatPrice(shipping)
                  )}
                </span>
              </div>
              {discount > 0 && coupon && (
                <div className="flex justify-between text-sage-ink">
                  <span>Coupon {coupon.code}</span>
                  <span className="font-medium">− {formatPrice(discount)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-base">
                  <span className="font-semibold">
                    {discount > 0 || (byDistance && !freeDelivery) ? "Estimated total" : "Total"}
                  </span>
                  <span className="font-semibold">{formatPrice(grandTotal)}</span>
                </div>
                {listSavings + discount > 0 && (
                  <p className="mt-1 text-right text-xs font-medium text-sage-ink">
                    You save {formatPrice(listSavings + discount)} on this order
                  </p>
                )}
                {discount > 0 && (
                  <p className="mt-1 text-right text-xs text-muted-foreground">
                    Coupon is confirmed at checkout
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <CartOffers subtotal={cartTotal} onChange={handleCoupon} />
            </div>

            <Button asChild size="lg" className="mt-6 w-full gap-2">
              <Link href="/checkout">
                Proceed to Checkout <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <BuyAssurance className="mt-4 sm:grid-cols-1" />
          </div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-2xl font-medium">
            Add {formatPrice(gap)} more for free delivery
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {byDistance
              ? `Delivery is charged by distance below ${formatPrice(storeConfig.freeShippingThreshold)}.`
              : `Delivery is ${formatPrice(storeConfig.shippingFee)} below ${formatPrice(storeConfig.freeShippingThreshold)}.`}{" "}
            These would cover it.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {suggestions.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed excludeIds={items.map((item) => item.productId)} />
    </div>
  );
}

export default function CartPage() {
  return (
    <>
      <div className="min-h-screen">
        <Header />
        <main id="main">
          <CartContent />
        </main>
        <Footer />
      </div>
    </>
  );
}
