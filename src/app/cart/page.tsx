"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { CartProvider, useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/store-data";

function CartContent() {
  const { items, updateQuantity, removeItem, getCartTotal, getProduct } = useCart();
  const cartTotal = getCartTotal();
  const shipping = cartTotal >= 999 ? 0 : 99;
  const grandTotal = cartTotal + shipping;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="mt-6 font-serif text-2xl font-bold">Your cart is empty</h1>
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
      <h1 className="font-serif text-2xl font-bold sm:text-3xl">Shopping Cart</h1>
      <p className="mt-1 text-muted-foreground">{items.length} item(s) in your cart</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item, idx) => {
              const product = getProduct(item.productId);
              if (!product) return null;

              return (
                <motion.div
                  key={`${item.productId}-${item.size}-${item.color}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <Link href={`/products/${product.id}`} className="shrink-0">
                    <div className="relative h-28 w-24 overflow-hidden rounded-lg bg-muted sm:h-32 sm:w-28">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </Link>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <Link href={`/products/${product.id}`}>
                        <h3 className="font-medium hover:text-primary">{product.name}</h3>
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Size: {item.size} {item.color && `• Color: ${item.color}`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(item.productId, item.size, item.color, item.quantity - 1)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(item.productId, item.size, item.color, item.quantity + 1)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-primary">
                          {formatPrice(product.price * item.quantity)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.productId, item.size, item.color)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6">
            <Link
              href="/products"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Continue Shopping
            </Link>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-6">
            <h2 className="font-serif text-lg font-semibold">Order Summary</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">
                  {shipping === 0 ? (
                    <span className="text-green-600">FREE</span>
                  ) : (
                    formatPrice(shipping)
                  )}
                </span>
              </div>
              {cartTotal < 999 && (
                <p className="text-xs text-muted-foreground">
                  Add {formatPrice(999 - cartTotal)} more for free shipping
                </p>
              )}
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-primary">{formatPrice(grandTotal)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes</p>
              </div>
            </div>

            <Button asChild size="lg" className="mt-6 w-full gap-2">
              <Link href="/checkout">
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-center text-xs text-muted-foreground">
              <p>We accept UPI, Cards, Wallets & COD</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <main>
          <CartContent />
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
