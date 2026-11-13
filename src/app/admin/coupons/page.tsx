"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { deleteCoupon, saveCoupon, subscribeCoupons } from "@/lib/firebase";
import { validateCoupon } from "@/lib/pricing";
import type { Coupon, CouponType } from "@/lib/types";

import { Spinner } from "@/components/ui/spinner";
type Draft = {
  code: string;
  title: string;
  description: string;
  type: CouponType;
  value: string;
  min_order: string;
  max_uses: string;
  active: boolean;
  starts_at: string;
  ends_at: string;
};

const EMPTY: Draft = {
  code: "",
  title: "",
  description: "",
  type: "percent",
  value: "10",
  min_order: "0",
  max_uses: "0",
  active: true,
  starts_at: "",
  ends_at: "",
};

const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");

function statusOf(coupon: Coupon) {
  const check = validateCoupon(coupon, Number.MAX_SAFE_INTEGER);
  if (!coupon.active) return { label: "Off", tone: "bg-muted text-muted-foreground" };
  if (check.ok) return { label: "Live", tone: "bg-sage/15 text-sage" };
  if (coupon.ends_at && new Date(coupon.ends_at) < new Date())
    return { label: "Expired", tone: "bg-destructive/10 text-destructive" };
  if (coupon.starts_at && new Date(coupon.starts_at) > new Date())
    return { label: "Scheduled", tone: "bg-saffron/25 text-foreground" };
  return { label: "Paused", tone: "bg-muted text-muted-foreground" };
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeCoupons(setCoupons), []);

  const nextSort = useMemo(() => coupons.length, [coupons.length]);

  async function submit() {
    const code = draft.code.trim().toUpperCase();
    if (!code) return toast.error("A code is required");
    if (!draft.title.trim()) return toast.error("Give the offer a title customers will see");
    const value = Number(draft.value);
    if (!Number.isFinite(value) || value <= 0) return toast.error("Discount value must be greater than zero");
    if (draft.type === "percent" && value > 100) return toast.error("A percentage cannot exceed 100");

    setSaving(true);
    try {
      const existing = coupons.find((coupon) => coupon.code.toUpperCase() === code);
      await saveCoupon({
        code,
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        type: draft.type,
        value,
        min_order: Math.max(0, Number(draft.min_order) || 0),
        max_uses: Math.max(0, Number(draft.max_uses) || 0),
        active: draft.active,
        starts_at: draft.starts_at ? new Date(draft.starts_at).toISOString() : null,
        ends_at: draft.ends_at ? new Date(`${draft.ends_at}T23:59:59`).toISOString() : null,
        used_count: existing?.used_count ?? 0,
        created_at: existing?.created_at,
      });
      toast.success(`${code} saved`);
      setDraft(EMPTY);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the coupon");
    } finally {
      setSaving(false);
    }
  }

  function edit(coupon: Coupon) {
    setEditing(coupon.code);
    setDraft({
      code: coupon.code,
      title: coupon.title,
      description: coupon.description ?? "",
      type: coupon.type,
      value: String(coupon.value),
      min_order: String(coupon.min_order ?? 0),
      max_uses: String(coupon.max_uses ?? 0),
      active: coupon.active,
      starts_at: toDateInput(coupon.starts_at),
      ends_at: toDateInput(coupon.ends_at),
    });
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="font-serif text-2xl">Coupons</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every code here is real: the checkout validates it server-side and refuses anything
            expired, inactive or below its minimum.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <section className="h-fit rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-medium">
              {editing ? `Editing ${editing}` : "New coupon"}
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <Label htmlFor="coupon-code">Code</Label>
                <Input
                  id="coupon-code"
                  value={draft.code}
                  onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })}
                  placeholder="WELCOME10"
                  className="mt-1 font-mono uppercase"
                  disabled={Boolean(editing)}
                />
              </div>
              <div>
                <Label htmlFor="coupon-title">Customer-facing title</Label>
                <Input
                  id="coupon-title"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="10% off your first order"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="coupon-type">Type</Label>
                  <select
                    id="coupon-type"
                    value={draft.type}
                    onChange={(event) => setDraft({ ...draft, type: event.target.value as CouponType })}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="percent">Percent</option>
                    <option value="flat">Flat ₹</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="coupon-value">{draft.type === "percent" ? "Percent" : "Rupees"}</Label>
                  <Input
                    id="coupon-value"
                    type="number"
                    value={draft.value}
                    onChange={(event) => setDraft({ ...draft, value: event.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="coupon-min">Min order ₹</Label>
                  <Input
                    id="coupon-min"
                    type="number"
                    value={draft.min_order}
                    onChange={(event) => setDraft({ ...draft, min_order: event.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="coupon-max">Max uses</Label>
                  <Input
                    id="coupon-max"
                    type="number"
                    value={draft.max_uses}
                    onChange={(event) => setDraft({ ...draft, max_uses: event.target.value })}
                    className="mt-1"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">0 = unlimited</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="coupon-start">Starts</Label>
                  <Input
                    id="coupon-start"
                    type="date"
                    value={draft.starts_at}
                    onChange={(event) => setDraft({ ...draft, starts_at: event.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="coupon-end">Ends</Label>
                  <Input
                    id="coupon-end"
                    type="date"
                    value={draft.ends_at}
                    onChange={(event) => setDraft({ ...draft, ends_at: event.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <Label htmlFor="coupon-active" className="text-sm font-normal">
                  Active
                </Label>
                <Switch
                  id="coupon-active"
                  checked={draft.active}
                  onCheckedChange={(checked) => setDraft({ ...draft, active: checked })}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={() => void submit()} disabled={saving} className="flex-1">
                  {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  <span className="ml-1.5">{editing ? "Update" : "Create"}</span>
                </Button>
                {editing ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(null);
                      setDraft(EMPTY);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            {coupons.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                <Ticket className="mx-auto mb-2 h-6 w-6" />
                No coupons yet. Create one and it appears in the cart instantly.
              </div>
            ) : (
              coupons.map((coupon) => {
                const status = statusOf(coupon);
                return (
                  <article
                    key={coupon.code}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{coupon.code}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${status.tone}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{coupon.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {coupon.type === "percent" ? `${coupon.value}%` : `₹${coupon.value}`} off
                        {coupon.min_order ? ` · min ₹${coupon.min_order}` : ""}
                        {coupon.max_uses
                          ? ` · used ${coupon.used_count ?? 0}/${coupon.max_uses}`
                          : ` · used ${coupon.used_count ?? 0}`}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => edit(coupon)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${coupon.code}`}
                      onClick={async () => {
                        if (!window.confirm(`Delete ${coupon.code}?`)) return;
                        await deleteCoupon(coupon.code);
                        toast.success("Coupon deleted");
                        if (editing === coupon.code) {
                          setEditing(null);
                          setDraft(EMPTY);
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </article>
                );
              })
            )}
          </section>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          {nextSort === 0
            ? "Tip: the cart shows live coupons automatically, so a code you create here is redeemable straight away."
            : "One coupon per order. Discounts apply to the discounted subtotal, including sale items."}
        </p>
      </main>
    </>
  );
}
