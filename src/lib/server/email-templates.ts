/**
 * Transactional email bodies, styled to match the storefront: warm cream
 * paper, ink text and the dusty-rose accent from globals.css.
 *
 * Everything here is inline-styled table markup because that is the only
 * layout model Outlook and Gmail agree on. No external images, no invented
 * facts — amounts and copy come from the order itself and from config.ts.
 */

import { siteUrl, storeConfig } from "@/lib/config";
import type { Order, OrderStatus } from "@/lib/types";

export type MailContent = { subject: string; html: string; text: string };

export type EmailOrderItem = {
  name: string;
  brand?: string | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
  price: number;
};

export type EmailOrder = {
  order_number: string;
  customer_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  items?: EmailOrderItem[];
  subtotal?: number;
  discount?: number;
  shipping?: number;
  total: number;
  payment_method?: "cod" | "razorpay" | null;
  order_status?: OrderStatus;
  created_at?: string | null;
};

const INK = "#2D2A26";
const CREAM = "#FAF7F2";
const CARD = "#FFFFFF";
const ROSE = "#C28585";
const MUTED = "#6B6560";
const LINE = "#EAE3D9";

const trackUrl = `${siteUrl}/track-order`;

/** Rupee amounts, grouped the Indian way: ₹1,348. */
const money = (value: number | undefined) =>
  `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const firstName = (name?: string | null) => {
  const trimmed = (name ?? "").trim();
  return trimmed ? trimmed.split(/\s+/)[0] : "";
};

const greeting = (name?: string | null) => {
  const first = firstName(name);
  return first ? `Hi ${first},` : "Hello,";
};

const paymentLabel = (order: EmailOrder) =>
  order.payment_method === "cod" ? "Cash on delivery" : "Online payment";

/** Shared frame: cream page, white card, rose rule under the wordmark. */
function layout(options: {
  preheader: string;
  heading: string;
  intro: string;
  blocks?: string;
  cta?: { label: string; href: string };
  closing?: string;
}): string {
  const cta = options.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 4px;">
         <tr><td style="border-radius:10px;background:${INK};">
           <a href="${options.cta.href}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:${CREAM};text-decoration:none;letter-spacing:0.2px;">${escape(options.cta.label)}</a>
         </td></tr>
       </table>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escape(options.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:${CREAM};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(options.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:26px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${CARD};border:1px solid ${LINE};border-radius:16px;">
            <tr>
              <td style="padding:26px 30px 0;text-align:center;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:19px;letter-spacing:1.4px;color:${INK};">${escape(storeConfig.name)}</div>
                <div style="margin-top:6px;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:${ROSE};">${escape(storeConfig.tagline)}</div>
                <div style="margin-top:16px;height:1px;background:${LINE};"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.3;font-weight:normal;color:${INK};">${escape(options.heading)}</h1>
                <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${MUTED};">${options.intro}</p>
                ${options.blocks ?? ""}
                ${options.closing ? `<p style="margin:18px 0 0;font-size:15px;line-height:1.65;color:${MUTED};">${options.closing}</p>` : ""}
                ${cta}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <div style="height:1px;background:${LINE};margin-bottom:16px;"></div>
                <p style="margin:0 0 6px;font-size:12px;line-height:1.7;color:${MUTED};">
                  Free delivery over ${money(storeConfig.freeShippingThreshold)} · ${money(storeConfig.shippingFee)} flat below that · ${storeConfig.returnWindowDays}-day returns · Cash on delivery
                </p>
                <p style="margin:0 0 6px;font-size:12px;line-height:1.7;color:${MUTED};">
                  ${escape(storeConfig.name)} · ${escape(storeConfig.location)}
                </p>
                <p style="margin:0;font-size:12px;line-height:1.7;color:${MUTED};">
                  Questions? Reply to this email or write to <a href="mailto:${storeConfig.email}" style="color:${ROSE};text-decoration:none;">${escape(storeConfig.email)}</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function itemsTable(items: EmailOrderItem[]): string {
  const rows = items
    .map((item) => {
      const meta = [item.brand, item.size ? `Size ${item.size}` : "", item.color]
        .filter(Boolean)
        .join(" · ");
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};">
          <div style="font-size:14px;color:${INK};">${escape(item.name)}${item.quantity > 1 ? ` × ${item.quantity}` : ""}</div>
          ${meta ? `<div style="margin-top:3px;font-size:12px;color:${MUTED};">${escape(meta)}</div>` : ""}
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK};white-space:nowrap;">
          ${money(item.price * item.quantity)}
        </td>
      </tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;">${rows}</table>`;
}

