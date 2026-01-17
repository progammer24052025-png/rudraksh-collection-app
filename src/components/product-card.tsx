"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Star } from "lucide-react";
import { motion } from "framer-motion";
import { type Product, formatPrice } from "@/lib/store-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ProductCardProps = {
  product: Product;
  index?: number;
};

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group relative"
    >
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

          {product.discount > 0 && (
            <Badge className="absolute left-2 top-2 bg-destructive text-destructive-foreground">
              -{product.discount}%
            </Badge>
          )}

          {product.isNew && (
            <Badge className="absolute left-2 top-2 bg-sage text-white">New</Badge>
          )}

          {product.isTrending && !product.isNew && product.discount === 0 && (
            <Badge className="absolute left-2 top-2 bg-saffron text-white">Trending</Badge>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/80 opacity-0 backdrop-blur transition-opacity hover:bg-white group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            <Heart className="h-4 w-4" />
          </Button>

          {!product.inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="font-medium text-white">Out of Stock</span>
            </div>
          )}
        </div>

        <div className="mt-3 space-y-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight">{product.name}</h3>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-saffron text-saffron" />
            <span className="text-xs text-muted-foreground">
              {product.rating} ({product.reviews})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">{formatPrice(product.price)}</span>
            {product.originalPrice > product.price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
