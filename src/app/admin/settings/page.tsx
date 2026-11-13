"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseGoogleMapsEmbedUrl } from "@/lib/maps";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminNav } from "@/components/admin-nav";
import { getFirebaseAuth, readSettings, saveSettings } from "@/lib/firebase";
import { AUTOMATION_DEFAULTS, resolveAutomation } from "@/lib/automation";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_BEYOND_FEE, DEFAULT_SLABS, MAX_SLABS, normalizeShipping } from "@/lib/shipping";
import { storeConfig } from "@/lib/config";
import type { StoreSettings } from "@/lib/types";

import { Spinner } from "@/components/ui/spinner";
import { SealLoader } from "@/components/kit/brand-mark";
type FormState = Required<
  Pick<
    StoreSettings,
    | "storeName"
    | "tagline"
    | "legalEntity"
    | "address"
    | "cityStatePincode"
    | "phone"
    | "whatsapp"
    | "email"
    | "website"
    | "openingHours"
    | "googleMapsUrl"
    | "instagram"
    | "announcement"
  >
> & {
  freeShippingThreshold: string;
  shippingFee: string;
  codAvailable: boolean;
  razorpayEnabled: boolean;
  gstin: string;
  pan: string;
  cin: string;
  taxLabel: string;
  taxRate: string;
  taxEnabled: boolean;
  taxInclusive: boolean;
  autoConfirmCod: boolean;
  ownerOrderEmail: boolean;
  dailyDigest: boolean;
  reviewRequest: boolean;
  newProductEmails: boolean;
  lowStockThreshold: string;
  distanceEnabled: boolean;
  storePincode: string;
  slabs: Array<{ upToKm: string; fee: string }>;
  beyondFee: string;
};

const DEFAULTS: FormState = {
  storeName: storeConfig.name,
  tagline: storeConfig.tagline,
  legalEntity: storeConfig.legalEntity || "Rudraksh Collection Retail",
  address: storeConfig.address,
  cityStatePincode: storeConfig.cityStatePincode || "Gujarat - 390019",
  phone: storeConfig.phone,
  whatsapp: storeConfig.whatsapp,
  email: storeConfig.email,
  website: storeConfig.website || "www.rudrakshcollection.in",
  openingHours: storeConfig.openingHours,
  googleMapsUrl: storeConfig.googleMapsUrl,
  instagram: storeConfig.instagram,
  announcement: "",
  freeShippingThreshold: String(storeConfig.freeShippingThreshold),
  shippingFee: String(storeConfig.shippingFee),
  codAvailable: storeConfig.codAvailable,
  razorpayEnabled: storeConfig.razorpayEnabled,
  gstin: storeConfig.gstin || "24AAACR1234F1Z5",
  pan: storeConfig.pan || "AAACR1234F",
  cin: storeConfig.cin || "U18101GJ2024PTC123456",
  taxLabel: "GST",
  taxRate: "5",
  taxEnabled: true,
  taxInclusive: true,
  autoConfirmCod: AUTOMATION_DEFAULTS.autoConfirmCod,
  ownerOrderEmail: AUTOMATION_DEFAULTS.ownerOrderEmail,
  dailyDigest: AUTOMATION_DEFAULTS.dailyDigest,
  reviewRequest: AUTOMATION_DEFAULTS.reviewRequest,
  newProductEmails: AUTOMATION_DEFAULTS.newProductEmails,
  lowStockThreshold: String(AUTOMATION_DEFAULTS.lowStockThreshold),
  distanceEnabled: false,
  storePincode: "",
  slabs: DEFAULT_SLABS.map((slab) => ({ upToKm: String(slab.upToKm), fee: String(slab.fee) })),
  beyondFee: String(DEFAULT_BEYOND_FEE),
};

