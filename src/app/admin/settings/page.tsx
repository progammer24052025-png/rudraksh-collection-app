"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
    | "address"
    | "phone"
    | "whatsapp"
    | "email"
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
  taxLabel: string;
  taxRate: string;
  taxEnabled: boolean;
  taxInclusive: boolean;
};

const DEFAULTS: FormState = {
  storeName: storeConfig.name,
  tagline: storeConfig.tagline,
  address: storeConfig.address,
  phone: storeConfig.phone,
  whatsapp: storeConfig.whatsapp,
  email: storeConfig.email,
  openingHours: storeConfig.openingHours,
  googleMapsUrl: storeConfig.googleMapsUrl,
  instagram: storeConfig.instagram,
  announcement: "",
  freeShippingThreshold: String(storeConfig.freeShippingThreshold),
  shippingFee: String(storeConfig.shippingFee),
  codAvailable: storeConfig.codAvailable,
  razorpayEnabled: storeConfig.razorpayEnabled,
  gstin: "",
  taxLabel: "GST",
  taxRate: "5",
  taxEnabled: true,
  taxInclusive: true,
};

export default function AdminSettingsPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
          freeShippingThreshold: String(settings.freeShippingThreshold ?? current.freeShippingThreshold),
          shippingFee: String(settings.shippingFee ?? current.shippingFee),
          codAvailable: settings.codAvailable ?? current.codAvailable,
          razorpayEnabled: settings.razorpayEnabled ?? current.razorpayEnabled,
          gstin: settings.gstin ?? current.gstin,
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
        address: form.address.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        openingHours: form.openingHours.trim(),
        googleMapsUrl: form.googleMapsUrl.trim(),
        instagram: form.instagram.trim(),
        announcement: form.announcement.trim(),
        freeShippingThreshold: Number(form.freeShippingThreshold) || 0,
        shippingFee: Number(form.shippingFee) || 0,
        codAvailable: form.codAvailable,
        razorpayEnabled: form.razorpayEnabled,
        gstin: form.gstin.trim(),
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

          <div className="space-y-2">
            <Label>Store Address</Label>
            <Textarea
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              rows={3}
              placeholder="Shop number, building, street, area, city, pincode"
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
            <Label>Google Maps embed URL</Label>
            <Input
              value={form.googleMapsUrl}
              onChange={(event) => setForm({ ...form, googleMapsUrl: event.target.value })}
              placeholder="https://www.google.com/maps/embed?pb=…"
            />
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
                <Label>GSTIN (optional)</Label>
                <Input
                  value={form.gstin}
                  onChange={(event) => setForm({ ...form, gstin: event.target.value.toUpperCase() })}
                  placeholder="22AAAAA0000A1Z5"
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