function totalsTable(order: EmailOrder): string {
  const rows: string[] = [];
  const line = (label: string, value: string, strong = false) =>
    `<tr>
       <td style="padding:5px 0;font-size:${strong ? "15" : "13"}px;color:${strong ? INK : MUTED};${strong ? "font-weight:600;" : ""}">${label}</td>
       <td align="right" style="padding:5px 0;font-size:${strong ? "15" : "13"}px;color:${strong ? INK : MUTED};${strong ? "font-weight:600;" : ""}">${value}</td>
     </tr>`;

  if (typeof order.subtotal === "number") rows.push(line("Subtotal", money(order.subtotal)));
  if (order.discount) rows.push(line("Discount", `− ${money(order.discount)}`));
  if (typeof order.shipping === "number") {
    rows.push(line("Delivery", order.shipping > 0 ? money(order.shipping) : "Free"));
  }
  rows.push(line("Total", money(order.total), true));

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 0;">${rows.join("")}</table>`;
}

function addressBlock(order: EmailOrder): string {
  const parts = [
    order.customer_name,
    order.address,
    [order.city, order.state].filter(Boolean).join(", "),
    order.pincode ? `PIN ${order.pincode}` : null,
    order.phone,
  ].filter(Boolean) as string[];

  if (!parts.length) return "";

  return `<div style="margin:20px 0 0;padding:14px 16px;background:${CREAM};border-radius:12px;">
    <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${ROSE};margin-bottom:6px;">Delivering to</div>
    ${parts.map((part) => `<div style="font-size:13px;line-height:1.65;color:${INK};">${escape(part)}</div>`).join("")}
  </div>`;
}

/** Converts a stored order into the slimmer shape the templates need. */
export function toEmailOrder(order: Order): EmailOrder {
  return {
    order_number: order.order_number,
    customer_name: order.customer_name,
    email: order.email,
    phone: order.phone,
    address: order.address,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          name: item.name,
          brand: item.brand,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          price: item.price,
        }))
      : [],
    subtotal: order.subtotal,
    discount: order.discount,
    shipping: order.shipping,
    total: order.total,
    payment_method: order.payment_method,
    order_status: order.order_status,
    created_at: order.created_at,
  };
}

export function welcomeEmail(input: { name?: string | null; email: string }): MailContent {
  const heading = firstName(input.name) ? `Welcome, ${firstName(input.name)}` : "Welcome to the family";

  const blocks = `<div style="margin:18px 0 0;padding:16px 18px;background:${CREAM};border-radius:12px;">
      <div style="font-size:13px;line-height:1.9;color:${INK};">
        · Your saved addresses make the next checkout one tap<br />
        · Every order and its tracking stay in your account<br />
        · We write to you only about your own orders
      </div>
    </div>`;

  const text = [
    greeting(input.name),
    "",
    `Your account at ${storeConfig.name} is ready.`,
    "",
    "- Your saved addresses make the next checkout one tap",
    "- Every order and its tracking stay in your account",
    "- We write to you only about your own orders",
    "",
    `Free delivery over ${money(storeConfig.freeShippingThreshold)}, ${money(storeConfig.shippingFee)} flat below that. ${storeConfig.returnWindowDays}-day returns. Cash on delivery available.`,
    "",
    `Start shopping: ${siteUrl}`,
    "",
    `${storeConfig.name} · ${storeConfig.location}`,
    storeConfig.email,
  ].join("\n");

  return {
    subject: `Welcome to ${storeConfig.name}`,
    html: layout({
      preheader: `Your ${storeConfig.name} account is ready.`,
      heading,
      intro: `${greeting(input.name)} your account at ${storeConfig.name} is ready — thank you for signing up. Here is what it gives you:`,
      blocks,
      cta: { label: "Start shopping", href: siteUrl },
      closing: `Anything you need, just reply to this email. We read every message.`,
    }),
    text,
  };
}

