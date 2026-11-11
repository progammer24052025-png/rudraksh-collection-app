"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Package, ShoppingBag, TrendingUp, Plus, ArrowRight, IndianRupee, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin-nav";
import {
  formatPrice,
  subscribeOrders,
  subscribeProducts,
  subscribeMessages,
  subscribeBrands,
  subscribeCategories,
  subscribeSettings,
} from "@/lib/firebase";
import { SHIPPED_FOLLOW_UP_DAYS, resolveAutomation } from "@/lib/automation";
import { statusLabel } from "@/lib/orders";
import { ADMIN_GROUPS } from "@/lib/admin-nav";
import { topLevelCategories } from "@/lib/categories";
import type { Brand, Category, ContactMessage, Order, Product, StoreSettings } from "@/lib/types";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    const offOrders = subscribeOrders(setOrders);
    const offProducts = subscribeProducts(setProducts);
    const offMessages = subscribeMessages(setMessages);
    const offBrands = subscribeBrands(setBrands);
    const offCategories = subscribeCategories(setCategories);
    const offSettings = subscribeSettings(setSettings);
    return () => {
      offSettings();
      offOrders();
      offProducts();
      offMessages();
      offBrands();
      offCategories();
    };
  }, []);

  const automation = useMemo(() => resolveAutomation(settings), [settings]);

  // Today's to-do list, worked out from live data. Each line is one job and
  // links straight to the screen where it is done; an empty list means done.
  const tasks = useMemo(() => {
    const count = (status: Order["order_status"]) =>
      orders.filter((order) => order.order_status === status).length;
    const stuck = orders.filter(
      (order) =>
        order.order_status === "shipped" &&
        Date.now() - Date.parse(order.updated_at || order.created_at || "") > SHIPPED_FOLLOW_UP_DAYS * 86_400_000,
    ).length;
    const unverified = orders.filter(
      (order) => order.client_written && !["delivered", "cancelled"].includes(order.order_status),
    ).length;
    const activeProducts = products.filter((product) => product.status === "active");
    const soldOut = activeProducts.filter((product) => (product.stock ?? 0) <= 0).length;
    const low = activeProducts.filter(
      (product) => (product.stock ?? 0) > 0 && (product.stock ?? 0) <= automation.lowStockThreshold,
    ).length;
    const unread = messages.filter((message) => message.status === "new").length;

    return [
      { n: count("placed"), label: "to confirm", noun: "order", href: "/admin/orders?status=placed" },
      { n: count("confirmed"), label: "to pack", noun: "order", href: "/admin/orders?status=confirmed" },
      { n: count("packed"), label: "to ship", noun: "order", href: "/admin/orders?status=packed" },
      { n: stuck, label: `shipped over ${SHIPPED_FOLLOW_UP_DAYS} days ago — check delivery`, noun: "parcel", href: "/admin/orders?status=shipped" },
      { n: unverified, label: "with a total to double-check", noun: "order", href: "/admin/orders" },
      { n: soldOut, label: "sold out — restock or hide", noun: "product", href: "/admin/products" },
      { n: low, label: "running low", noun: "product", href: "/admin/products" },
      { n: unread, label: "to read", noun: "message", href: "/admin/messages" },
    ].filter((task) => task.n > 0);
  }, [orders, products, messages, automation.lowStockThreshold]);

  const stats = useMemo(() => {
    const active = orders.filter((order) => order.order_status !== "cancelled");
    return {
      products: products.length,
      lowStock: products.filter((product) => (product.stock ?? 0) <= automation.lowStockThreshold && product.status === "active").length,
      orders: orders.length,
      pending: orders.filter((order) => ["placed", "confirmed", "packed"].includes(order.order_status)).length,
      revenue: active.reduce((sum, order) => sum + (order.total ?? 0), 0),
      newMessages: messages.filter((message) => message.status === "new").length,
    };
  }, [orders, products, messages, automation.lowStockThreshold]);

  const recent = orders.slice(0, 6);

  const groupDetail: Record<string, string | null> = {
    catalog: `${products.length} products · ${topLevelCategories(categories).length} departments · ${brands.length} brands`,
    sales: `${stats.pending} in progress`,
    content: stats.newMessages ? `${stats.newMessages} new` : "Nothing waiting",
    people: null,
    settings: null,
  };

  return (
    <div className="min-h-screen">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-medium">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Live overview — updates in real time</p>
          </div>
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Link>
          </Button>
        </div>

        <section className="mb-8 rounded-lg border border-border bg-card" aria-labelledby="tasks-heading">
          <div className="border-b border-border p-4">
            <h2 id="tasks-heading" className="font-serif text-lg font-medium">Needs your attention</h2>
            <p className="text-xs text-muted-foreground">
              Everything else is handled automatically. Work down this list and the day is done.
            </p>
          </div>
          {tasks.length === 0 ? (
            <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-sage" /> Nothing is waiting on you right now.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {tasks.map((task) => (
                <li key={`${task.noun}-${task.label}`}>
                  <Link
                    href={task.href}
                    className="flex items-center justify-between gap-3 p-4 text-sm transition-colors hover:bg-muted/40"
                  >
                    <span>
                      <span className="mr-2 inline-flex min-w-7 justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        {task.n}
                      </span>
                      {task.noun}{task.n === 1 ? "" : "s"} {task.label}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={ShoppingBag} label="Orders" value={String(stats.orders)} detail={`${stats.pending} in progress`} />
          <StatCard icon={IndianRupee} label="Order value" value={formatPrice(stats.revenue)} detail="Excludes cancelled" />
          <StatCard icon={Package} label="Products" value={String(stats.products)} detail={`${stats.lowStock} low on stock`} />
          <StatCard icon={TrendingUp} label="New messages" value={String(stats.newMessages)} detail="From the contact form" />
        </div>

        <div className="mt-10">
          <h2 className="mb-4 font-serif text-lg font-medium">Manage the store</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ADMIN_GROUPS.filter((group) => group.key !== "dashboard").map((group) => (
              <div key={group.key} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <group.icon className="h-4.5 w-4.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{group.label}</p>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                </div>
                {groupDetail[group.key] ? (
                  <p className="mt-3 text-xs text-muted-foreground">{groupDetail[group.key]}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {group.tabs.map((tab) => (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-sage hover:text-foreground"
                    >
                      {tab.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-serif text-lg font-medium">Recent Orders</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/orders">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {recent.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No orders yet. New orders appear here instantly.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((order) => (
                <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.customer_name} • {order.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusLabel(order.order_status).className}`}>
                      {statusLabel(order.order_status).label}
                    </span>
                    <p className="text-sm font-medium">{formatPrice(order.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/orders"
            className="flex items-center justify-between rounded-lg border border-border bg-card p-5 hover:border-primary/30"
          >
            <div>
              <p className="font-medium">Manage orders</p>
              <p className="text-sm text-muted-foreground">Update status and payment</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center justify-between rounded-lg border border-border bg-card p-5 hover:border-primary/30"
          >
            <div>
              <p className="font-medium">Store settings</p>
              <p className="text-sm text-muted-foreground">Contact details, shipping and hours</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </main>
    </div>
  );
}

function StatCard({
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
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}
