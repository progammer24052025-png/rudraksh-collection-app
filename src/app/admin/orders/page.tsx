"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, RefreshCw, Check, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin-nav";
import { toast } from "sonner";
import { formatPrice, subscribeOrders, updateOrderStatus } from "@/lib/firebase";
import { ORDER_STATUSES, PAYMENT_STATUSES, paymentLabel, statusLabel } from "@/lib/orders";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeOrders((list) => {
      setOrders(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter !== "all" && order.order_status !== filter) return false;
      if (!term) return true;
      return (
        order.order_number.toLowerCase().includes(term) ||
        order.customer_name.toLowerCase().includes(term) ||
        order.phone.includes(term)
      );
    });
  }, [orders, filter, search]);

  const changeStatus = async (order: Order, status: OrderStatus) => {
    setBusyId(order.id);
    try {
      const extra: { payment_status?: PaymentStatus } = {};
      if (status === "delivered" && order.payment_method === "cod" && order.payment_status === "pending") {
        extra.payment_status = "paid";
      }
      await updateOrderStatus(order.id, status, extra);
      toast.success(
        extra.payment_status
          ? `${order.order_number} marked Delivered & Paid!`
          : `${order.order_number} → ${status}`,
      );
    } catch (error) {
      console.error(error);
      toast.error("Could not update the order status");
    } finally {
      setBusyId(null);
    }
  };

  const changePayment = async (order: Order, payment_status: PaymentStatus) => {
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, order.order_status, { payment_status });
      toast.success(`Payment marked ${payment_status}`);
    } catch (error) {
      console.error(error);
      toast.error("Could not update the payment status");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-medium">Orders</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Connecting…" : `${filtered.length} of ${orders.length} orders`} · live
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Order no, name, phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-56 pl-9"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Filter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All orders</SelectItem>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <RefreshCw className="mx-auto h-10 w-10" />
            <p className="mt-3 text-sm">No orders match this view yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => (
              <div key={order.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium">{order.order_number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusLabel(order.order_status).className}`}>
                        {statusLabel(order.order_status).label}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${paymentLabel(order.payment_status).className}`}>
                        {paymentLabel(order.payment_status).label}
                      </span>
                      {busyId === order.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    </div>
                    <p className="mt-1 text-sm">{order.customer_name} • {order.phone}</p>
                    {order.email && <p className="text-xs text-muted-foreground">{order.email}</p>}
                    <p className="text-xs text-muted-foreground">
                      {order.address}, {order.city}, {order.state} — {order.pincode}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString("en-IN")} · {order.payment_method.toUpperCase()}
                    </p>
                    {order.notes && (
                      <p className="mt-2 rounded bg-muted px-2 py-1 text-xs">Note: {order.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <p className="mr-2 text-lg font-semibold">{formatPrice(order.total)}</p>
                    {order.payment_status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-xs bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                        onClick={() => changePayment(order, "paid")}
                        disabled={busyId === order.id}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" /> Mark Paid
                      </Button>
                    )}
                    <Select value={order.order_status} onValueChange={(value) => changeStatus(order, value as OrderStatus)}>
                      <SelectTrigger className="w-36 capitalize"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((status) => (
                          <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={order.payment_status} onValueChange={(value) => changePayment(order, value as PaymentStatus)}>
                      <SelectTrigger className="w-32 capitalize"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUSES.map((status) => (
                          <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button asChild variant="ghost" size="sm" className="h-9 text-xs gap-1">
                      <a href={`/invoice?order=${order.order_number}`} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-3.5 w-3.5" /> Invoice
                      </a>
                    </Button>
                  </div>
                </div>

                {Array.isArray(order.items) && order.items.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-border pt-3">
                    {order.items.map((item, index) => (
                      <div key={`${item.productId}-${index}`} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.name} ({item.size}{item.color ? `, ${item.color}` : ""}) × {item.quantity}
                        </span>
                        <span>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border pt-2 text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button asChild variant="outline" size="sm">
            <a href="/admin/orders">Refresh</a>
          </Button>
        </div>
      </main>
    </div>
  );
}
