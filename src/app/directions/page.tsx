"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Navigation,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Phone,
  MessageCircle,
  Car,
  Train,
  Plane,
  ChevronLeft,
  Building,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import {
  parseGoogleMapsEmbedUrl,
  getDirectionsUrl,
  getAppleMapsUrl,
  DEFAULT_STORE_ADDRESS,
} from "@/lib/maps";

export default function DirectionsPage() {
  const storeConfig = useStore();
  const [copied, setCopied] = useState(false);

  const displayAddress = storeConfig.address || DEFAULT_STORE_ADDRESS;
  const embedUrl = parseGoogleMapsEmbedUrl(storeConfig.googleMapsUrl, displayAddress);
  const googleMapsDirections = getDirectionsUrl(displayAddress);
  const appleMapsDirections = getAppleMapsUrl(displayAddress);

  const copyAddress = () => {
    navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    toast.success("Store address copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Breadcrumb & Hero */}
        <section className="bg-cream/50 border-b border-border py-10 sm:py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <Link
              href="/visit"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Store Info
            </Link>

            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <Navigation className="h-3.5 w-3.5" /> Turn-by-Turn Navigation
              </span>
              <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl lg:text-5xl">
                Directions to Rudraksh Collection
              </h1>
              <p className="mt-2 text-base text-muted-foreground max-w-2xl">
                We are conveniently located in Vadodara. Tap below to launch your phone&apos;s
                navigation app or review travel routes.
              </p>
            </div>

            {/* Quick Action Navigation Bar */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full shadow-md font-medium">
                <a href={googleMapsDirections} target="_blank" rel="noopener noreferrer">
                  <Navigation className="mr-2 h-4 w-4" /> Start Google Maps Navigation
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full font-medium">
                <a href={appleMapsDirections} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Open in Apple Maps
                </a>
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={copyAddress}
                className="rounded-full text-xs sm:text-sm font-medium"
              >
                {copied ? (
                  <><Check className="mr-1.5 h-4 w-4 text-green-600" /> Address Copied</>
                ) : (
                  <><Copy className="mr-1.5 h-4 w-4" /> Copy Address</>
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* Content Body: Map + Step-by-Step Directions */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
              {/* Left Column: Interactive Map & Live Location */}
              <div className="lg:col-span-7 space-y-6">
                <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-md">
                  <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3 text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Destination Location
                    </span>
                    <a
                      href={googleMapsDirections}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                    >
                      Open Full Screen <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="relative aspect-[4/3] w-full bg-muted">
                    <iframe
                      src={embedUrl}
                      className="absolute inset-0 h-full w-full border-0"
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Rudraksh Collection Map"
                    />
                  </div>

                  <div className="p-5 bg-card border-t border-border">
                    <div className="flex items-start gap-3">
                      <Building className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-serif font-medium text-base">Rudraksh Collection</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line mt-1">
                          {displayAddress}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Helpline Callout if Lost */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="font-serif text-lg font-medium">Lost on your way?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Call our store team directly and we will guide you right to our entrance.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {storeConfig.phone && (
                      <Button asChild size="sm">
                        <a href={`tel:${storeConfig.phone}`}>
                          <Phone className="mr-1.5 h-4 w-4" /> Call {storeConfig.phone}
                        </a>
                      </Button>
                    )}
                    {storeConfig.whatsapp && (
                      <Button asChild size="sm" variant="outline" className="text-[#25D366] border-[#25D366]/40 hover:bg-[#25D366]/10">
                        <a
                          href={`https://wa.me/${storeConfig.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="mr-1.5 h-4 w-4" /> Message on WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Travel Routes & Landmark Guide */}
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="font-serif text-xl font-medium">How to Reach Us</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Convenient access from all major parts of Vadodara city.
                  </p>

                  <div className="mt-6 space-y-6">
                    {/* By Car / Two-Wheeler */}
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Car className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          By Car / Two-Wheeler
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          Take <strong>New VIP Road</strong> towards Khodiyar Nagar. Locate
                          Pancham Heights / Pancham Elite commercial complex. Convenient customer
                          parking is available in front of the premises.
                        </p>
                      </div>
                    </div>

                    {/* From Railway Station */}
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Train className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          From Vadodara Railway Station (BRC)
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          Distance: <strong>~6.5 km</strong> (approx. 15–20 mins). Auto-rickshaws
                          and app-cabs (Ola/Uber) are readily available from Platform 1 exit via
                          VIP Road.
                        </p>
                      </div>
                    </div>

                    {/* From Airport */}
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Plane className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          From Vadodara Airport (BDQ)
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          Distance: <strong>~4 km</strong> (under 10 mins). A straight drive via
                          Harni-VIP Road connects directly to Khodiyar Nagar.
                        </p>
                      </div>
                    </div>

                    {/* Hours Notice */}
                    <div className="flex items-start gap-3.5 pt-4 border-t border-border/80">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Timings</h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {storeConfig.openingHours || "Monday – Sunday: 10:00 AM – 9:00 PM"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Return link */}
                <div className="text-center">
                  <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
                    <Link href="/visit">
                      View Store Overview &amp; Details →
                    </Link>
                  </Button>
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

