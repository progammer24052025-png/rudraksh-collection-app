import type { OrderStatus, PaymentStatus } from "./types";

export const ORDER_STATUSES: OrderStatus[] = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

export const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];

export const ORDER_TIMELINE: OrderStatus[] = ["placed", "confirmed", "packed", "shipped", "delivered"];

const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  placed: { label: "Placed", className: "bg-muted text-muted-foreground" },
  confirmed: { label: "Confirmed", className: "bg-amber-100 text-amber-700" },
  packed: { label: "Packed", className: "bg-amber-100 text-amber-700" },
  shipped: { label: "Shipped", className: "bg-blue-100 text-blue-700" },
  delivered: { label: "Delivered", className: "bg-sage/10 text-sage" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
};

export const statusLabel = (status: OrderStatus) =>
  STATUS_META[status] ?? { label: status, className: "bg-muted text-muted-foreground" };

export const paymentLabel = (status: PaymentStatus) => {
  switch (status) {
    case "paid":
      return { label: "Paid", className: "bg-sage/10 text-sage" };
    case "failed":
      return { label: "Failed", className: "bg-destructive/10 text-destructive" };
    case "refunded":
      return { label: "Refunded", className: "bg-blue-100 text-blue-700" };
    default:
      return { label: "Pending", className: "bg-muted text-muted-foreground" };
  }
};