export function orderPlacedEmail(order: EmailOrder): MailContent {
  const blocks = `
    <div style="margin:16px 0 0;padding:14px 16px;background:${CREAM};border-radius:12px;">
      <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${ROSE};margin-bottom:4px;">Order</div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${INK};">${escape(order.order_number)}</div>
      <div style="margin-top:4px;font-size:12px;color:${MUTED};">${paymentLabel(order)}</div>
    </div>
    ${order.items?.length ? itemsTable(order.items) : ""}
    ${totalsTable(order)}
    ${addressBlock(order)}
    <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:${MUTED};">
      We dispatch in ${escape(storeConfig.dispatchDays)} and delivery usually takes ${escape(storeConfig.deliveryDays)}.
      You will get another email the moment your parcel ships.
    </p>`;

  const itemLines = (order.items ?? []).map(
    (item) => `- ${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ""} — ${money(item.price * item.quantity)}`,
  );

  const text = [
    greeting(order.customer_name),
    "",
    `We have your order ${order.order_number}.`,
    "",
    ...itemLines,
    "",
    `Total: ${money(order.total)} (${paymentLabel(order)})`,
    "",
    `We dispatch in ${storeConfig.dispatchDays}; delivery takes ${storeConfig.deliveryDays}.`,
    `Track it any time: ${trackUrl}`,
    "",
    `${storeConfig.name} · ${storeConfig.location}`,
    storeConfig.email,
  ].join("\n");

  return {
    subject: `Order ${order.order_number} confirmed`,
    html: layout({
      preheader: `Order ${order.order_number} is confirmed — total ${money(order.total)}.`,
      heading: "Thank you for your order",
      intro: `${greeting(order.customer_name)} we have received your order and started on it. Here is what you bought:`,
      blocks,
      cta: { label: "Track your order", href: trackUrl },
    }),
    text,
  };
}

const STATUS_COPY: Record<
  OrderStatus,
  { subject: (orderNumber: string) => string; heading: string; intro: string }
> = {
  placed: {
    subject: (n) => `Order ${n} received`,
    heading: "We have your order",
    intro: "Your order has reached us and we will confirm it shortly.",
  },
  confirmed: {
    subject: (n) => `Order ${n} confirmed`,
    heading: "Your order is confirmed",
    intro: "We have confirmed your order and will begin packing it right away.",
  },
  packed: {
    subject: (n) => `Order ${n} is packed`,
    heading: "Packed and ready to go",
    intro: "Your order is packed and waiting for our courier to pick it up.",
  },
  shipped: {
    subject: (n) => `Order ${n} is on its way`,
    heading: "Your order has shipped",
    intro: `Your parcel has left our store. Delivery usually takes ${storeConfig.deliveryDays}.`,
  },
  delivered: {
    subject: (n) => `Order ${n} delivered`,
    heading: "Delivered — we hope you love it",
    intro: `Your order has been delivered. If something is not right, you can return it within ${storeConfig.returnWindowDays} days.`,
  },
  cancelled: {
    subject: (n) => `Order ${n} cancelled`,
    heading: "Your order was cancelled",
    intro:
      "This order has been cancelled. If you paid online, the amount is refunded to the same payment method.",
  },
};

export function orderStatusEmail(order: EmailOrder, status: OrderStatus): MailContent {
  const copy = STATUS_COPY[status] ?? STATUS_COPY.placed;

  const blocks = `
    <div style="margin:16px 0 0;padding:14px 16px;background:${CREAM};border-radius:12px;">
      <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${ROSE};margin-bottom:4px;">Order</div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${INK};">${escape(order.order_number)}</div>
      <div style="margin-top:4px;font-size:12px;color:${MUTED};">${money(order.total)} · ${paymentLabel(order)}</div>
    </div>
    ${order.items?.length ? itemsTable(order.items) : ""}
    <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:${MUTED};">
      To follow your parcel, open the tracking page and enter this order number with the last four digits of your phone number.
    </p>`;

  const text = [
    greeting(order.customer_name),
    "",
    `${copy.heading}: order ${order.order_number} (${money(order.total)}).`,
    "",
    copy.intro,
    "",
    `Track your order: ${trackUrl}`,
    "",
    `${storeConfig.name} · ${storeConfig.location}`,
    storeConfig.email,
  ].join("\n");

  return {
    subject: copy.subject(order.order_number),
    html: layout({
      preheader: `${copy.heading} — order ${order.order_number}.`,
      heading: copy.heading,
      intro: `${greeting(order.customer_name)} ${copy.intro}`,
      blocks,
      cta: { label: "Track your order", href: trackUrl },
    }),
    text,
  };
}
