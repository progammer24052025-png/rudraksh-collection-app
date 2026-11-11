"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, Loader2, Megaphone, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteBanner,
  isBannerLive,
  saveBanner,
  subscribeBanners,
  subscribeProducts,
} from "@/lib/firebase";
import type { Banner, BannerPlacement, Product } from "@/lib/types";

type Draft = {
  id: string;
  title: string;
  subtitle: string;
  code: string;
  image: string;
  link: string;
  placement: BannerPlacement;
  product_ids: string[];
  active: boolean;
  starts_at: string;
  ends_at: string;
  sort: string;
};

const EMPTY: Draft = {
  id: "",
  title: "",
  subtitle: "",
  code: "",
  image: "",
  link: "/products",
  placement: "home_offers",
  product_ids: [],
  active: true,
  starts_at: "",
  ends_at: "",
  sort: "0",
};

const PLACEMENTS: { value: BannerPlacement; label: string }[] = [
  { value: "home_offers", label: "Homepage — offers section" },
  { value: "announcement", label: "Header announcement bar" },
  { value: "cart", label: "Cart — offer strip" },
];

const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeBanners(setBanners), []);
  useEffect(() => subscribeProducts(setProducts), []);

  async function submit() {
    if (!draft.title.trim()) return toast.error("A headline is required");
    setSaving(true);
    try {
      const id = draft.id || `banner-${Date.now().toString(36)}`;
      await saveBanner({
        id,
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim() || undefined,
        code: draft.code.trim().toUpperCase() || undefined,
        image: draft.image.trim() || undefined,
        link: draft.link.trim() || "/products",
        placement: draft.placement,
        product_ids: draft.product_ids,
        active: draft.active,
        starts_at: draft.starts_at ? new Date(draft.starts_at).toISOString() : null,
        ends_at: draft.ends_at ? new Date(`${draft.ends_at}T23:59:59`).toISOString() : null,
        sort: Number(draft.sort) || 0,
        created_at: banners.find((banner) => banner.id === id)?.created_at,
      });
      toast.success("Banner saved");
      setDraft(EMPTY);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the banner");
    } finally {
      setSaving(false);
    }
  }

  function edit(banner: Banner) {
    setDraft({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      code: banner.code ?? "",
      image: banner.image ?? "",
      link: banner.link,
      placement: banner.placement,
      product_ids: banner.product_ids ?? [],
      active: banner.active,
      starts_at: toDateInput(banner.starts_at),
      ends_at: toDateInput(banner.ends_at),
      sort: String(banner.sort ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleProduct(id: string) {
    setDraft((current) => ({
      ...current,
      product_ids: current.product_ids.includes(id)
        ? current.product_ids.filter((item) => item !== id)
        : [...current.product_ids, id],
    }));
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="font-serif text-2xl">Festival offers &amp; banners</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Banners appear only between their start and end dates. Pick the products yourself —
            nothing is invented.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <section className="h-fit rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-medium">{draft.id ? "Edit banner" : "New banner"}</h2>
            <div className="flex flex-col gap-3">
              <div>
                <Label htmlFor="banner-title">Headline</Label>
                <Input
                  id="banner-title"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Flat 15% off festive wear"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="banner-subtitle">Subtext</Label>
                <Textarea
                  id="banner-subtitle"
                  value={draft.subtitle}
                  onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })}
                  placeholder="Handpicked ethnic sets for the season."
                  className="mt-1 min-h-16"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="banner-code">Coupon code</Label>
                  <Input
                    id="banner-code"
                    value={draft.code}
                    onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })}
                    placeholder="FESTIVE15"
                    className="mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-link">Button link</Label>
                  <Input
                    id="banner-link"
                    value={draft.link}
                    onChange={(event) => setDraft({ ...draft, link: event.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="banner-image">Background image URL (optional)</Label>
                <Input
                  id="banner-image"
                  value={draft.image}
                  onChange={(event) => setDraft({ ...draft, image: event.target.value })}
                  placeholder="/resources/banners/festive-2026.webp"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="banner-placement">Placement</Label>
                <select
                  id="banner-placement"
                  value={draft.placement}
                  onChange={(event) =>
                    setDraft({ ...draft, placement: event.target.value as BannerPlacement })
                  }
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {PLACEMENTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="banner-start">Starts</Label>
                  <Input
                    id="banner-start"
                    type="date"
                    value={draft.starts_at}
                    onChange={(event) => setDraft({ ...draft, starts_at: event.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-end">Ends</Label>
                  <Input
                    id="banner-end"
                    type="date"
                    value={draft.ends_at}
                    onChange={(event) => setDraft({ ...draft, ends_at: event.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="banner-sort">Order</Label>
                  <Input
                    id="banner-sort"
                    type="number"
                    value={draft.sort}
                    onChange={(event) => setDraft({ ...draft, sort: event.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2">
                    <Label htmlFor="banner-active" className="text-sm font-normal">
                      Active
                    </Label>
                    <Switch
                      id="banner-active"
                      checked={draft.active}
                      onCheckedChange={(checked) => setDraft({ ...draft, active: checked })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Featured products ({draft.product_ids.length} selected)</Label>
                <div className="mt-1 max-h-48 overflow-auto rounded-lg border border-border p-2">
                  {products.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">No products yet.</p>
                  ) : (
                    <ul className="flex flex-col">
                      {products.map((product) => (
                        <li key={product.id}>
                          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary">
                            <input
                              type="checkbox"
                              checked={draft.product_ids.includes(product.id)}
                              onChange={() => toggleProduct(product.id)}
                              className="h-4 w-4 accent-[var(--sage)]"
                            />
                            <span className="truncate">{product.name}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={() => void submit()} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span className="ml-1.5">Save banner</span>
                </Button>
                {draft.id ? (
                  <Button variant="outline" onClick={() => setDraft(EMPTY)}>
                    New
                  </Button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            {banners.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                <Megaphone className="mx-auto mb-2 h-6 w-6" />
                No banners yet.
              </div>
            ) : (
              banners.map((banner) => {
                const live = isBannerLive(banner);
                return (
                  <article key={banner.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start gap-3">
                      {banner.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={banner.image}
                          alt=""
                          className="h-14 w-20 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-md bg-cream text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-medium">{banner.title}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              live ? "bg-sage/15 text-sage" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {live ? "Live" : banner.active ? "Scheduled / ended" : "Off"}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {PLACEMENTS.find((option) => option.value === banner.placement)?.label}
                          {banner.code ? ` · ${banner.code}` : ""}
                          {banner.product_ids?.length ? ` · ${banner.product_ids.length} products` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {banner.starts_at ? new Date(banner.starts_at).toLocaleDateString("en-IN") : "Always on"}
                          {" → "}
                          {banner.ends_at ? new Date(banner.ends_at).toLocaleDateString("en-IN") : "no end"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => edit(banner)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete banner"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            if (!window.confirm("Delete this banner?")) return;
                            await deleteBanner(banner.id);
                            toast.success("Banner deleted");
                            if (draft.id === banner.id) setDraft(EMPTY);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>
      </main>
    </>
  );
}
