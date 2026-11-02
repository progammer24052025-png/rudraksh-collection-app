"use client";

import { MapPin, Phone, Clock, MessageCircle, Navigation } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { storeConfig } from "@/lib/config";

export default function VisitPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <main>
          <section className="bg-cream py-16">
            <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage">Visit Us</p>
              <h1 className="mt-4 font-serif text-4xl font-medium sm:text-5xl">Come See Us</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Visit our store in {storeConfig.location} to explore the full collection in person.
              </p>
            </div>
          </section>

          <section className="py-16">
            <div className="mx-auto max-w-4xl px-4 sm:px-6">
              <div className="grid gap-8 md:grid-cols-2">
                {/* Store Info */}
                <div className="space-y-6">
                  <div className="rounded-lg border border-border bg-card p-6">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-1 h-5 w-5 shrink-0 text-sage" />
                      <div>
                        <h2 className="font-serif text-lg font-medium">Address</h2>
                        {storeConfig.address ? (
                          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
                            {storeConfig.address}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {storeConfig.location}
                            <br />
                            <span className="text-xs italic">Full address coming soon</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-6">
                    <div className="flex items-start gap-3">
                      <Clock className="mt-1 h-5 w-5 shrink-0 text-sage" />
                      <div>
                        <h2 className="font-serif text-lg font-medium">Opening Hours</h2>
                        {storeConfig.openingHours ? (
                          <p className="mt-1 text-sm text-muted-foreground">{storeConfig.openingHours}</p>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">
                            <span className="text-xs italic">Hours coming soon</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {storeConfig.phone && (
                    <div className="rounded-lg border border-border bg-card p-6">
                      <div className="flex items-start gap-3">
                        <Phone className="mt-1 h-5 w-5 shrink-0 text-sage" />
                        <div>
                          <h2 className="font-serif text-lg font-medium">Phone</h2>
                          <a href={`tel:${storeConfig.phone}`} className="mt-1 block text-sm text-muted-foreground hover:text-foreground">
                            {storeConfig.phone}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {storeConfig.phone && (
                      <Button asChild>
                        <a href={`tel:${storeConfig.phone}`}>
                          <Phone className="mr-2 h-4 w-4" /> Call Now
                        </a>
                      </Button>
                    )}
                    {storeConfig.whatsapp && (
                      <Button asChild variant="outline">
                        <a href={`https://wa.me/${storeConfig.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                        </a>
                      </Button>
                    )}
                    {storeConfig.googleMapsUrl && (
                      <Button asChild variant="outline">
                        <a href={storeConfig.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                          <Navigation className="mr-2 h-4 w-4" /> Get Directions
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Map placeholder */}
                <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-border bg-muted">
                  {storeConfig.googleMapsUrl ? (
                    <iframe
                      src={storeConfig.googleMapsUrl}
                      className="h-full w-full rounded-lg"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Store location"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <MapPin className="mx-auto h-12 w-12" />
                      <p className="mt-3 text-sm">Map will appear here</p>
                      <p className="text-xs">once the address is configured</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
