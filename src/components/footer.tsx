import Link from "next/link";
import { Phone, Mail, MapPin, Instagram } from "lucide-react";
import { storeConfig, brands } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="font-serif text-xl font-semibold">Rudraksh Collection</span>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {storeConfig.tagline}. Quality children&apos;s wear from trusted brands, carefully
              selected for little ones in Vadodara and beyond.
            </p>
            <div className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{storeConfig.location}</span>
            </div>
          </div>

          <div>
            <h3 className="font-serif text-base font-semibold">Shop</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/products" className="text-muted-foreground hover:text-foreground">All Products</Link></li>
              <li><Link href="/collections" className="text-muted-foreground hover:text-foreground">Collections</Link></li>
              <li><Link href="/brands" className="text-muted-foreground hover:text-foreground">Brands</Link></li>
              <li><Link href="/products?filter=new" className="text-muted-foreground hover:text-foreground">New Arrivals</Link></li>
              <li><Link href="/wishlist" className="text-muted-foreground hover:text-foreground">Wishlist</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-base font-semibold">Brands</h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {brands.slice(0, 8).map((b) => (
                <li key={b.slug}>
                  <Link href={`/brands/${b.slug}`} className="text-muted-foreground hover:text-foreground">
                    {b.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-base font-semibold">Customer Care</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/shipping" className="text-muted-foreground hover:text-foreground">Shipping Policy</Link></li>
              <li><Link href="/returns" className="text-muted-foreground hover:text-foreground">Returns & Exchanges</Link></li>
              <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms & Conditions</Link></li>
              <li><Link href="/visit" className="text-muted-foreground hover:text-foreground">Visit Our Store</Link></li>
            </ul>
            {storeConfig.phone && (
              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <a href={`tel:${storeConfig.phone}`} className="flex items-center gap-2 hover:text-foreground">
                  <Phone className="h-4 w-4" /> {storeConfig.phone}
                </a>
                <a href={`mailto:${storeConfig.email}`} className="flex items-center gap-2 hover:text-foreground">
                  <Mail className="h-4 w-4" /> {storeConfig.email}
                </a>
                {storeConfig.instagram && (
                  <a href={storeConfig.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground">
                    <Instagram className="h-4 w-4" /> Instagram
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Rudraksh Collection. All rights reserved.
            </p>
            <div className="flex gap-5 text-sm">
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
              <Link href="/admin" className="text-muted-foreground hover:text-foreground">Admin</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
