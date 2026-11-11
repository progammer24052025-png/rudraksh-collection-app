"use client";

import Link from "next/link";
import Image from "@/components/store-image";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, MapPin, Phone, Clock, Star, Sparkles, Heart, Truck, Shield, RotateCcw } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { ScrollStory } from "@/components/scroll-story";
import { effectivePrice, fetchProducts, formatPrice, type Product } from "@/lib/store-data";
import { ShopByCategory } from "@/components/shop-by-category";
import { useStore } from "@/lib/store-context";
import { OffersBanner } from "@/components/kit/offers-banner";
import { BrandCarousel } from "@/components/brand-carousel";
import { ClothingRailHero, type RailGarment } from "@/components/ui/product-rail-gallery";
import { subscribeBanners, isBannerLive } from "@/lib/firebase";
import type { Banner } from "@/lib/types";

/**
 * three.js is ~600 kB before it draws anything. Loading it dynamically keeps
 * it out of the route's initial bundle, so the hero copy and buttons paint
 * first and the canvas arrives after the page is interactive.
 */
const Hero3D = dynamic(() => import("@/components/hero-3d").then((mod) => mod.Hero3D), {
  ssr: false,
  loading: () => null,
});

function Hero3DLazy({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <Hero3D scrollProgress={scrollProgress} />;
}

function HeroSection({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const storeConfig = useStore();
  return (
    <section data-hero-scale className="relative flex min-h-[85vh] items-center overflow-hidden bg-cream">
      {/* 3D background */}
      <Hero3DLazy scrollProgress={scrollProgress} />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/30" />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p data-reveal className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-sage">
            {storeConfig.category} — {storeConfig.location}
          </p>
          <h1 data-reveal className="font-serif text-5xl font-medium leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
            Little Styles.
            <br />
            <em className="text-rose">Big Personalities.</em>
          </h1>
          <p data-reveal className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Discover comfortable, thoughtfully selected children&apos;s wear for everyday
            adventures and special little moments.
          </p>
          <div data-reveal className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2 rounded-full px-8">
              <Link href="/products">
                Explore the Collection
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8">
              <Link href="/brands">Discover Our Brands</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-muted-foreground">
        <div className="h-8 w-5 rounded-full border-2 border-muted-foreground/30">
          <div className="mx-auto mt-1.5 h-2 w-1 rounded-full bg-muted-foreground/50" />
        </div>
      </div>
    </section>
  );
}



/**
 * Reference #10 — Offers banner. Rendered from Admin → Banners, so an empty
 * admin means no banner rather than invented copy or a phantom code.
 */
function BannerSection() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => subscribeBanners(setBanners), []);

  const banner = banners
    .filter((row) => isBannerLive(row) && (row.placement === "home_offers" || row.placement === "announcement"))
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))[0];

  const wanted = banner?.product_ids ?? [];

  useEffect(() => {
    if (!banner) return;
    fetchProducts({ limit: 8 })
      .then((result) => {
        const chosen = wanted.length
          ? result.products.filter((product) => wanted.includes(product.id))
          : result.products.filter((product) => product.is_featured);
        setProducts(chosen.length ? chosen : result.products.slice(0, 4));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner?.id]);

  if (!banner) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
      <OffersBanner
        eyebrow="Offer"
        title={banner.title}
        description={banner.subtitle}
        code={banner.code}
        ctaHref={banner.link || "/offers"}
        ctaLabel="See all offers"
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          subtitle: product.brand_name,
          price: effectivePrice(product),
          image: product.images[0] ?? "",
          href: `/products/${product.id}`,
        }))}
      />
    </section>
  );
}

/** The clothing rail — browse new arrivals as pieces hanging on a rack. */
function NewOnTheRail({ products }: { products: Product[] }) {
  const items: RailGarment[] = products
    .filter((product) => product.images.length > 0)
    .slice(0, 6)
    .map((product) => ({
      id: product.id,
      name: product.name,
      description: product.brand_name ? `${product.brand_name} · ${formatPrice(effectivePrice(product))}` : formatPrice(effectivePrice(product)),
      image: product.images[0],
      cutout: product.image_cutout ?? undefined,
      tag: formatPrice(effectivePrice(product)),
      href: `/products/${product.id}`,
      details: [product.brand_name, product.category_name, product.fabric].filter((value): value is string => Boolean(value)),
    }));

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <ClothingRailHero
        hanger="wood"
        eyebrow="New this week"
        heading="New on the rail"
        caption="Move along the rail, or open a piece to shop it."
        items={items}
        action={
          <Button asChild>
            <Link href="/products">Shop all pieces</Link>
          </Button>
        }
      />
    </section>
  );
}

