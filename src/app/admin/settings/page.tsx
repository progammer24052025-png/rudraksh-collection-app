"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseGoogleMapsEmbedUrl } from "@/lib/maps";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminNav } from "@/components/admin-nav";
import { readSettings, saveSettings } from "@/lib/firebase";
import { storeConfig } from "@/lib/config";
import type { StoreSettings } from "@/lib/types";

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
};

export default function AdminSettingsPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        }));
      })
      .catch((error) => console.error("Could not load settings:", error))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
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
      });
      toast.success("Settings saved — the storefront updates immediately");
    } catch (error) {
      console.error(error);
      toast.error("Could not save the settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <AdminNav />
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Save Settings</>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
