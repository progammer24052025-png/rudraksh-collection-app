"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Heart, Truck, RotateCcw, Shield, Minus, Plus, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CartProvider, useCart } from "@/lib/cart-context";
import { fetchProduct, fetchProducts, formatPrice, type Product } from "@/lib/store-data";
import { storeConfig } from "@/lib/config";
import { toast } from "sonner";

function ProductDetailContent() {
  const params = useParams();
  const slug = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, setProducts } = useCart();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchProduct(slug).then(p => {
      setProduct(p);
      if (p) {
        setProducts([p]);
        fetchProducts({ category: p.category_slug || "", limit: "4" }).then(r => {
          setRelated(r.products.filter(x => x.id !== p.id).slice(0, 4));
        }).catch(() => {});
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug, setProducts]);

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

  const displayPrice = product.sale_price ?? product.price;
  const hasDiscount = product.sale_price != null && product.sale_price < product.price;

  const handleAddToCart = () => {
    if (product.sizes.length > 0 && !selectedSize) {
      toast.error("Please select a size");
      return;
    }
    if (product.colors.length > 0 && !selectedColor) {
      toast.error("Please select a color");
      return;
    }
    addItem(product.id, selectedSize || "Free Size", selectedColor || product.colors[0]?.name || "", quantity);
    toast.success("Added to cart");
  };

  const checkDelivery = () => {
    if (pincode.length === 6) {
      setDeliveryInfo(`Delivery available to ${pincode} in 3-5 business days.`);
    } else {
      toast.error("Please enter a valid 6-digit pincode");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Products
      </Link>

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
            {hasDiscount && (
              <Badge className="absolute left-4 top-4 bg-destructive text-destructive-foreground">Sale</Badge>
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
              <Link href={`/brands/${product.brand_slug}`} className="text-sm font-medium uppercase tracking-wider text-sage hover:underline">
                {product.brand_name}
              </Link>
            )}
            <h1 className="mt-1 font-serif text-2xl font-medium sm:text-3xl">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold">{formatPrice(displayPrice)}</span>
            {hasDiscount && (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatPrice(product.price)}</span>
                <Badge variant="secondary" className="text-sage">
                  Save {formatPrice(product.price - product.sale_price!)}
                </Badge>
              </>
            )}
          </div>

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          {product.colors.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold">Color</h3>
              <div className="flex gap-2.5">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`relative h-10 w-10 rounded-full border-2 transition-all ${
                      selectedColor === color.name ? "border-primary ring-2 ring-primary/20" : "border-border"
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    {selectedColor === color.name && (
                      <Check className={`absolute inset-0 m-auto h-5 w-5 ${
                        ["#FFFFFF", "#FFFDD0", "#F0F8FF", "#ADD8E6", "#98FB98", "#E6E6FA"].includes(color.hex)
                          ? "text-black" : "text-white"
                      }`} />
                    )}
                  </button>
                ))}
              </div>
              {selectedColor && <p className="mt-2 text-sm text-muted-foreground">{selectedColor}</p>}
            </div>
          )}

          {product.sizes.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Size</h3>
                <Link href="/shipping" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                  Size Guide
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[3.5rem] rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      selectedSize === size
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary"
                    }`}
                  >{size}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold">Quantity</h3>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button size="lg" className="flex-1" onClick={handleAddToCart} disabled={product.stock === 0}>
              {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
            </Button>
            <Button size="lg" variant="outline" aria-label="Add to wishlist">
              <Heart className="h-5 w-5" />
            </Button>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h3 className="mb-3 text-sm font-semibold">Check Delivery</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="max-w-[200px]"
              />
              <Button variant="outline" onClick={checkDelivery}>Check</Button>
            </div>
            {deliveryInfo && (
              <p className="mt-3 flex items-center gap-2 text-sm text-sage">
                <Check className="h-4 w-4" /> {deliveryInfo}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2.5 rounded-md bg-muted/50 p-3">
              <Truck className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">Free Shipping</p>
                <p className="text-xs text-muted-foreground">Above ₹{storeConfig.freeShippingThreshold}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-md bg-muted/50 p-3">
              <RotateCcw className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">Easy Returns</p>
                <p className="text-xs text-muted-foreground">7 days</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-md bg-muted/50 p-3">
              <Shield className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">COD Available</p>
                <p className="text-xs text-muted-foreground">Pay on delivery</p>
              </div>
            </div>
          </div>

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
              <p>Standard delivery: 3-5 business days</p>
              <p>Free shipping on orders above ₹{storeConfig.freeShippingThreshold}</p>
              <p>Cash on delivery available</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-serif text-2xl font-medium">You May Also Like</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p, idx) => (
              <ProductCard key={p.id} product={p} index={idx} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <main>
          <ProductDetailContent />
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
