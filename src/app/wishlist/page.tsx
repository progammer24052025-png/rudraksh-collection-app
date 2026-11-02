"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Trash2, ShoppingBag } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { CartProvider, useCart } from "@/lib/cart-context";
import { formatPrice, fetchProducts, type Product } from "@/lib/store-data";
import { toast } from "sonner";

function WishlistContent() {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    const saved = localStorage.getItem("rudraksh-wishlist");
    if (saved) {
      try { setWishlist(JSON.parse(saved)); } catch { setWishlist([]); }
    }
    fetchProducts({ limit: "100" }).then(r => setProducts(r.products)).catch(() => {});
  }, []);

  const toggleWishlist = (id: string) => {
    setWishlist(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("rudraksh-wishlist", JSON.stringify(next));
      return next;
    });
  };

  const wishlistProducts = products.filter(p => wishlist.includes(p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-medium sm:text-3xl">Your Wishlist</h1>
      <p className="mt-1 text-sm text-muted-foreground">{wishlistProducts.length} saved item(s)</p>

      {wishlistProducts.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {wishlistProducts.map(product => (
            <div key={product.id} className="group relative">
              <Link href={`/products/${product.slug}`} className="block">
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
                  {product.images[0] && (
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                  )}
                </div>
                <div className="mt-3">
                  {product.brand_name && (
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {product.brand_name}
                    </p>
                  )}
                  <h3 className="text-sm font-medium">{product.name}</h3>
                  <p className="mt-1 font-semibold">
                    {formatPrice(product.sale_price ?? product.price)}
                  </p>
                </div>
              </Link>
              <div className="absolute right-2 top-2 flex gap-1.5">
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur hover:bg-white"
                  aria-label="Remove from wishlist"
                >
                  <Heart className="h-4 w-4 fill-rose text-rose" />
                </button>
              </div>
              <Button
                size="sm" className="mt-2 w-full"
                onClick={() => {
                  addItem(product.id, product.sizes[0] || "Free Size", product.colors[0]?.name || "", 1);
                  toast.success("Added to cart");
                }}
              >
                <ShoppingBag className="mr-1.5 h-3.5 w-3.5" /> Add to Cart
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <Heart className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="mt-6 font-serif text-xl font-medium">Your wishlist is empty</h2>
          <p className="mt-2 text-muted-foreground">Save items you love to buy later</p>
          <Button asChild className="mt-6">
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function WishlistPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <main>
          <WishlistContent />
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
