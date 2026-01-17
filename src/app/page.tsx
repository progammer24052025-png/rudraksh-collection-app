"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, Truck, RefreshCw, Shield, Headphones, Sparkles, TrendingUp, BadgePercent, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { categories, products, banners } from "@/lib/store-data";
import { CartProvider } from "@/lib/cart-context";

function HeroBanner() {
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const banner = banners[currentBanner];

  return (
    <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBanner}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <Image
            src={banner.image}
            alt={banner.title}
            fill
            className="object-cover"
            priority
          />
        </motion.div>
      </AnimatePresence>
      
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      
      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-xl text-white"
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-saffron to-orange-500 px-5 py-2 text-sm font-semibold shadow-lg shadow-orange-500/25"
              >
                <Sparkles className="h-4 w-4" />
                {banner.subtitle}
              </motion.span>
              <h1 className="mt-6 font-serif text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl drop-shadow-lg">
                {banner.title}
              </h1>
              <p className="mt-4 text-lg text-white/90 sm:text-xl">{banner.description}</p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button asChild size="lg" className="mt-8 gap-2 rounded-full px-8 text-base shadow-lg shadow-primary/30">
                  <Link href={banner.link}>
                    {banner.cta}
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-3">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentBanner(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentBanner ? "w-10 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      <button
        onClick={() => setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 backdrop-blur-md transition-all hover:bg-white/20 hover:scale-110"
      >
        <ChevronLeft className="h-6 w-6 text-white" />
      </button>
      <button
        onClick={() => setCurrentBanner((prev) => (prev + 1) % banners.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 backdrop-blur-md transition-all hover:bg-white/20 hover:scale-110"
      >
        <ChevronRight className="h-6 w-6 text-white" />
      </button>
    </section>
  );
}

function FloatingStatsBar() {
  const stats = [
    { value: "50K+", label: "Happy Customers" },
    { value: "10K+", label: "Products" },
    { value: "4.8", label: "Rating", icon: Star },
    { value: "₹999", label: "Free Delivery" },
  ];

  return (
    <section className="relative z-10 -mt-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mx-auto max-w-5xl rounded-2xl bg-white/80 backdrop-blur-lg p-6 shadow-xl shadow-black/5 border border-white/20"
      >
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="flex items-center justify-center gap-1">
                {stat.icon && <stat.icon className="h-5 w-5 fill-saffron text-saffron" />}
                <span className="text-2xl font-bold text-primary sm:text-3xl">{stat.value}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function CategorySection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Shop by Category
          </span>
          <h2 className="mt-4 font-serif text-4xl font-bold">Find Your Perfect Style</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Explore our curated collections for men, women, and kids
          </p>
        </motion.div>
        
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {categories.map((category, idx) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
            >
              <Link
                href={`/products?category=${category.id}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-3xl shadow-lg"
              >
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-primary/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h3 className="font-serif text-3xl font-bold text-white">{category.name}</h3>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white transition-all group-hover:bg-white group-hover:text-primary">
                    Explore Collection
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrendingProducts() {
  const trendingProducts = products.filter((p) => p.isTrending).slice(0, 4);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-secondary/50 to-background py-20">
      <div className="absolute -left-32 top-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -right-32 bottom-0 h-64 w-64 rounded-full bg-saffron/5 blur-3xl" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
        >
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-saffron/10 px-4 py-1.5 text-sm font-medium text-saffron">
              <TrendingUp className="h-4 w-4" />
              Trending Now
            </span>
            <h2 className="mt-4 font-serif text-4xl font-bold">Most Loved Products</h2>
            <p className="mt-2 text-muted-foreground">Discover what everyone&apos;s wearing this season</p>
          </div>
          <Button variant="outline" asChild className="rounded-full">
            <Link href="/products?filter=trending">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
        
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trendingProducts.map((product, idx) => (
            <ProductCard key={product.id} product={product} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BudgetPicks() {
  const budgetProducts = products.filter((p) => p.isBudgetPick).slice(0, 4);

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
        >
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-1.5 text-sm font-medium text-green-600">
              <BadgePercent className="h-4 w-4" />
              Budget Friendly
            </span>
            <h2 className="mt-4 font-serif text-4xl font-bold">Great Style, Great Prices</h2>
            <p className="mt-2 text-muted-foreground">Quality fashion that won&apos;t break the bank</p>
          </div>
          <Button variant="outline" asChild className="rounded-full">
            <Link href="/products?filter=budget">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
        
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {budgetProducts.map((product, idx) => (
            <ProductCard key={product.id} product={product} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PromoBanner() {
  return (
    <section className="relative overflow-hidden py-20">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-terracotta" />
      <div className="absolute inset-0">
        <svg className="h-full w-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect fill="url(#pattern)" width="100" height="100" />
        </svg>
      </div>
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-center text-primary-foreground"
        >
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-6 py-2 text-sm font-medium"
          >
            <Sparkles className="h-4 w-4" />
            Limited Time Offer
          </motion.span>
          <h2 className="mt-6 font-serif text-4xl font-bold sm:text-5xl lg:text-6xl">
            Festive Season Sale
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/90 sm:text-xl">
            Get up to <span className="font-bold text-saffron">50% OFF</span> on selected items.
            Use code <span className="rounded-lg bg-white/20 px-3 py-1 font-bold">FESTIVE50</span> at checkout.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Button asChild size="lg" variant="secondary" className="mt-8 rounded-full px-8 text-base shadow-lg">
              <Link href="/products">
                Shop the Sale
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: Truck, title: "Free Shipping", description: "On orders above ₹999", color: "bg-blue-500/10 text-blue-600" },
    { icon: RefreshCw, title: "Easy Returns", description: "7-day return policy", color: "bg-green-500/10 text-green-600" },
    { icon: Shield, title: "Secure Payment", description: "100% secure checkout", color: "bg-purple-500/10 text-purple-600" },
    { icon: Headphones, title: "24/7 Support", description: "Dedicated support team", color: "bg-orange-500/10 text-orange-600" },
  ];

  return (
    <section className="border-t border-border py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${feature.color} transition-transform group-hover:scale-110`}>
                <feature.icon className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSection() {
  return (
    <section className="bg-muted/50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="font-serif text-3xl font-bold">Stay Updated</h2>
          <p className="mt-3 text-muted-foreground">
            Subscribe to get exclusive offers, new arrivals & style tips
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <input
              type="email"
              placeholder="Enter your email"
              className="h-12 rounded-full border border-border bg-background px-6 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-80"
            />
            <Button className="h-12 rounded-full px-8">Subscribe</Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <HeroBanner />
          <FloatingStatsBar />
          <CategorySection />
          <TrendingProducts />
          <PromoBanner />
          <BudgetPicks />
          <Features />
          <NewsletterSection />
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