function FeaturedProducts({ products }: { products: Product[] }) {
  const featured = products.filter(p => p.is_featured).slice(0, 8);
  const display = featured.length >= 4 ? featured : products.slice(0, 8);

  if (display.length === 0) return null;

  return (
    <section className="border-y border-border bg-secondary/20 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div data-reveal className="mb-12 flex items-end justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage">New Arrivals</p>
            <h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">Fresh for This Season</h2>
          </div>
          <Button asChild variant="ghost" className="hidden gap-1 sm:flex">
            <Link href="/products">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {display.map((product, idx) => (
            <ProductCard key={product.id} product={product} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

function QualityStory() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div data-reveal>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage">Our Promise</p>
            <h2 className="mt-3 font-serif text-3xl font-medium leading-snug sm:text-4xl">
              Comfort They Forget They&apos;re Wearing
            </h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Every piece in our collection is chosen with one thing in mind: how it feels on
              little ones. Soft fabrics, thoughtful fits, and easy care — because childhood
              should be about play, not fussing over clothes.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage/10">
                  <Heart className="h-6 w-6 text-sage" />
                </div>
                <p className="mt-3 text-sm font-medium">Gentle Fabrics</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose/10">
                  <Sparkles className="h-6 w-6 text-rose" />
                </div>
                <p className="mt-3 text-sm font-medium">Thoughtful Design</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-saffron/10">
                  <Shield className="h-6 w-6 text-saffron" />
                </div>
                <p className="mt-3 text-sm font-medium">Trusted Brands</p>
              </div>
            </div>
          </div>
          <div data-parallax="0.15" className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
            <Image
              src="https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=700&h=900&fit=crop"
              alt="Children's clothing detail"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function StoreVisit() {
  const storeConfig = useStore();
  return (
    <section className="border-t border-border bg-secondary/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage">Visit Us</p>
          <h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">See It, Feel It, Love It</h2>
          <p className="mt-4 text-muted-foreground">
            Visit our store in {storeConfig.location} to explore the full collection in person.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {storeConfig.location}
            </span>
            {storeConfig.openingHours && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {storeConfig.openingHours}
              </span>
            )}
            {storeConfig.phone && (
              <a href={`tel:${storeConfig.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                <Phone className="h-4 w-4" /> {storeConfig.phone}
              </a>
            )}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/visit">Plan Your Visit</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8">
              <Link href="/directions">Get Directions</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  const storeConfig = useStore();
  const items = [
    { icon: Truck, label: "Free Shipping", detail: `Orders above ₹${storeConfig.freeShippingThreshold}` },
    { icon: RotateCcw, label: "Easy Returns", detail: `${storeConfig.returnWindowDays}-day return policy` },
    { icon: Shield, label: "Secure Checkout", detail: storeConfig.codAvailable ? "COD & online payment" : "Online payment" },
    { icon: Star, label: `${storeConfig.googleRating} Rating`, detail: "Google reviews" },
  ];

  return (
    <section className="border-t border-border py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div data-stagger className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <item.icon className="h-5 w-5 text-foreground/60" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomePageContent() {
  const scrollProgress = useRef(0);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const onScroll = () => {
      scrollProgress.current = Math.min(window.scrollY / window.innerHeight, 1);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetchProducts({ limit: 8 }).then(r => setProducts(r.products)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ScrollStory>
        <main>
          <HeroSection scrollProgress={scrollProgress} />
          <BannerSection />
          <NewOnTheRail products={products} />
          <BrandCarousel />
          <ShopByCategory />
          <FeaturedProducts products={products} />
          <QualityStory />
          <StoreVisit />
          <TrustBar />
        </main>
      </ScrollStory>
      <Footer />
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <HomePageContent />
    </>
  );
}
