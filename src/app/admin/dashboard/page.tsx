"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, ShoppingBag, TrendingUp, LogOut, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/store-data";
import { AdminNav } from "@/components/admin-nav";

interface Stats {
  products: number;
  orders: number;
  revenue: number;
  recentOrders: Array<{
    id: string;
    order_number: string;
    customer_name: string;
    total: number;
    order_status: string;
    created_at: string;
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const res = await fetch("/api/admin/me");
    const data = await res.json();
    if (!data.authenticated) {
      router.replace("/admin");
      return;
    }
    // Load stats
    const [productsRes, ordersRes] = await Promise.all([
      fetch("/api/admin/products"),
      fetch("/api/admin/orders"),
    ]);
    const productsData = productsRes.ok ? await productsRes.json() : { products: [] };
    const ordersData = ordersRes.ok ? await ordersRes.json() : { orders: [] };

    const revenue = ordersData.orders?.reduce((sum: number, o: { total: number; payment_status: string }) =>
      sum + (o.payment_status === "paid" ? o.total : 0), 0) || 0;

    setStats({
      products: productsData.total || productsData.products?.length || 0,
      orders: ordersData.orders?.length || 0,
      revenue,
      recentOrders: (ordersData.orders || []).slice(0, 5),
    });
    setLoading(false);
  }, [router]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin");
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <AdminNav />
        <div className="flex h-96 items-center justify-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-medium">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Store overview and recent activity</p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/admin/products/new">
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </Link>
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-2xl font-semibold">{stats?.products ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orders</p>
                <p className="text-2xl font-semibold">{stats?.orders ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue (Paid)</p>
                <p className="text-2xl font-semibold">{formatPrice(stats?.revenue ?? 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="mt-8 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-serif text-lg font-medium">Recent Orders</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/orders">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {stats?.recentOrders.length ? (
            <div className="divide-y divide-border">
              {stats.recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatPrice(order.total)}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                      order.order_status === "delivered" ? "bg-sage/10 text-sage" :
                      order.order_status === "shipped" ? "bg-blue-100 text-blue-700" :
                      order.order_status === "cancelled" ? "bg-destructive/10 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {order.order_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No orders yet. Orders will appear here when customers place them.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