export default function AdminSettingsPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingSummary, setSendingSummary] = useState(false);
  const [announcing, setAnnouncing] = useState(false);
  // What the server says about the payment gateway. Online payment is hidden at
  // checkout unless the keys exist AND the server can write the paid order, so
  // the shop can see exactly which of the two is missing.
  const [gateway, setGateway] = useState<{ configured: boolean; secure: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payments")
      .then((response) => response.json())
      .then((data: { configured?: boolean; secure?: boolean }) => {
        if (!cancelled) {
          setGateway({ configured: Boolean(data.configured), secure: Boolean(data.secure) });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    readSettings()
      .then((settings) => {
        if (!settings) return;
        setForm((current) => ({
          ...current,
          ...Object.fromEntries(
            Object.entries(settings).filter(([, value]) => value !== undefined && value !== null),
          ),
          storeName: settings.storeName ?? current.storeName,
          tagline: settings.tagline ?? current.tagline,
          legalEntity: settings.legalEntity ?? current.legalEntity,
          address: settings.address ?? current.address,
          cityStatePincode: settings.cityStatePincode ?? current.cityStatePincode,
          phone: settings.phone ?? current.phone,
          whatsapp: settings.whatsapp ?? current.whatsapp,
          email: settings.email ?? current.email,
          website: settings.website ?? current.website,
          gstin: settings.gstin ?? current.gstin,
          pan: settings.pan ?? current.pan,
          cin: settings.cin ?? current.cin,
          freeShippingThreshold: String(settings.freeShippingThreshold ?? current.freeShippingThreshold),
          shippingFee: String(settings.shippingFee ?? current.shippingFee),
          codAvailable: settings.codAvailable ?? current.codAvailable,
          razorpayEnabled: settings.razorpayEnabled ?? current.razorpayEnabled,
          taxLabel: settings.tax?.label ?? current.taxLabel,
          taxRate: String(Math.round((settings.tax?.rate ?? 0.05) * 1000) / 10),
          taxEnabled: settings.tax?.enabled ?? current.taxEnabled,
          taxInclusive: settings.tax?.inclusive ?? current.taxInclusive,
          ...(() => {
            const rules = normalizeShipping(settings);
            return {
              // The raw saved switch, so it can be turned on before a PIN is typed.
              distanceEnabled: Boolean(settings.shipping?.distanceEnabled),
              storePincode: rules.storePincode,
              slabs: rules.slabs.map((slab) => ({ upToKm: String(slab.upToKm), fee: String(slab.fee) })),
              beyondFee: String(rules.beyondFee),
            };
          })(),
          ...(() => {
            const automation = resolveAutomation(settings);
            return {
              autoConfirmCod: automation.autoConfirmCod,
              ownerOrderEmail: automation.ownerOrderEmail,
              dailyDigest: automation.dailyDigest,
              reviewRequest: automation.reviewRequest,
              newProductEmails: automation.newProductEmails,
              lowStockThreshold: String(automation.lowStockThreshold),
            };
          })(),
        }));
      })
      .catch((error) => console.error("Could not load settings:", error))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const storePincode = form.storePincode.replace(/\D/g, "").slice(0, 6);
    if (form.distanceEnabled && !/^[1-8]\d{5}$/.test(storePincode)) {
      toast.error("Enter the store's 6-digit PIN code to charge delivery by distance.");
      return;
    }
    const slabs = form.slabs
      .map((slab) => ({ upToKm: Number(slab.upToKm), fee: Math.round(Number(slab.fee)) }))
      .filter((slab) => Number.isFinite(slab.upToKm) && slab.upToKm > 0 && Number.isFinite(slab.fee) && slab.fee >= 0)
      .sort((a, b) => a.upToKm - b.upToKm);
    if (form.distanceEnabled && !slabs.length) {
      toast.error("Add at least one distance band.");
      return;
    }
    setSaving(true);
    try {
      await saveSettings({
        storeName: form.storeName.trim(),
        tagline: form.tagline.trim(),
        legalEntity: form.legalEntity.trim(),
        address: form.address.trim(),
        cityStatePincode: form.cityStatePincode.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        openingHours: form.openingHours.trim(),
        googleMapsUrl: parseGoogleMapsEmbedUrl(form.googleMapsUrl.trim(), form.address.trim()),
        instagram: form.instagram.trim(),
        announcement: form.announcement.trim(),
        freeShippingThreshold: Number(form.freeShippingThreshold) || 0,
        shippingFee: Number(form.shippingFee) || 0,
        codAvailable: form.codAvailable,
        razorpayEnabled: form.razorpayEnabled,
        gstin: form.gstin.trim(),
        pan: form.pan.trim(),
        cin: form.cin.trim(),
        tax: {
          enabled: form.taxEnabled,
          rate: Math.min(0.99, Math.max(0, (Number(form.taxRate) || 0) / 100)),
          inclusive: form.taxInclusive,
          label: form.taxLabel.trim() || "GST",
        },
        shipping: {
          distanceEnabled: form.distanceEnabled,
          storePincode,
          slabs,
          beyondFee: Math.max(0, Math.round(Number(form.beyondFee) || 0)),
        },
        automation: {
          autoConfirmCod: form.autoConfirmCod,
          ownerOrderEmail: form.ownerOrderEmail,
          dailyDigest: form.dailyDigest,
          reviewRequest: form.reviewRequest,
          newProductEmails: form.newProductEmails,
          lowStockThreshold: Math.max(0, Math.floor(Number(form.lowStockThreshold) || 0)),
        },
      });
      toast.success("Settings saved — the storefront updates immediately");
    } catch (error) {
      console.error(error);
      toast.error("Could not save the settings");
    } finally {
      setSaving(false);
    }
  };

  const sendSummaryNow = async () => {
    setSendingSummary(true);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const response = await fetch("/api/cron/daily", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const data = (await response.json()) as { ok?: boolean; emailed?: boolean; headline?: string; error?: string };
      if (data.ok && data.emailed) toast.success(`Summary emailed: ${data.headline}`);
      else toast.error(data.error || "The summary could not be emailed. Check the SMTP settings.");
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setSendingSummary(false);
    }
  };

  const announceNow = async () => {
    const ok = window.confirm(
      "Email subscribed customers about the products you added recently? Each product is only ever announced once.",
    );
    if (!ok) return;
    setAnnouncing(true);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const response = await fetch("/api/product-alerts", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        skipped?: string;
        products?: number;
        sent?: number;
        failed?: number;
        overLimit?: number;
      };
      if (!data.ok) toast.error(data.error || "Could not send the announcement.");
      else if (data.skipped === "first-run") toast.success("New-arrival emails are now set up. Products you add from now on will be announced.");
      else if (data.skipped === "no-new-products") toast.info("No new products to announce — everything recent has already gone out.");
      else if (data.skipped === "no-recipients") toast.info("No subscribed customers with an email address yet.");
      else if (data.skipped) toast.error("Email or server credentials are not set up yet.");
      else
        toast.success(
          `${data.products} product(s) announced to ${data.sent} customer(s)` +
            (data.failed ? `, ${data.failed} failed` : "") +
            (data.overLimit ? `, ${data.overLimit} over the daily limit` : ""),
        );
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setAnnouncing(false);
    }
  };

  const automationRows: Array<{
    key: "ownerOrderEmail" | "dailyDigest" | "reviewRequest" | "newProductEmails" | "autoConfirmCod";
    title: string;
    detail: string;
  }> = [
    {
      key: "ownerOrderEmail",
      title: "Email me every new order",
      detail: "Sent to the store mailbox the moment an order is placed, with the items and address.",
    },
    {
      key: "dailyDigest",
      title: "Morning summary email",
      detail: "One email at about 8 AM listing orders to confirm, pack and ship, low stock and unread messages. Skipped on days with nothing to do.",
    },
    {
      key: "reviewRequest",
      title: "Ask for a review after delivery",
      detail: "Adds review links to the email customers get when you mark an order delivered.",
    },
    {
      key: "newProductEmails",
      title: "Email customers about new arrivals",
      detail: "Each morning, products you added since the last email go out in one message to customers who have not opted out. Every email has an unsubscribe link, and customers can switch it off in their account.",
    },
    {
      key: "autoConfirmCod",
      title: "Confirm cash-on-delivery orders automatically",
      detail: "Off: you confirm each COD order yourself (safer against fake orders). On: they skip straight to “to pack”. Paid orders are always confirmed automatically.",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen">
        <AdminNav />
        <div className="flex h-96 items-center justify-center">
          <SealLoader size={56} showLabel={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-medium">Store Settings</h1>
          <p className="text-sm text-muted-foreground">
            Shown across the footer, contact page and store visit page.
          </p>
        </div>

        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input value={form.storeName} onChange={(event) => setForm({ ...form, storeName: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input value={form.tagline} onChange={(event) => setForm({ ...form, tagline: event.target.value })} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Legal Entity Name (Tax Invoice & Bill)</Label>
              <Input
                value={form.legalEntity}
                onChange={(event) => setForm({ ...form, legalEntity: event.target.value })}
                placeholder="Rudraksh Collection Retail"
              />
            </div>
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input
                value={form.website}
                onChange={(event) => setForm({ ...form, website: event.target.value })}
                placeholder="www.rudrakshcollection.in"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Store Address</Label>
            <Textarea
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              rows={3}
              placeholder="Shop number, building, street, area, city, pincode"
            />
          </div>

          <div className="space-y-2">
            <Label>City, State & Pincode (Invoice Location)</Label>
            <Input
              value={form.cityStatePincode}
              onChange={(event) => setForm({ ...form, cityStatePincode: event.target.value })}
              placeholder="Gujarat - 390019"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp number</Label>
              <Input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} placeholder="919876543210" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Support email</Label>
            <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Opening hours</Label>
            <Input
              value={form.openingHours}
              onChange={(event) => setForm({ ...form, openingHours: event.target.value })}
              placeholder="Mon–Sat: 10:00 AM – 9:00 PM · Sun: 11:00 AM – 6:00 PM"
            />
          </div>

          <div className="space-y-2">
            <Label>Google Maps embed URL or &lt;iframe&gt; code</Label>
            <Input
              value={form.googleMapsUrl}
              onChange={(event) => setForm({ ...form, googleMapsUrl: event.target.value })}
              placeholder="Paste embed URL or full <iframe> code from Google Maps"
            />
            <p className="text-xs text-muted-foreground">
              You can paste the entire &lt;iframe&gt; snippet from Google Maps — the embed URL is extracted automatically.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Instagram URL</Label>
            <Input
              value={form.instagram}
              onChange={(event) => setForm({ ...form, instagram: event.target.value })}
              placeholder="https://instagram.com/rudrakshcollection"
            />
          </div>

          <div className="space-y-2">
            <Label>Announcement bar text (optional)</Label>
            <Input
              value={form.announcement}
              onChange={(event) => setForm({ ...form, announcement: event.target.value })}
              placeholder="Free shipping on orders above ₹999"
            />
          </div>

          <div className="grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Free shipping above (₹)</Label>
              <Input
                type="number"
                value={form.freeShippingThreshold}
                onChange={(event) => setForm({ ...form, freeShippingThreshold: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Flat shipping fee (₹)</Label>
              <Input
                type="number"
                value={form.shippingFee}
                onChange={(event) => setForm({ ...form, shippingFee: event.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4 border-t border-border pt-6">
            <div className="flex items-start justify-between gap-4">
              <label htmlFor="distance-enabled" className="cursor-pointer">
                <span className="block text-sm font-medium">Charge delivery by distance</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  Off: every order below the free-shipping amount pays the flat fee above. On: the
                  fee depends on how far the customer&apos;s PIN code is from the store. Orders above
                  the free-shipping amount stay free either way.
                </span>
              </label>
              <Switch
                id="distance-enabled"
                checked={form.distanceEnabled}
                onCheckedChange={(checked) => setForm({ ...form, distanceEnabled: checked })}
              />
            </div>

            {form.distanceEnabled && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                <div className="space-y-2 sm:max-w-[220px]">
                  <Label htmlFor="store-pincode">Store PIN code</Label>
                  <Input
                    id="store-pincode"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="390019"
                    value={form.storePincode}
                    onChange={(event) =>
                      setForm({ ...form, storePincode: event.target.value.replace(/\D/g, "").slice(0, 6) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Distance bands</Label>
                  {form.slabs.map((slab, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="w-12 shrink-0 text-muted-foreground">Up to</span>
                      <Input
                        type="number"
                        min={1}
                        aria-label={`Band ${index + 1} distance in km`}
                        className="w-24"
                        value={slab.upToKm}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            slabs: form.slabs.map((row, i) => (i === index ? { ...row, upToKm: event.target.value } : row)),
                          })
                        }
                      />
                      <span className="shrink-0 text-muted-foreground">km  →  ₹</span>
                      <Input
                        type="number"
                        min={0}
                        aria-label={`Band ${index + 1} fee in rupees`}
                        className="w-24"
                        value={slab.fee}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            slabs: form.slabs.map((row, i) => (i === index ? { ...row, fee: event.target.value } : row)),
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove band ${index + 1}`}
                        disabled={form.slabs.length <= 1}
                        onClick={() => setForm({ ...form, slabs: form.slabs.filter((_, i) => i !== index) })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-12 shrink-0 text-muted-foreground">Beyond</span>
                    <span className="w-24 shrink-0 text-muted-foreground">the last band</span>
                    <span className="shrink-0 text-muted-foreground">→  ₹</span>
                    <Input
                      type="number"
                      min={0}
                      aria-label="Fee beyond the last band"
                      className="w-24"
                      value={form.beyondFee}
                      onChange={(event) => setForm({ ...form, beyondFee: event.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={form.slabs.length >= MAX_SLABS}
                    onClick={() => setForm({ ...form, slabs: [...form.slabs, { upToKm: "", fee: "" }] })}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add band
                  </Button>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                  Distance is the straight line between the two PIN codes, so road distance is a
                  little more. If a PIN code cannot be located, the flat fee above is charged
                  instead. Use ₹0 in a band for free local delivery.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-border pt-6">
            <div>
              <h2 className="text-sm font-medium">Tax</h2>
              <p className="text-xs text-muted-foreground">
                Applied on every order by the price engine — never typed by hand.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={form.taxLabel}
                  onChange={(event) => setForm({ ...form, taxLabel: event.target.value })}
                  placeholder="GST"
                />
              </div>
              <div className="space-y-2">
                <Label>Rate (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.taxRate}
                  onChange={(event) => setForm({ ...form, taxRate: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input
                  value={form.gstin}
                  onChange={(event) => setForm({ ...form, gstin: event.target.value.toUpperCase() })}
                  placeholder="24AAACR1234F1Z5"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>PAN (Permanent Account Number)</Label>
                <Input
                  value={form.pan}
                  onChange={(event) => setForm({ ...form, pan: event.target.value.toUpperCase() })}
                  placeholder="AAACR1234F"
                />
              </div>
              <div className="space-y-2">
                <Label>CIN (Corporate Identity Number, optional)</Label>
                <Input
                  value={form.cin}
                  onChange={(event) => setForm({ ...form, cin: event.target.value.toUpperCase() })}
                  placeholder="U18101GJ2024PTC123456"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.taxEnabled}
                  onChange={(event) => setForm({ ...form, taxEnabled: event.target.checked })}
                  className="accent-primary"
                />
                Charge tax
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.taxInclusive}
                  onChange={(event) => setForm({ ...form, taxInclusive: event.target.checked })}
                  className="accent-primary"
                />
                Prices already include tax
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 border-t border-border pt-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.codAvailable}
                onChange={(event) => setForm({ ...form, codAvailable: event.target.checked })}
                className="accent-primary"
              />
              Cash on Delivery available
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.razorpayEnabled}
                onChange={(event) => setForm({ ...form, razorpayEnabled: event.target.checked })}
                className="accent-primary"
              />
              Show online payment (Razorpay)
            </label>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium">Online payment readiness</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Checkout only offers Razorpay when all three are true. Otherwise the option stays hidden
              and customers can still pay cash on delivery.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs">
              <li>{form.razorpayEnabled ? "✓" : "✗"} Shown at checkout (the toggle above)</li>
              <li>
                {gateway?.configured ? "✓" : "✗"} RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET set on the
                server
              </li>
              <li>
                {gateway?.secure ? "✓" : "✗"} FIREBASE_SERVICE_ACCOUNT set, so a paid order is written
                server-side
              </li>
            </ul>
            {gateway && (!gateway.configured || !gateway.secure) ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Add the missing values to <code className="font-mono">.env</code> and restart the
                server.
              </p>
            ) : null}
          </div>

          <div className="space-y-4 border-t border-border pt-6">
            <div>
              <h2 className="text-sm font-medium">Automation</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                What the store does by itself. Switch anything off to do it by hand — every step
                can still be changed manually from Orders and Products.
              </p>
            </div>

            <ul className="divide-y divide-border rounded-lg border border-border">
              {automationRows.map((row) => (
                <li key={row.key} className="flex items-start justify-between gap-4 p-3">
                  <label htmlFor={`auto-${row.key}`} className="cursor-pointer">
                    <span className="block text-sm font-medium">{row.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{row.detail}</span>
                  </label>
                  <Switch
                    id={`auto-${row.key}`}
                    checked={form[row.key]}
                    onCheckedChange={(checked) => setForm({ ...form, [row.key]: checked })}
                  />
                </li>
              ))}
            </ul>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="low-stock">Warn me when stock is at or below</Label>
                <Input
                  id="low-stock"
                  type="number"
                  min={0}
                  value={form.lowStockThreshold}
                  onChange={(event) => setForm({ ...form, lowStockThreshold: event.target.value })}
                />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Button type="button" variant="outline" onClick={sendSummaryNow} disabled={sendingSummary}>
                  {sendingSummary ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  Send summary now
                </Button>
                <Button type="button" variant="outline" onClick={announceNow} disabled={announcing}>
                  {announcing ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  Announce new arrivals now
                </Button>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Always automatic: order confirmation and status emails to customers, stock counts,
              sold-out and low-stock labels, Bestseller and New badges, back-in-stock emails when
              you restock, coupon limits and expiry, and recording a paid order even if the
              customer closes the page.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Spinner className="mr-2 h-4 w-4" /> Saving…</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Save Settings</>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
