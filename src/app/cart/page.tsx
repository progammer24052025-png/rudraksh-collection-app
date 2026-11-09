"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { effectivePrice, fetchProducts, formatPrice } from "@/lib/store-data";
import { useStore } from "@/lib/store-context";
import { useEffect } from "react";

function CartContent() {
  const storeConfig = useStore();
  const { items, updateQuantity, removeItem, getCartTotal, getProduct, setProducts, isHydrated } = useCart();
  const cartTotal = getCartTotal();
  const shipping = cartTotal >= storeConfig.freeShippingThreshold ? 0 : storeConfig.shippingFee;
  const grandTotal = cartTotal + shipping;

  // Ensure products are loaded for cart display (Realtime Database).
  useEffect(() => {
    if (items.length > 0) {
      fetchProducts().then(r => setProducts(r.products)).catch(() => {});
    }
  }, [items.length, setProducts]);

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
      <p className="mt-1 text-sm text-muted-foreground">{items.length} item(s)</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item, idx) => {
              const product = getProduct(item.productId);
              if (!product) return null;
              const price = effectivePrice(product);

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
                        <h3 className="text-sm font-medium hover:text-primary">{product.name}</h3>
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.size}{item.color && ` • ${item.color}`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline" size="icon" className="h-7 w-7"
                          onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="outline" size="icon" className="h-7 w-7"
                          onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{formatPrice(price * item.quantity)}</span>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
                  {shipping === 0 ? <span className="text-sage">FREE</span> : formatPrice(shipping)}
                </span>
              </div>
              {cartTotal < storeConfig.freeShippingThreshold && (
                <p className="text-xs text-muted-foreground">
                  Add {formatPrice(storeConfig.freeShippingThreshold - cartTotal)} more for free shipping
                </p>
              )}
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </div>

            <Button asChild size="lg" className="mt-6 w-full gap-2">
              <Link href="/checkout">
                Proceed to Checkout <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <div className="mt-4 rounded-md bg-muted/50 p-3 text-center text-xs text-muted-foreground">
              <p>COD & online payment available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <>
      <div className="min-h-screen">
        <Header />
        <main>
          <CartContent />
        </main>
        <Footer />
      </div>
    </>
  );
}
