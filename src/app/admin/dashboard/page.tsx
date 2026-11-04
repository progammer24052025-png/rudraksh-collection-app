"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Package, ShoppingBag, TrendingUp, Plus, ArrowRight, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin-nav";
import { formatPrice, subscribeOrders, subscribeProducts, subscribeMessages } from "@/lib/firebase";
import { statusLabel } from "@/lib/orders";
import type { ContactMessage, Order, Product } from "@/lib/types";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  useEffect(() => {
    const offOrders = subscribeOrders(setOrders);
    const offProducts = subscribeProducts(setProducts);
    const offMessages = subscribeMessages(setMessages);
    return () => {
      offOrders();
      offProducts();
      offMessages();
    };
  }, []);

  const stats = useMemo(() => {
    const active = orders.filter((order) => order.order_status !== "cancelled");
    return {
      products: products.length,
      lowStock: products.filter((product) => (product.stock ?? 0) <= 3 && product.status === "active").length,
      orders: orders.length,
      pending: orders.filter((order) => ["placed", "confirmed", "packed"].includes(order.order_status)).length,
      revenue: active.reduce((sum, order) => sum + (order.total ?? 0), 0),
      newMessages: messages.filter((message) => message.status === "new").length,
    };
  }, [orders, products, messages]);

  const recent = orders.slice(0, 6);

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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={ShoppingBag} label="Orders" value={String(stats.orders)} detail={`${stats.pending} in progress`} />
          <StatCard icon={IndianRupee} label="Order value" value={formatPrice(stats.revenue)} detail="Excludes cancelled" />
          <StatCard icon={Package} label="Products" value={String(stats.products)} detail={`${stats.lowStock} low on stock`} />
          <StatCard icon={TrendingUp} label="New messages" value={String(stats.newMessages)} detail="From the contact form" />
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
