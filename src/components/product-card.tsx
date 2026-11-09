"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { type Product, effectivePrice, formatPrice } from "@/lib/store-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/use-wishlist";
import { toast } from "sonner";

type ProductCardProps = {
  product: Product;
  index?: number;
};

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();
  const saved = has(product.id);
  const displayPrice = effectivePrice(product);
  const hasDiscount = displayPrice < product.price;

  const handleWishlist = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggle(product.id);
    toast.success(saved ? "Removed from wishlist" : "Saved to wishlist");
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.sizes.length) {
      addItem(product.id, "Free Size", product.colors[0]?.name || "", 1);
    } else {
      addItem(product.id, product.sizes[0], product.colors[0]?.name || "", 1);
    }
    toast.success("Added to cart");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
      className="group relative"
    >
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {hasDiscount && (
            <Badge className="absolute left-2 top-2 bg-destructive text-destructive-foreground">
              Sale
            </Badge>
          )}


          <Button
            variant="ghost"
            size="icon"
            className={`absolute right-2 top-2 h-8 w-8 rounded-full bg-white/85 backdrop-blur transition-opacity hover:bg-white ${
              saved ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            onClick={handleWishlist}
            aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={saved}
          >
            <Heart className={`h-4 w-4 ${saved ? "fill-rose text-rose" : ""}`} />
          </Button>

          {product.stock === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded bg-white/90 px-3 py-1 text-sm font-medium">Out of Stock</span>
            </div>
          )}

          {product.stock > 0 && (
            <Button
              size="sm"
              className="absolute bottom-3 left-3 right-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              onClick={handleQuickAdd}
            >
              Quick Add
            </Button>
          )}
        </div>

        <div className="mt-3 space-y-0.5">
          {product.brand_name && (
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {product.brand_name}
            </p>
          )}
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</h3>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">{formatPrice(displayPrice)}</span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
