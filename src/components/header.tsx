"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingBag, User, Search, Menu, X, Heart, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart-context";
import { categories, subCategories } from "@/lib/store-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { getCartCount, isHydrated } = useCart();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const cartCount = isHydrated ? getCartCount() : 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
            <span className="font-serif text-lg font-bold text-primary-foreground">R</span>
          </div>
          <span className="hidden font-serif text-xl font-semibold tracking-tight sm:block">
            Rudraksh Collection
          </span>
        </Link>

        <nav className="hidden lg:flex lg:items-center lg:gap-1">
          {categories.map((category) => (
            <DropdownMenu key={category.id}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1 text-sm font-medium">
                  {category.name}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href={`/products?category=${category.id}`}>All {category.name}</Link>
                </DropdownMenuItem>
                {subCategories
                  .filter((sub) => sub.parentId === category.id)
                  .map((sub) => (
                    <DropdownMenuItem key={sub.id} asChild>
                      <Link href={`/products?category=${category.id}&sub=${sub.id}`}>
                        {sub.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
          <Button variant="ghost" asChild className="text-sm font-medium">
            <Link href="/products">All Products</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="hidden sm:flex"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
            <Link href="/wishlist">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/account">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link href="/cart">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>

      {isSearchOpen && (
        <div className="border-t border-border bg-background px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for products..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

function MobileNav() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
          <span className="font-serif text-lg font-bold text-primary-foreground">R</span>
        </div>
        <span className="font-serif text-lg font-semibold">Rudraksh Collection</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {categories.map((category) => (
            <div key={category.id} className="space-y-1">
              <Link
                href={`/products?category=${category.id}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {category.name}
              </Link>
              <div className="ml-4 space-y-1">
                {subCategories
                  .filter((sub) => sub.parentId === category.id)
                  .map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/products?category=${category.id}&sub=${sub.id}`}
                      className="block rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {sub.name}
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <Link
            href="/products"
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            All Products
          </Link>
          <Link
            href="/account"
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            My Account
          </Link>
          <Link
            href="/wishlist"
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Wishlist
          </Link>
        </div>
      </nav>
    </div>
  );
}
