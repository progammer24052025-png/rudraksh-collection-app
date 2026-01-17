"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Star, Heart, Truck, RefreshCw, Shield, Minus, Plus, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CartProvider, useCart } from "@/lib/cart-context";
import { products, formatPrice } from "@/lib/store-data";
import { toast } from "sonner";

function ProductDetailContent() {
  const params = useParams();
  const productId = params.id as string;
  const product = products.find((p) => p.id === productId);
  const { addItem } = useCart();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState<string | null>(null);

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

  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    if (!selectedColor && product.colors.length > 0) {
      toast.error("Please select a color");
      return;
    }
    addItem(product.id, selectedSize, selectedColor || product.colors[0]?.name || "", quantity);
    toast.success("Added to cart!");
  };

  const checkDelivery = () => {
    if (pincode.length === 6) {
      setDeliveryInfo("Delivery available in 3-5 business days. COD available.");
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
        <ChevronLeft className="h-4 w-4" />
        Back to Products
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted"
          >
            <Image
              src={product.images[selectedImage] || product.image}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
            {product.discount > 0 && (
              <Badge className="absolute left-4 top-4 bg-destructive text-destructive-foreground">
                -{product.discount}% OFF
              </Badge>
            )}
          </motion.div>

          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                  idx === selectedImage ? "border-primary" : "border-transparent"
                }`}
              >
                <Image src={img} alt={`${product.name} ${idx + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-2xl font-bold sm:text-3xl">{product.name}</h1>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-saffron text-saffron" />
                <span className="font-medium">{product.rating}</span>
              </div>
              <span className="text-muted-foreground">({product.reviews} reviews)</span>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
            {product.originalPrice > product.price && (
              <>
                <span className="text-xl text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </span>
                <Badge variant="secondary" className="text-green-600">
                  Save {formatPrice(product.originalPrice - product.price)}
                </Badge>
              </>
            )}
          </div>

          <p className="text-muted-foreground">{product.description}</p>

          {product.colors.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold">Color</h3>
              <div className="flex gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`group relative h-10 w-10 rounded-full border-2 transition-all ${
                      selectedColor === color.name ? "border-primary ring-2 ring-primary/20" : "border-border"
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    {selectedColor === color.name && (
                      <Check className={`absolute inset-0 m-auto h-5 w-5 ${
                        color.hex === "#FFFFFF" || color.hex === "#FFD700" ? "text-black" : "text-white"
                      }`} />
                    )}
                  </button>
                ))}
              </div>
              {selectedColor && <p className="mt-2 text-sm text-muted-foreground">{selectedColor}</p>}
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Size</h3>
              <button className="text-sm text-primary hover:underline">Size Guide</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`min-w-[3rem] rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    selectedSize === size
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Quantity</h3>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-lg font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button size="lg" className="flex-1" onClick={handleAddToCart} disabled={!product.inStock}>
              {product.inStock ? "Add to Cart" : "Out of Stock"}
            </Button>
            <Button size="lg" variant="outline">
              <Heart className="h-5 w-5" />
            </Button>
          </div>

          <div className="rounded-xl border border-border p-4">
            <h3 className="mb-3 font-semibold">Check Delivery</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="max-w-[200px]"
              />
              <Button variant="outline" onClick={checkDelivery}>
                Check
              </Button>
            </div>
            {deliveryInfo && (
              <p className="mt-3 flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                {deliveryInfo}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Free Shipping</p>
                <p className="text-xs text-muted-foreground">Above ₹999</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <RefreshCw className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Easy Returns</p>
                <p className="text-xs text-muted-foreground">7 days</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">COD Available</p>
                <p className="text-xs text-muted-foreground">Pay on delivery</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="shipping">Shipping</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-2 pt-4">
              <p><span className="font-medium">Fabric:</span> {product.fabric}</p>
              <p><span className="font-medium">Category:</span> {product.category}</p>
              <p><span className="font-medium">Care:</span> Machine wash cold</p>
            </TabsContent>
            <TabsContent value="shipping" className="space-y-2 pt-4">
              <p>Standard delivery: 3-5 business days</p>
              <p>Express delivery: 1-2 business days (additional charges)</p>
              <p>Free shipping on orders above ₹999</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-8 font-serif text-2xl font-bold">You May Also Like</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((product, idx) => (
              <ProductCard key={product.id} product={product} index={idx} />
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
