"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPrice, type Order } from "@/lib/store-data";
import { AdminNav } from "@/components/admin-nav";
import { toast } from "sonner";

const STATUS_OPTIONS = ["placed", "confirmed", "shipped", "delivered", "cancelled"];

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const loadOrders = useCallback(async () => {
    const url = filter === "all" ? "/api/admin/orders" : `/api/admin/orders?status=${filter}`;
    const res = await fetch(url);
    if (!res.ok) {
      router.replace("/admin");
      return;
    }
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  }, [filter, router]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleStatusChange = async (orderId: string, status: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, order_status: status }),
    });
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: status as Order["order_status"] } : o));
      toast.success(`Order marked as ${status}`);
    } else {
      toast.error("Failed to update order");
    }
  };

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-medium">Orders</h1>
            <p className="text-sm text-muted-foreground">{orders.length} orders</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium">{order.order_number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        order.payment_status === "paid" ? "bg-sage/10 text-sage" : "bg-muted text-muted-foreground"
                      }`}>
                        {order.payment_status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.customer_name} • {order.phone}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.address}, {order.city}, {order.state} - {order.pincode}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Array.isArray(order.items) ? order.items.length : 0} item(s) • {order.payment_method.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold">{formatPrice(order.total)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <Select value={order.order_status} onValueChange={(v) => handleStatusChange(order.id, v)}>
                      <SelectTrigger className="w-36 capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1 text-sm">
                        <span className="text-muted-foreground">
                          {item.name} ({item.size}{item.color ? `, ${item.color}` : ""}) × {item.quantity}
                        </span>
                        <span>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground">
            No orders found
          </div>
        )}
      </main>
    </div>
  );
}
