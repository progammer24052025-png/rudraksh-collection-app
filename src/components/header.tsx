"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ShoppingBag, User, Search, Menu, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart-context";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

const NAV_LINKS = [
  { label: "Shop", href: "/products" },
  { label: "Collections", href: "/collections" },
  { label: "Brands", href: "/brands" },
  { label: "Our Story", href: "/story" },
  { label: "Visit Store", href: "/visit" },
];

export function Header() {
  const { getCartCount, isHydrated } = useCart();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const cartCount = isHydrated ? getCartCount() : 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          : "border-b border-transparent bg-background/0"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <MobileNav />
            </SheetContent>
          </Sheet>
        </div>

        <Link href="/" className="flex items-center gap-2.5">
          <span className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
            Rudraksh Collection
          </span>
        </Link>

        <nav className="hidden lg:flex lg:items-center lg:gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" asChild className="hidden sm:flex" aria-label="Wishlist">
            <Link href="/wishlist">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label="Account">
            <Link href="/account">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="relative" aria-label="Cart">
            <Link href="/cart">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>

      {isSearchOpen && (
        <div className="border-t border-border bg-background/95 backdrop-blur px-4 py-3">
          <form onSubmit={handleSearch} className="mx-auto flex max-w-2xl items-center gap-2">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products, brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
              autoFocus
            />
            <Button type="submit" size="sm">Search</Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => setIsSearchOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </header>
  );
}

function MobileNav() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <span className="font-serif text-lg font-semibold">Rudraksh Collection</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-border pt-4">
          <Link href="/products" className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
            All Products
          </Link>
          <Link href="/account" className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
            My Account
          </Link>
          <Link href="/wishlist" className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">
            Wishlist
          </Link>
        </div>
      </nav>
    </div>
  );
}
