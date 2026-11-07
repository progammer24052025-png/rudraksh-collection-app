"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Clock,
  MessageCircle,
  Navigation,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Car,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import { parseGoogleMapsEmbedUrl, getDirectionsUrl, DEFAULT_STORE_ADDRESS } from "@/lib/maps";

export default function VisitPage() {
  const storeConfig = useStore();
  const [copied, setCopied] = useState(false);

  const displayAddress = storeConfig.address || DEFAULT_STORE_ADDRESS;
  const embedUrl = parseGoogleMapsEmbedUrl(storeConfig.googleMapsUrl, displayAddress);
  const directMapsUrl = getDirectionsUrl(displayAddress);

  const copyAddress = () => {
    navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    toast.success("Address copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="bg-cream/60 border-b border-border py-14 sm:py-18">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Flagship Store
            </p>
            <h1 className="mt-3 font-serif text-3xl font-medium sm:text-5xl">
              Visit Us in Person
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Step inside our Vadodara store to touch the premium fabrics, try out sizes,
              and explore our complete collections for babies, boys &amp; girls.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-full shadow-md">
                <Link href="/directions">
                  <Navigation className="mr-2 h-4 w-4" /> Get Directions
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <a href={directMapsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Open in Google Maps
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Store Location & Interactive Map */}
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
              {/* Store Info Cards (5 Cols) */}
              <div className="space-y-5 lg:col-span-5">
                {/* Address Card */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-serif text-lg font-medium">Store Address</h2>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {displayAddress}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-border/70">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={copyAddress}
                      className="text-xs"
                    >
                      {copied ? (
                        <><Check className="mr-1.5 h-3.5 w-3.5 text-green-600" /> Copied</>
                      ) : (
                        <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Address</>
                      )}
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="text-xs">
                      <Link href="/directions">
                        Detailed directions →
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Opening Hours */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-serif text-lg font-medium">Opening Hours</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {storeConfig.openingHours || "Monday – Sunday: 10:00 AM – 9:00 PM"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/80">
                        Open all 7 days for your convenience.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phone & Direct Contact */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div className="w-full">
                      <h2 className="font-serif text-lg font-medium">Contact &amp; Assistance</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Need help finding the store or checking stock before coming?
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        {storeConfig.phone && (
                          <Button asChild size="sm" variant="outline">
                            <a href={`tel:${storeConfig.phone}`}>
                              <Phone className="mr-1.5 h-3.5 w-3.5" /> Call {storeConfig.phone}
                            </a>
                          </Button>
                        )}
                        {storeConfig.whatsapp && (
                          <Button asChild size="sm" className="bg-[#25D366] hover:bg-[#1EBE5D] text-white">
                            <a
                              href={`https://wa.me/${storeConfig.whatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp Us
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* In-store Highlights */}
                <div className="rounded-2xl border border-border bg-muted/30 p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Store Amenities
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-primary" /> Free Parking Available
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> AC Trial Rooms
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" /> Card &amp; UPI Accepted
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" /> Near New VIP Road
                    </div>
                  </div>
                </div>
              </div>

              {/* Map View Frame (7 Cols) */}
              <div className="lg:col-span-7">
                <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
                  {/* Map Header Bar */}
                  <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3 text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Live Google Map
                    </span>
                    <a
                      href={directMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      View larger map <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* Responsive Iframe container with valid embed */}
                  <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full bg-muted">
                    <iframe
                      src={embedUrl}
                      className="absolute inset-0 h-full w-full border-0"
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Rudraksh Collection Store Location Map"
                    />
                  </div>

                  {/* Quick Action Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-3.5 text-xs text-muted-foreground">
                    <span>Pancham Heights, Khodiyar Nagar, Vadodara</span>
                    <Button asChild size="sm" variant="default" className="text-xs">
                      <Link href="/directions">
                        <Navigation className="mr-1.5 h-3.5 w-3.5" /> Turn-by-Turn Directions
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
