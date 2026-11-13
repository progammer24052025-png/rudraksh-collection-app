"use client";

import Link from "next/link";
import Image from "@/components/store-image";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, MapPin, Phone, Clock, Sparkles, Heart, Truck, Shield, RotateCcw } from "lucide-react";
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
import { ClothingRailHero, useClothItems, type RailGarment } from "@/components/ui/product-rail-gallery";
import { subscribeBanners, isBannerLive } from "@/lib/firebase";
import type { Banner } from "@/lib/types";
import type { GoogleRating } from "@/lib/server/google-rating";
import { StarRating } from "@/components/star-rating";

/**
 * three.js is ~600 kB before it draws anything. Loading it dynamically keeps
 * it out of the route's initial bundle, so the hero copy and buttons paint
 * first and the canvas arrives after the page is interactive.
 */
const Hero3D = dynamic(() => import("@/components/hero-3d").then((mod) => mod.Hero3D), {
  ssr: false,
  loading: () => null,
});

/**
 * Whether this device should get the 3D hero at all. Phones, data-saver mode,
 * reduced-motion preferences and low-power hardware get the plain hero: the
 * headline and buttons are what sell, and ~600 kB of WebGL on a budget phone
 * only delays them.
 */
function canRender3D(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1024) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
  };
  if (nav.connection?.saveData) return false;
  if (nav.connection?.effectiveType && /(^|-)2g$|^3g$/.test(nav.connection.effectiveType)) return false;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return false;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency < 4) return false;
  return true;
}

function Hero3DLazy({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { setEnabled(canRender3D()); }, []);
  if (!enabled) return null;
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
          {/* The page's one heading names the shop, what it sells and where, so
              searches for the shop's name or "clothing store Vadodara" match it. */}
          <h1 data-reveal className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.2em] text-sage-ink">
            {storeConfig.name} — Clothing for Men, Women &amp; Kids in {storeConfig.city}
          </h1>
          <p data-reveal className="font-serif text-5xl font-medium leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
            Everyday Style.
            <br />
            <em className="text-rose-ink">For the Whole Family.</em>
          </p>
          <p data-reveal className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Comfortable everyday clothes and festive ethnic wear for men, women and kids —
            chosen with care, at fair prices.
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
  const candidates: RailGarment[] = products
    .filter((product) => product.images.length > 0)
    .slice(0, 16)
    .map((product) => ({
      id: product.id,
      name: product.name,
      description: product.brand_name ? `${product.brand_name} · ${formatPrice(effectivePrice(product))}` : formatPrice(effectivePrice(product)),
      image: product.images[0],
      altImages: product.images.slice(1, 3),
      cutout: product.image_cutout ?? undefined,
      tag: formatPrice(effectivePrice(product)),
      href: `/products/${product.id}`,
      details: [product.brand_name, product.category_name, product.fabric].filter((value): value is string => Boolean(value)),
    }));
  // More candidates than slots: pieces whose photos cannot be separated (lifestyle shots)
  // are skipped, so everything on the rail hangs as cloth.
  const cloth = useClothItems(candidates, 6, 2);

  if (candidates.length === 0) return null;
  if (!cloth.ready) {
    return (
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8" aria-busy="true">
        <div className="h-[420px] animate-pulse rounded-2xl bg-secondary/40" />
        <span className="sr-only">Loading new arrivals</span>
      </section>
    );
  }
  if (cloth.items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <ClothingRailHero
        hanger="wood"
        eyebrow="New this week"
        heading="New on the rail"
        caption="Move along the rail, or open a piece to shop it."
        items={cloth.items}
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
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage-ink">New Arrivals</p>
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
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage-ink">Our Promise</p>
            <h2 className="mt-3 font-serif text-3xl font-medium leading-snug sm:text-4xl">
              Comfort They Forget They&apos;re Wearing
            </h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Every piece in our collection is chosen with one thing in mind: how it feels to
              wear. Soft fabrics, thoughtful fits and easy care — for a busy workday, a family
              function or a child who never sits still.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage/10">
                  <Heart className="h-6 w-6 text-sage-ink" />
                </div>
                <p className="mt-3 text-sm font-medium">Gentle Fabrics</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose/10">
                  <Sparkles className="h-6 w-6 text-rose-ink" />
                </div>
                <p className="mt-3 text-sm font-medium">Thoughtful Design</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-saffron/10">
                  <Shield className="h-6 w-6 text-saffron-ink" />
                </div>
                <p className="mt-3 text-sm font-medium">Trusted Brands</p>
              </div>
            </div>
          </div>
          <div data-parallax="0.15" className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
            <Image
              src="https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=700&h=900&fit=crop"
              alt="Clothing detail"
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
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage-ink">Visit Us</p>
          <h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">See It, Feel It, Love It</h2>
          <p className="mt-4 text-muted-foreground">
            Visit our store in {storeConfig.location} to explore the full collection in person.
          </p>
          {/* Plain words about the shop: what search engines read to decide which
              local searches it answers. Kept true and specific, not keyword-stuffed. */}
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {storeConfig.name} is a family clothing shop in {storeConfig.city}, Gujarat, near
            Khodiyar Nagar on New VIP Road. We stock men&apos;s wear, women&apos;s wear, and boys&apos;,
            girls&apos; and baby clothes — everyday, casual and festive ethnic outfits — from trusted
            Indian brands. Order online with cash on delivery, or come in to try sizes.
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

function TrustBar({ googleRating }: { googleRating: GoogleRating | null }) {
  const storeConfig = useStore();
  const items = [
    { icon: Truck, label: "Free Shipping", detail: `Orders above ₹${storeConfig.freeShippingThreshold}` },
    { icon: RotateCcw, label: "Easy Returns", detail: `${storeConfig.returnWindowDays}-day return policy` },
    { icon: Shield, label: "Secure Checkout", detail: storeConfig.codAvailable ? "COD & online payment" : "Online payment" },
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
          {googleRating ? (
            // Live from Google, refreshed every couple of hours; links to the reviews.
            <a
              href={googleRating.mapsUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30"
              aria-label={`Rated ${googleRating.rating.toFixed(1)} out of 5 from ${googleRating.count} Google reviews. Read them on Google Maps.`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-base font-semibold">
                {googleRating.rating.toFixed(1)}
              </div>
              <div>
                <StarRating value={googleRating.rating} size={13} />
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {googleRating.count.toLocaleString("en-IN")} reviews on{" "}
                  <span className="font-medium text-foreground">Google Maps</span>
                </p>
              </div>
            </a>
          ) : (
            <Link href="/visit" className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <MapPin className="h-5 w-5 text-foreground/60" />
              </div>
              <div>
                <p className="text-sm font-medium">Visit our store</p>
                <p className="text-xs text-muted-foreground">{storeConfig.city} — come and try sizes</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function HomePageContent({ googleRating }: { googleRating: GoogleRating | null }) {
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
    fetchProducts({ limit: 16 }).then(r => setProducts(r.products)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ScrollStory>
        <main id="main">
          <HeroSection scrollProgress={scrollProgress} />
          <BannerSection />
          <NewOnTheRail products={products} />
          <BrandCarousel />
          <ShopByCategory />
          <FeaturedProducts products={products} />
          <QualityStory />
          <StoreVisit />
          <TrustBar googleRating={googleRating} />
        </main>
      </ScrollStory>
      <Footer />
    </div>
  );
}

export function HomeView({ googleRating = null }: { googleRating?: GoogleRating | null }) {
  return <HomePageContent googleRating={googleRating} />;
}
