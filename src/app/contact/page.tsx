"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Loader2, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { sendContactMessage } from "@/lib/firebase";

const QUICK_LINKS = [
  { label: "Track Order", href: "/track-order", detail: "Check your delivery status" },
  { label: "Return Policy", href: "/returns", detail: "7-day easy returns" },
  { label: "Payment Info", href: "/faq", detail: "COD and online payments" },
  { label: "Shipping Info", href: "/shipping", detail: "Delivery timelines and charges" },
];

export default function ContactPage() {
  const store = useStore();
  const { user, profile } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please add your name, email and message");
      return;
    }
    setSending(true);
    try {
      await sendContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        subject: form.subject.trim(),
        message: form.message.trim(),
        uid: user?.uid ?? null,
      });
      setSent(true);
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
      toast.success("Message sent — we'll reply within 24 hours");
    } catch (error) {
      console.error(error);
      toast.error("Your message could not be sent. Please try WhatsApp or email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <section className="bg-cream py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage">Contact</p>
            <h1 className="mt-4 font-serif text-4xl font-medium sm:text-5xl">How can we help?</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Questions about an order, a size or a return? Send us a message and we&apos;ll reply within
              24 hours.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                <h2 className="font-serif text-2xl font-medium">Send us a message</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  All fields marked * are required.
                </p>

                {sent ? (
                  <div className="mt-6 rounded-xl border border-sage/30 bg-sage/10 p-6 text-center">
                    <p className="font-medium">Thank you — your message is with us.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      We usually reply within one working day.
                    </p>
                    <Button variant="outline" className="mt-4" onClick={() => setSent(false)}>
                      Send another message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Your name *</Label>
                        <Input
                          id="name"
                          value={form.name}
                          onChange={(event) => setForm({ ...form, name: event.target.value })}
                          placeholder={profile?.displayName ?? "Full name"}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(event) => setForm({ ...form, email: event.target.value })}
                          placeholder={profile?.email ?? "you@example.com"}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (optional)</Label>
                        <Input
                          id="phone"
                          value={form.phone}
                          onChange={(event) =>
                            setForm({ ...form, phone: event.target.value.replace(/\D/g, "").slice(0, 10) })
                          }
                          inputMode="numeric"
                          placeholder="10-digit mobile number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          value={form.subject}
                          onChange={(event) => setForm({ ...form, subject: event.target.value })}
                          placeholder="Order, size, return…"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        value={form.message}
                        onChange={(event) => setForm({ ...form, message: event.target.value })}
                        rows={6}
                        placeholder="Tell us what you need help with — include your order number if you have one."
                        required
                      />
                    </div>

                    <Button type="submit" disabled={sending} className="w-full sm:w-auto">
                      {sending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                      ) : (
                        <><Send className="mr-2 h-4 w-4" /> Send message</>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-serif text-lg font-medium">Store details</h2>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                    <span className="whitespace-pre-line">{store.address || store.location}</span>
                  </li>
                  {store.openingHours && (
                    <li className="flex items-start gap-3">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                      <span>{store.openingHours}</span>
                    </li>
                  )}
                  {store.phone && (
                    <li className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                      <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="hover:text-foreground">
                        {store.phone}
                      </a>
                    </li>
                  )}
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                    <a href={`mailto:${store.supportEmail}`} className="hover:text-foreground">
                      {store.supportEmail}
                    </a>
                  </li>
                </ul>

                <div className="mt-5 flex flex-wrap gap-2">
                  {store.whatsappLink && (
                    <Button asChild size="sm">
                      <a href={store.whatsappLink} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                      </a>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline">
                    <Link href="/visit">Visit the store</Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-serif text-lg font-medium">Quick answers</h2>
                <ul className="mt-4 space-y-3">
                  {QUICK_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="group block">
                        <span className="text-sm font-medium group-hover:text-primary">{link.label}</span>
                        <span className="block text-xs text-muted-foreground">{link.detail}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Order help?</p>
                <p className="mt-1">
                  The fastest way to check an order is the{" "}
                  <Link href="/track-order" className="text-primary hover:underline">track order</Link> page —
                  you only need your order number and the last 4 digits of your phone.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
