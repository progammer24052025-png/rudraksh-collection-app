"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Check, FileText, ChevronsRight, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin-nav";
import { BillDialog } from "@/components/order-bill";
import { CancelOrderDialog } from "@/components/cancel-order-dialog";
import { toBillOrder } from "@/lib/order-document";
import { toast } from "sonner";
import { TrackingSyncError, formatPrice, subscribeOrders, updateOrderStatus, updateValue } from "@/lib/firebase";
import { ORDER_STATUSES, PAYMENT_STATUSES, paymentLabel, statusLabel } from "@/lib/orders";
import { nextOrderStep } from "@/lib/automation";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";

import { Spinner } from "@/components/ui/spinner";
import { SealLoader } from "@/components/kit/brand-mark";
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [billOrder, setBillOrder] = useState<Order | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  // Looked up live, so the dialog closes itself if the order changes underneath it.
  const cancelOrder = orders.find((order) => order.id === cancelOrderId) ?? null;

  // The dashboard links here with ?status=… so a task opens already filtered.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("status");
    if (wanted && (ORDER_STATUSES as string[]).includes(wanted)) setFilter(wanted);
  }, []);

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
    // Cancelling always goes through "which items?" — it restores stock and
    // works out any refund, which a plain status change does not.
    if (status === "cancelled") {
      if (order.order_status !== "cancelled") setCancelOrderId(order.id);
      return;
    }
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
      if (error instanceof TrackingSyncError) {
        toast.warning(`${order.order_number} → ${status}, but the customer tracking page did not update. Try again in a moment.`);
        return;
      }
      console.error(error);
      toast.error(`Could not update the order status: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      setBusyId(null);
    }
  };

  const markRefunded = async (order: Order) => {
    setBusyId(order.id);
    try {
      const now = new Date().toISOString();
      const remaining = (order.items ?? []).some((item) => !item.cancelled);
      await updateValue(["orders", order.id], {
        refund_due: 0,
        // A fully cancelled, fully refunded order is "refunded"; a part-refund
        // leaves the rest of the order paid.
        ...(remaining ? {} : { payment_status: "refunded" }),
        status_history: [
          ...(Array.isArray(order.status_history) ? order.status_history : []),
          { status: order.order_status, at: now, note: `Refund of ${formatPrice(order.refund_due ?? 0)} completed` },
        ],
        updated_at: now,
      });
      toast.success("Refund marked as done");
    } catch (error) {
      console.error(error);
      toast.error("Could not update the order");
    } finally {
      setBusyId(null);
    }
  };

  // With one status on screen, every order shown has the same next step, so the
  // whole batch can be moved along together — e.g. after a packing session.
  const bulkStep = filter !== "all" ? nextOrderStep(filter as OrderStatus) : null;

  const advanceAll = async () => {
    if (!bulkStep || !filtered.length) return;
    const ok = window.confirm(
      `${bulkStep.label} for all ${filtered.length} order(s) shown? Each customer gets the usual email.`,
    );
    if (!ok) return;
    setBulkBusy(true);
    let done = 0;
    for (const order of filtered) {
      try {
        const extra: { payment_status?: PaymentStatus } = {};
        if (bulkStep.status === "delivered" && order.payment_method === "cod" && order.payment_status === "pending") {
          extra.payment_status = "paid";
        }
        await updateOrderStatus(order.id, bulkStep.status, extra);
        done += 1;
      } catch (error) {
        if (error instanceof TrackingSyncError) done += 1;
        console.error(error);
      }
    }
    setBulkBusy(false);
    toast[done === filtered.length ? "success" : "error"](
      `${done} of ${filtered.length} ${filtered.length === 1 ? "order" : "orders"} updated`,
    );
  };

  const changePayment = async (order: Order, payment_status: PaymentStatus) => {
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, order.order_status, { payment_status });
      toast.success(`Payment marked ${payment_status}`);
    } catch (error) {
      if (error instanceof TrackingSyncError) {
        toast.warning(`Payment marked ${payment_status}, but the customer tracking page did not update.`);
        return;
      }
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
            {bulkStep && filtered.length > 1 && (
              <Button variant="outline" onClick={advanceAll} disabled={bulkBusy}>
                {bulkBusy ? (
                  <Spinner className="mr-1.5 h-4 w-4" />
                ) : (
                  <ChevronsRight className="mr-1.5 h-4 w-4" />
                )}
                {bulkStep.label} — all {filtered.length}
              </Button>
            )}
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
            <SealLoader size={40} showLabel={false} />
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
                      {busyId === order.id && <Spinner className="h-3.5 w-3.5 text-muted-foreground" />}
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
                    {order.client_written && (
                      <span
                        className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                        title="This order was written by the customer's browser because the server could not write it. Compare the item prices and total with the catalogue before dispatch."
                      >
                        Total not verified — check prices
                      </span>
                    )}
                    {(order.refund_due ?? 0) > 0 && (
                      <>
                        <span
                          className="rounded-md border border-rose/40 bg-rose/10 px-2 py-1 text-xs font-medium text-foreground"
                          title="Cancelled items on a paid order. Refund this amount from the Razorpay dashboard (or by UPI/cash), then mark it done."
                        >
                          Refund due {formatPrice(order.refund_due ?? 0)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 text-xs"
                          onClick={() => markRefunded(order)}
                          disabled={busyId === order.id}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" /> Refund done
                        </Button>
                      </>
                    )}
                    {(() => {
                      const step = nextOrderStep(order.order_status);
                      return step ? (
                        <Button
                          size="sm"
                          className="h-9 text-xs"
                          onClick={() => changeStatus(order, step.status)}
                          disabled={busyId === order.id || bulkBusy}
                        >
                          <ChevronsRight className="mr-1 h-3.5 w-3.5" /> {step.label}
                        </Button>
                      ) : null;
                    })()}
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
                    <Button variant="outline" size="sm" onClick={() => setBillOrder(order)}>
                      <FileText className="mr-1.5 h-3.5 w-3.5" /> Bill
                    </Button>
                    {order.order_status !== "cancelled" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 text-xs text-destructive hover:text-destructive"
                        onClick={() => setCancelOrderId(order.id)}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" /> Cancel items
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
                      <div
                        key={`${item.productId}-${index}`}
                        className={`flex items-center justify-between text-sm ${item.cancelled ? "text-muted-foreground line-through" : ""}`}
                      >
                        <span className="text-muted-foreground">
                          {item.name} ({item.size}{item.color ? `, ${item.color}` : ""}) × {item.quantity}
                          {item.cancelled ? " — cancelled" : ""}
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

        {/* The bill is issued for every order; a receipt is added only when the
            payment was made online and has settled. */}
        <CancelOrderDialog order={cancelOrder} onClose={() => setCancelOrderId(null)} />
        <BillDialog
          order={billOrder ? toBillOrder(billOrder) : null}
          open={Boolean(billOrder)}
          onOpenChange={(open) => {
            if (!open) setBillOrder(null);
          }}
        />
      </main>
    </div>
  );
}
