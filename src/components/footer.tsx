"use client";

import Link from "next/link";
import { Phone, Mail, MapPin, Instagram, Clock, MessageCircle } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { brands } from "@/lib/config";

const SHOP_LINKS = [
  { label: "All Products", href: "/products" },
  { label: "Collections", href: "/collections" },
  { label: "Brands", href: "/brands" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Track Order", href: "/track-order" },
];

const CARE_LINKS = [
  { label: "Contact Us", href: "/contact" },
  { label: "FAQs", href: "/faq" },
  { label: "Shipping Policy", href: "/shipping" },
  { label: "Returns & Refunds", href: "/returns" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Visit Our Store", href: "/visit" },
  { label: "Get Directions", href: "/directions" },
];

export function Footer() {
  const store = useStore();

  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="font-serif text-xl font-semibold">{store.name}</span>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {store.tagline}. Quality children&apos;s wear from trusted brands, carefully selected
              for little ones in {store.city} and across India.
            </p>
            <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="whitespace-pre-line">
                {store.address || store.location}
              </span>
            </div>
            {store.openingHours && (
              <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{store.openingHours}</span>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-serif text-base font-semibold">Shop</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {SHOP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-base font-semibold">Brands</h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {brands.slice(0, 8).map((brand) => (
                <li key={brand.slug}>
                  <Link
                    href={`/brands/${brand.slug}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {brand.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-base font-semibold">Customer Care</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {CARE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {store.phone && (
                <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-foreground">
                  <Phone className="h-4 w-4" /> {store.phone}
                </a>
              )}
              {store.whatsappLink && (
                <a href={store.whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
              <a href={`mailto:${store.supportEmail}`} className="flex items-center gap-2 hover:text-foreground">
                <Mail className="h-4 w-4" /> {store.supportEmail}
              </a>
              {store.instagramLink && (
                <a href={store.instagramLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground">
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {store.name}. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-5 text-sm">
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
              <Link href="/shipping" className="text-muted-foreground hover:text-foreground">Shipping</Link>
              <Link href="/returns" className="text-muted-foreground hover:text-foreground">Returns</Link>
              <Link href="/admin" className="text-muted-foreground hover:text-foreground">Admin</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
