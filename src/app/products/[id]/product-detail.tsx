"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "@/components/store-image";
import Link from "next/link";
import { Heart, MessageCircle, Minus, Plus, Check, Truck, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PageBreadcrumb } from "@/components/kit/page-breadcrumb";
import { ClothingRailHero, useClothItems, type RailGarment } from "@/components/ui/product-rail-gallery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCart } from "@/lib/cart-context";
import { effectivePrice, fetchProduct, fetchProducts, formatPrice, type Product } from "@/lib/store-data";
import { useStore } from "@/lib/store-context";
import { useWishlist } from "@/lib/use-wishlist";
import {
  deliveryWindow,
  discountPercent,
  hasRating,
  isBestseller,
  isValidPincode,
  lowStockCount,
  maxQuantity,
  savingsPerUnit,
} from "@/lib/merch";
import { SizeGuide } from "@/components/size-guide";
import { BuyAssurance, StoreTrust } from "@/components/trust-strip";
import { ProductReviews } from "@/components/product-reviews";
import { RecentlyViewed, rememberViewed } from "@/components/recently-viewed";
import { StarRating } from "@/components/star-rating";
import { NotifyWhenBack } from "@/components/notify-when-back";
import { toast } from "sonner";

function ProductDetailContent({ slug, initialProduct }: { slug: string; initialProduct?: Product | null }) {
  const storeConfig = useStore();
  const router = useRouter();
  const wishlist = useWishlist();
  // The server passes the product in, so the name, price and description are in the HTML that
  // search engines and link previews read, and shoppers do not wait on a skeleton.
  const [product, setProduct] = useState<Product | null>(initialProduct ?? null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!initialProduct);
  const { addItem, setProducts } = useCart();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState<string | null>(null);
  // Which choice the shopper still has to make, shown next to that picker (not only in a toast).
  const [missingChoice, setMissingChoice] = useState<"size" | "color" | null>(null);

  useEffect(() => {
    if (!initialProduct) setLoading(true);
    fetchProduct(slug).then(p => {
      setProduct(p);
      if (p) {
        setProducts([p]);
        rememberViewed(p.id);
        fetchProducts({ category: p.category_slug || "", limit: 4 }).then(r => {
          setRelated(r.products.filter(x => x.id !== p.id).slice(0, 4));
        }).catch(() => {});
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug, setProducts, initialProduct]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-[3/4] animate-pulse rounded-lg bg-muted" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <p className="text-lg font-medium">Product not found</p>
        <Button asChild className="mt-4">
          <Link href="/products">Browse Products</Link>
        </Button>
      </div>
    );
  }

  const displayPrice = effectivePrice(product);
  const hasDiscount = displayPrice < product.price;
  const percentOff = discountPercent(product);
  const lowStock = lowStockCount(product);
  const inStock = product.stock > 0;
  const maxQty = maxQuantity(product);
  const saved = wishlist.has(product.id);
  const eta = deliveryWindow();

  // A single size or colour needs no decision, so it is taken as chosen.
  const size = selectedSize || (product.sizes.length === 1 ? product.sizes[0] : "");
  const activeColor = selectedColor || (product.colors.length === 1 ? product.colors[0].name : "");

  /** Puts the chosen variant in the bag. Returns false when a choice is missing. */
  const addChosen = (): boolean => {
    if (product.sizes.length > 0 && !size) {
      setMissingChoice("size");
      toast.error("Please choose a size");
      document.getElementById("size-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.querySelector<HTMLButtonElement>("#size-picker button[aria-pressed]")?.focus({ preventScroll: true });
      return false;
    }
    if (product.colors.length > 0 && !activeColor) {
      setMissingChoice("color");
      toast.error("Please choose a colour");
      document.getElementById("color-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    setMissingChoice(null);
    addItem(product.id, size || "Free Size", activeColor || product.colors[0]?.name || "", Math.min(quantity, maxQty));
    return true;
  };

  const handleAddToCart = () => {
    if (addChosen()) {
      toast.success("Added to cart", {
        action: { label: "View cart", onClick: () => router.push("/cart") },
      });
    }
  };

  const handleBuyNow = () => {
    if (addChosen()) router.push("/checkout");
  };

  const handleWishlist = () => {
    wishlist.toggle(product.id);
    toast.success(saved ? "Removed from wishlist" : "Saved to wishlist");
  };

  const checkDelivery = async () => {
    if (!isValidPincode(pincode)) {
      setDeliveryInfo(null);
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }
    const arrival = `We deliver to ${pincode}. Estimated arrival ${eta.from} – ${eta.to}.`;
    setDeliveryInfo(arrival);
    if (!storeConfig.shipping?.distanceEnabled) return;
    try {
      const response = await fetch(`/api/shipping?pincode=${pincode}`);
      const data = (await response.json()) as { ok?: boolean; fee?: number; freeAbove?: number };
      if (data.ok && typeof data.fee === "number") {
        setDeliveryInfo(
          `${arrival} Delivery ${data.fee === 0 ? "is free" : `is ${formatPrice(data.fee)}`}` +
            (data.fee > 0 && data.freeAbove ? `, or free on orders above ${formatPrice(data.freeAbove)}.` : "."),
        );
      }
    } catch {
      /* the arrival estimate is still shown */
    }
  };

  const whatsappHref = storeConfig.confirmed.whatsapp && storeConfig.whatsappLink
    ? `${storeConfig.whatsappLink}?text=${encodeURIComponent(
        `Hi, I have a question about "${product.name}"${product.sku ? ` (SKU ${product.sku})` : ""}.`,
      )}`
    : null;

  const railItems: RailGarment[] = related
    .filter((p) => p.images.length > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.brand_name ? `${p.brand_name} · ${formatPrice(p.sale_price ?? p.price)}` : formatPrice(p.sale_price ?? p.price),
      image: p.images[0],
      altImages: p.images.slice(1, 3),
      cutout: p.image_cutout ?? undefined,
      tag: formatPrice(p.sale_price ?? p.price),
      href: `/products/${p.id}`,
      details: [p.brand_name, p.category_name, p.fabric].filter((value): value is string => Boolean(value)),
    }));

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pb-8">
      <PageBreadcrumb
        items={[
          { label: "Shop", href: "/products" },
          ...(product.brand_slug
            ? [{ label: product.brand_name ?? product.brand_slug, href: `/products?brand=${product.brand_slug}` }]
            : []),
          { label: product.name },
        ]}
        className="-mt-2"
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted"
          >
            {product.images[selectedImage] ? (
              <Image
                src={product.images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
            )}
            {percentOff > 0 && (
              <Badge className="absolute left-4 top-4 bg-destructive text-destructive-foreground">
                {percentOff}% off
              </Badge>
            )}
            {product.is_sample && (
              <Badge variant="outline" className="absolute right-4 top-4 bg-background/80 backdrop-blur">Sample</Badge>
            )}
          </motion.div>

          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                    idx === selectedImage ? "border-primary" : "border-transparent"
                  }`}
                >
                  <Image src={img} alt={`${product.name} ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            {product.brand_name && (
              <Link href={`/brands/${product.brand_slug}`} className="text-sm font-medium uppercase tracking-wider text-sage-ink hover:underline">
                {product.brand_name}
              </Link>
            )}
            <h1 className="mt-1 font-serif text-2xl font-medium sm:text-3xl">{product.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {hasRating(product) && (
                <a href="#reviews-heading" className="inline-flex items-center gap-1.5 hover:underline">
                  <StarRating value={product.rating ?? 0} />
                  <span className="text-muted-foreground">
                    {(product.rating ?? 0).toFixed(1)} · {product.rating_count} review
                    {product.rating_count === 1 ? "" : "s"}
                  </span>
                </a>
              )}
              {isBestseller(product) && (
                <Badge className="bg-amber-500 text-white">Bestseller</Badge>
              )}
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold">{formatPrice(displayPrice)}</span>
            {hasDiscount && (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatPrice(product.price)}</span>
                <Badge variant="secondary" className="text-sage-ink">
                  {percentOff}% off · You save {formatPrice(savingsPerUnit(product))}
                </Badge>
              </>
            )}
          </div>
          <p className="-mt-4 text-xs text-muted-foreground">Inclusive of all taxes</p>

          {lowStock !== null && (
            <p className="-mt-2 text-sm font-medium text-destructive">
              Only {lowStock} left in stock
            </p>
          )}

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          {product.colors.length > 0 && (
            <div id="color-picker">
              <h2 className="mb-3 text-sm font-semibold">Color</h2>
              <div className="flex gap-2.5">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`relative h-10 w-10 rounded-full border-2 transition-all ${
                      activeColor === color.name ? "border-primary ring-2 ring-primary/20" : "border-border"
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    {activeColor === color.name && (
                      <Check className={`absolute inset-0 m-auto h-5 w-5 ${
                        ["#FFFFFF", "#FFFDD0", "#F0F8FF", "#ADD8E6", "#98FB98", "#E6E6FA"].includes(color.hex)
                          ? "text-black" : "text-white"
                      }`} />
                    )}
                  </button>
                ))}
              </div>
              {activeColor && <p className="mt-2 text-sm text-muted-foreground">{activeColor}</p>}
            </div>
          )}

          {product.sizes.length > 0 && (
            <div id="size-picker">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Size</h2>
                <SizeGuide whatsappLink={storeConfig.confirmed.whatsapp ? storeConfig.whatsappLink : null} />
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setSelectedSize(option);
                      if (missingChoice === "size") setMissingChoice(null);
                    }}
                    aria-pressed={size === option}
                    className={`min-h-11 min-w-[3.5rem] rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      size === option
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary"
                    }`}
                  >{option}</button>
                ))}
              </div>
              {missingChoice === "size" ? (
                <p role="alert" className="mt-2 text-sm font-medium text-destructive">
                  Choose a size to add this to your bag.
                </p>
              ) : null}
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold">Quantity</h2>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium" aria-live="polite">{Math.min(quantity, maxQty)}</span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Increase quantity"
                disabled={!inStock || quantity >= maxQty}
                onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
              {inStock && quantity >= maxQty && (
                <span className="text-xs text-muted-foreground">That is all we have right now</span>
              )}
            </div>
          </div>

          {inStock ? (
            <div className="flex flex-wrap gap-3">
              <Button size="lg" variant="outline" className="min-w-[9rem] flex-1" onClick={handleAddToCart}>
                Add to Cart
              </Button>
              <Button size="lg" className="min-w-[9rem] flex-1 gap-2" onClick={handleBuyNow}>
                <Zap className="h-4 w-4" /> Buy Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleWishlist}
                aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={saved}
              >
                <Heart className={`h-5 w-5 ${saved ? "fill-rose text-rose-ink" : ""}`} />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button size="lg" className="flex-1" disabled>Out of Stock</Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleWishlist}
                  aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
                  aria-pressed={saved}
                >
                  <Heart className={`h-5 w-5 ${saved ? "fill-rose text-rose-ink" : ""}`} />
                </Button>
              </div>
              <NotifyWhenBack productId={product.id} />
            </div>
          )}

          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="h-4 w-4 shrink-0" />
            <span>
              Estimated delivery <span className="font-medium text-foreground">{eta.from} – {eta.to}</span>
            </span>
          </p>

          <div className="rounded-lg border border-border p-4">
            <h2 className="mb-3 text-sm font-semibold">Check Delivery</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Enter pincode"
                aria-label="Delivery pincode"
                inputMode="numeric"
                autoComplete="postal-code"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="max-w-[200px]"
              />
              <Button variant="outline" onClick={checkDelivery}>Check</Button>
            </div>
            {deliveryInfo && (
              <p className="mt-3 flex items-center gap-2 text-sm text-sage-ink" role="status">
                <Check className="h-4 w-4" /> {deliveryInfo}
              </p>
            )}
          </div>

          <BuyAssurance />

          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:bg-muted/50"
            >
              <MessageCircle className="h-4 w-4 text-sage-ink" />
              Have a question? Ask us on WhatsApp
            </a>
          )}

          <StoreTrust />

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="care">Care</TabsTrigger>
              <TabsTrigger value="shipping">Shipping</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-2 pt-4 text-sm">
              {product.fabric && <p><span className="font-medium">Fabric:</span> {product.fabric}</p>}
              {product.category_name && <p><span className="font-medium">Collection:</span> {product.category_name}</p>}
              {product.sku && <p><span className="font-medium">SKU:</span> {product.sku}</p>}
            </TabsContent>
            <TabsContent value="care" className="space-y-2 pt-4 text-sm">
              <p>{product.care || "Machine wash cold. Do not bleach."}</p>
            </TabsContent>
            <TabsContent value="shipping" className="space-y-2 pt-4 text-sm">
              <p>Dispatched in {storeConfig.dispatchDays}; delivered in {storeConfig.deliveryDays}</p>
              <p>Free shipping on orders above ₹{storeConfig.freeShippingThreshold}</p>
              <p>Cash on delivery available</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ProductReviews productId={product.id} />

      {related.length > 0 && <RelatedRail items={railItems} />}

      <RecentlyViewed excludeIds={[product.id]} />

      {/* Phones: the buy button stays in reach however far the page is scrolled. */}
      {inStock && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">{product.name}</p>
              <p className="text-base font-semibold">
                {formatPrice(displayPrice)}
                {percentOff > 0 && (
                  <span className="ml-2 text-xs font-medium text-sage-ink">{percentOff}% off</span>
                )}
              </p>
            </div>
            <Button variant="outline" onClick={handleAddToCart}>Add</Button>
            <Button className="gap-1.5" onClick={handleBuyNow}>
              <Zap className="h-4 w-4" /> Buy Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** "You may also like", hung as cloth: pieces whose photos will not separate are left off. */
function RelatedRail({ items }: { items: RailGarment[] }) {
  const cloth = useClothItems(items, 4, 2);
  if (!cloth.ready || cloth.items.length === 0) return null;
  return (
    <section className="mt-16">
      <ClothingRailHero
        hanger="wood"
        eyebrow="From the same rail"
        heading="You may also like"
        caption="Move along the rail, or open a piece to shop it."
        items={cloth.items}
        action={
          <Button asChild variant="outline">
            <Link href="/products">Shop all pieces</Link>
          </Button>
        }
      />
    </section>
  );
}

export function ProductDetailView({ slug, initialProduct }: { slug: string; initialProduct?: Product | null }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main id="main">
        <ProductDetailContent slug={slug} initialProduct={initialProduct} />
      </main>
      <Footer />
    </div>
  );
}
