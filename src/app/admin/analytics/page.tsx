"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Eye, IndianRupee, Lock, MousePointerClick, ShoppingBag, Users } from "lucide-react";

import { AdminNav } from "@/components/admin-nav";
import { SealLoader } from "@/components/kit/brand-mark";
import { cn } from "@/lib/utils";
import { combine, decodeKey, istDay, ranked, summarise, type DaySummary, type Hit } from "@/lib/analytics";
import { formatPrice, readValue, subscribeOrders, subscribeProducts } from "@/lib/firebase";
import type { Order, Product } from "@/lib/types";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct / typed in",
  google: "Google search",
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  bing: "Bing",
  other: "Other sites",
};
const sourceLabel = (key: string) =>
  key.startsWith("campaign:") ? `Campaign: ${key.slice(9)}` : SOURCE_LABELS[key] ?? key;

function lastDays(count: number): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) days.push(istDay(Date.now() - i * 86_400_000));
  return days;
}

/** Order date in the store's business day (India), matching the analytics days. */
const orderDay = (order: Order) => istDay(Date.parse(order.created_at || "") || 0);

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState(30);
  const [daily, setDaily] = useState<Record<string, DaySummary> | null>(null);
  const [rawDays, setRawDays] = useState<Record<string, DaySummary>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    // Finished days come pre-summed; today (and any day the nightly job has
    // not reached yet) is summed here from its raw hits.
    Promise.all([
      readValue<Record<string, DaySummary>>(["analytics", "daily"]),
      readValue<Record<string, Record<string, Hit>>>(["analytics", "hits"]),
    ]).then(([summaries, hits]) => {
      if (cancelled) return;
      setDaily(summaries ?? {});
      setRawDays(
        Object.fromEntries(Object.entries(hits ?? {}).map(([day, dayHits]) => [day, summarise(Object.values(dayHits ?? {}))])),
      );
    });
    const offOrders = subscribeOrders(setOrders);
    const offProducts = subscribeProducts(setProducts);
    return () => {
      cancelled = true;
      offOrders();
      offProducts();
    };
  }, []);

  const days = useMemo(() => lastDays(range), [range]);

  const perDay = useMemo(
    () =>
      days.map((day) => {
        const parts = [daily?.[day], rawDays[day]].filter((part): part is DaySummary => Boolean(part));
        return { day, summary: combine(parts) };
      }),
    [days, daily, rawDays],
  );

  const total = useMemo(() => combine(perDay.map((entry) => entry.summary)), [perDay]);

  const rangeOrders = useMemo(() => {
    const inRange = new Set(days);
    return orders.filter((order) => order.order_status !== "cancelled" && inRange.has(orderDay(order)));
  }, [orders, days]);

  const ordersByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const order of rangeOrders) map[orderDay(order)] = (map[orderDay(order)] ?? 0) + 1;
    return map;
  }, [rangeOrders]);

  const revenue = rangeOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const conversion = total.sessions > 0 ? (rangeOrders.length / total.sessions) * 100 : 0;

  const productNames = useMemo(
    () => new Map(products.flatMap((product) => [[product.slug, product.name], [product.id, product.name]])),
    [products],
  );

  const pages = ranked(total.pages, 200);
  const productViews = pages
    .filter((page) => /^\/products\/[^/?]+$/.test(page.key))
    .map((page) => {
      const slug = page.key.slice("/products/".length);
      return { key: page.key, label: productNames.get(slug) ?? slug, count: page.count };
    });
  const productViewTotal = productViews.reduce((sum, page) => sum + page.count, 0);

  const funnel = [
    { label: "Visits", count: total.sessions },
    { label: "Viewed a product", count: productViewTotal },
    { label: "Added to cart", count: total.events[encodeURIComponent("add_to_cart")] ?? 0 },
    { label: "Started checkout", count: total.events[encodeURIComponent("begin_checkout")] ?? 0 },
    { label: "Placed an order", count: rangeOrders.length },
  ];

  const maxVisits = Math.max(1, ...perDay.map((entry) => entry.summary.sessions));
  const loading = daily === null;
  const empty = !loading && total.views === 0;

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-medium">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Your own visitor numbers, from your own database. Times are India time.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-card p-1" role="group" aria-label="Date range">
            {RANGES.map((option) => (
              <button
                key={option.days}
                type="button"
                onClick={() => setRange(option.days)}
                aria-pressed={range === option.days}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  range === option.days ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <SealLoader label="Loading analytics" className="min-h-[40vh]" />
        ) : (
          <>
            {empty && (
              <div className="mb-6 rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                No visits recorded in this period yet. Numbers start appearing once the site is live with the
                server credentials set, and are not recorded for devices where an admin has signed in.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Stat icon={Users} label="Visits" value={total.sessions.toLocaleString("en-IN")} detail={`${total.newVisitors.toLocaleString("en-IN")} first-time`} />
              <Stat icon={Eye} label="Page views" value={total.views.toLocaleString("en-IN")} detail={total.sessions ? `${(total.views / total.sessions).toFixed(1)} per visit` : "—"} />
              <Stat icon={ShoppingBag} label="Orders" value={rangeOrders.length.toLocaleString("en-IN")} detail="Excludes cancelled" />
              <Stat icon={IndianRupee} label="Order value" value={formatPrice(revenue)} detail={rangeOrders.length ? `${formatPrice(revenue / rangeOrders.length)} average` : "—"} />
              <Stat icon={MousePointerClick} label="Conversion" value={`${conversion.toFixed(1)}%`} detail="Orders per visit" />
            </div>

            <section className="mt-6 rounded-lg border border-border bg-card p-5" aria-labelledby="daily-heading">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="daily-heading" className="font-serif text-lg font-medium">Visits per day</h2>
                <p className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sage" /> Visits</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-ink" /> Has orders</span>
                </p>
              </div>
              <div className="mt-4 flex h-44 items-end gap-[2px]" role="img" aria-label="Bar chart of visits per day">
                {perDay.map(({ day, summary }) => {
                  const height = Math.round((summary.sessions / maxVisits) * 100);
                  const ordered = ordersByDay[day] ?? 0;
                  return (
                    <div key={day} className="group relative flex h-full flex-1 flex-col justify-end">
                      <div
                        className="w-full rounded-t bg-sage/70 transition-colors group-hover:bg-sage"
                        style={{ height: `${Math.max(height, summary.sessions ? 3 : 1)}%` }}
                      />
                      {ordered > 0 && <span className="mx-auto mt-1 h-1.5 w-1.5 rounded-full bg-rose-ink" />}
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[11px] text-background group-hover:block">
                        {new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}: {summary.sessions} visits
                        {ordered ? `, ${ordered} order${ordered === 1 ? "" : "s"}` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>{new Date(`${days[0]}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                <span>Today</span>
              </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Panel title="From visit to order">
                <ul className="space-y-3">
                  {funnel.map((step, index) => {
                    const base = funnel[0].count || 1;
                    const share = Math.min(100, Math.round((step.count / base) * 100));
                    return (
                      <li key={step.label}>
                        <div className="flex justify-between text-sm">
                          <span>{step.label}</span>
                          <span className="font-medium">
                            {step.count.toLocaleString("en-IN")}
                            {index > 0 && funnel[0].count > 0 ? <span className="ml-2 text-xs text-muted-foreground">{share}%</span> : null}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${index === 0 ? 100 : share}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                  The biggest drop between two steps is where shoppers give up — that page is the one to improve first.
                </p>
              </Panel>

              <Panel title="Where visitors come from">
                <BarList items={ranked(total.sources, 8).map((entry) => ({ label: sourceLabel(entry.key), count: entry.count }))} empty="No visits yet" />
                <p className="mt-4 text-xs text-muted-foreground">
                  Tip: add <code className="rounded bg-muted px-1">?utm_source=instagram</code> to links you post, and they show up here as a campaign.
                </p>
              </Panel>

              <Panel title="Most viewed products">
                <BarList
                  items={productViews.slice(0, 10).map((entry) => ({ label: entry.label, count: entry.count, href: entry.key }))}
                  empty="No product views yet"
                />
              </Panel>

              <Panel title="Most visited pages">
                <BarList items={pages.slice(0, 10).map((entry) => ({ label: entry.key, count: entry.count, href: entry.key }))} empty="No page views yet" />
              </Panel>

              <Panel title="What people search for">
                <BarList items={ranked(total.searches, 10).map((entry) => ({ label: entry.key, count: entry.count }))} empty="No searches yet" />
                <p className="mt-4 text-xs text-muted-foreground">
                  Searches with no matching product are stock you could add.
                </p>
              </Panel>

              <Panel title="Devices">
                <BarList
                  items={ranked(total.devices, 3).map((entry) => ({ label: entry.key.charAt(0).toUpperCase() + entry.key.slice(1), count: entry.count }))}
                  empty="No visits yet"
                />
              </Panel>
            </div>

            <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Private by design: no cookies, IP addresses, names or order numbers are stored — only page names, the
              site a visitor came from, the device type and a first-visit flag. Only admins can read these numbers,
              raw visits are summed every night and the summaries are kept for about a year. For page-speed figures
              and a second opinion on traffic, see Vercel Analytics in your Vercel dashboard.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-medium">
        <BarChart3 className="h-4 w-4 text-muted-foreground" /> {title}
      </h2>
      {children}
    </section>
  );
}

function BarList({
  items,
  empty,
}: {
  items: Array<{ label: string; count: number; href?: string }>;
  empty: string;
}) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="relative overflow-hidden rounded-md">
          <div className="absolute inset-y-0 left-0 rounded-md bg-sage/15" style={{ width: `${(item.count / max) * 100}%` }} aria-hidden />
          <div className="relative flex items-center justify-between gap-3 px-2.5 py-1.5 text-sm">
            {item.href ? (
              <Link href={decodeKey(item.href)} target="_blank" className="min-w-0 truncate hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="min-w-0 truncate">{item.label}</span>
            )}
            <span className="shrink-0 font-medium tabular-nums">{item.count.toLocaleString("en-IN")}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
