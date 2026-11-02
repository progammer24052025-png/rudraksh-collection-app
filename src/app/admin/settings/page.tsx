"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminNav } from "@/components/admin-nav";
import { toast } from "sonner";
import { storeConfig } from "@/lib/config";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string>>({
    address: storeConfig.address,
    phone: storeConfig.phone,
    whatsapp: storeConfig.whatsapp,
    email: storeConfig.email,
    openingHours: storeConfig.openingHours,
    googleMapsUrl: storeConfig.googleMapsUrl,
    instagram: storeConfig.instagram,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me").then(r => r.json()).then(r => {
      if (!r.authenticated) {
        router.replace("/admin");
        return;
      }
      return fetch("/api/admin/settings");
    }).then(r => r?.json()).then(data => {
      if (data?.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
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
            Update your store contact information and details
          </p>
        </div>

        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          <div className="space-y-2">
            <Label>Store Address</Label>
            <Input value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              placeholder="Full store address" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input value={settings.whatsapp}
                onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                placeholder="919876543210" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              placeholder="store@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Opening Hours</Label>
            <Input value={settings.openingHours}
              onChange={(e) => setSettings({ ...settings, openingHours: e.target.value })}
              placeholder="e.g. Mon-Sat: 10AM - 9PM" />
          </div>
          <div className="space-y-2">
            <Label>Google Maps URL</Label>
            <Input value={settings.googleMapsUrl}
              onChange={(e) => setSettings({ ...settings, googleMapsUrl: e.target.value })}
              placeholder="https://maps.google.com/..." />
          </div>
          <div className="space-y-2">
            <Label>Instagram URL</Label>
            <Input value={settings.instagram}
              onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
              placeholder="https://instagram.com/..." />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> :
              <><Save className="mr-2 h-4 w-4" /> Save Settings</>}
          </Button>
        </div>
      </main>
    </div>
  );
}
