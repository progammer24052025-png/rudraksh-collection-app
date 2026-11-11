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
  /** Present for stored orders; lets the delivered email link to the product. */
  productId?: string | null;
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
  tax?: number;
  tax_rate?: number;
  shipping?: number;
  total: number;
  payment_method?: "cod" | "razorpay" | null;
  payment_status?: string | null;
  razorpay_payment_id?: string | null;
  order_status?: OrderStatus;
  created_at?: string | null;
};

/**
 * A receipt is proof money moved. Cash on delivery has none, so every
 * "paid" block in these emails goes through this check first.
 */
const isPaidOnline = (order: EmailOrder) =>
  order.payment_method === "razorpay" && order.payment_status === "paid";

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

/**
 * The first word of a name, for greetings. Customers choose their own name and
 * it lands in the HTML of store-branded emails (sometimes sent to an address
 * somebody else typed), so anything that could form a tag, an entity or a link
 * is removed rather than trusted.
 */
const firstName = (name?: string | null) => {
  const trimmed = (name ?? "").replace(/[<>&"'`\/:@=()\[\]{}]/g, " ").trim();
  return trimmed ? trimmed.split(/\s+/)[0].slice(0, 40) : "";
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
  if (order.tax) {
    rows.push(line(`GST${order.tax_rate ? ` ${order.tax_rate}%` : ""}`, money(order.tax)));
  }
  if (typeof order.shipping === "number") {
    rows.push(line("Delivery", order.shipping > 0 ? money(order.shipping) : "Free"));
  }
  rows.push(line("Total", money(order.total), true));

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 0;">${rows.join("")}</table>`;
}

/** Shown only when the payment settled online. Empty string otherwise. */
function receiptBlock(order: EmailOrder): string {
  if (!isPaidOnline(order)) return "";

  const rows: Array<[string, string]> = [
    ["Payment received", money(order.total)],
    ["Method", "Razorpay (online)"],
  ];
  if (order.razorpay_payment_id) rows.push(["Reference", order.razorpay_payment_id]);

  return `<div style="margin:16px 0 0;padding:14px 16px;background:${CREAM};border:1px solid ${LINE};border-radius:12px;">
    <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${ROSE};margin-bottom:6px;">Payment receipt</div>
    ${rows
      .map(
        ([label, value]) =>
          `<div style="display:flex;justify-content:space-between;font-size:13px;line-height:1.8;color:${INK};"><span style="color:${MUTED};">${escape(label)}</span><span>${escape(value)}</span></div>`,
      )
      .join("")}
  </div>`;
}

/**
 * What the customer still owes. Cash orders get this instead of a receipt, so
 * the email can never imply the money has been collected.
 */
function paymentNote(order: EmailOrder): string {
  if (isPaidOnline(order)) return "";
  if (order.payment_method !== "cod") return "";

  return `<p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:${MUTED};">
    Pay ${money(order.total)} to the delivery partner. This email is your bill, not proof of payment
    — no receipt is issued for a cash on delivery order.
  </p>`;
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
      ? order.items.filter((item) => item && !item.cancelled).map((item) => ({
          productId: item.productId,
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
    tax: order.tax,
    tax_rate: order.tax_rate,
    shipping: order.shipping,
    total: order.total,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    razorpay_payment_id: order.razorpay_payment_id,
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

export function backInStockEmail(product: {
  name: string;
  slug?: string;
  id: string;
  price: number;
  sale_price?: number | null;
}): MailContent {
  const price =
    typeof product.sale_price === "number" && product.sale_price > 0 && product.sale_price < product.price
      ? product.sale_price
      : product.price;
  const url = `${siteUrl}/products/${encodeURIComponent(product.slug || product.id)}`;

  const blocks = `<div style="margin:16px 0 0;padding:14px 16px;background:${CREAM};border-radius:12px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${INK};">${escape(product.name)}</div>
      <div style="margin-top:4px;font-size:14px;color:${MUTED};">${money(price)}</div>
    </div>`;

  return {
    subject: `Back in stock: ${product.name}`,
    html: layout({
      preheader: `${product.name} is available again.`,
      heading: "It is back in stock",
      intro: "Hello, you asked us to tell you when this was available again. It is back on the shelf now:",
      blocks,
      cta: { label: "View the product", href: url },
      closing: "Stock is limited, so it may sell out again. This is the only email you will get about this item.",
    }),
    text: [
      "Hello,",
      "",
      "You asked us to tell you when this was available again. It is back in stock now:",
      "",
      `${product.name} - ${money(price)}`,
      url,
      "",
      "This is the only email you will get about this item.",
      "",
      `${storeConfig.name} · ${storeConfig.location}`,
    ].join("\n"),
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
    ${receiptBlock(order)}
    ${paymentNote(order)}
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

export function loginAlertEmail(input: {
  name?: string | null;
  email: string;
  method: string;
  ip?: string | null;
  userAgent?: string | null;
}): MailContent {
  const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const device = input.userAgent
    ? input.userAgent.length > 80
      ? input.userAgent.slice(0, 80) + "…"
      : input.userAgent
    : "Unknown device";

  const blocks = `<div style="margin:18px 0 0;padding:16px 18px;background:${CREAM};border-radius:12px;">
      <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${ROSE};margin-bottom:8px;">Sign-in details</div>
      <div style="font-size:13px;line-height:1.9;color:${INK};">
        <strong>When:</strong> ${escape(when)} IST<br />
        <strong>Method:</strong> ${escape(input.method)}<br />
        <strong>IP address:</strong> ${escape(input.ip || "Unknown")}<br />
        <strong>Device:</strong> ${escape(device)}
      </div>
    </div>`;

  const text = [
    greeting(input.name),
    "",
    `We noticed a new sign-in to your ${storeConfig.name} account.`,
    "",
    `When: ${when} IST`,
    `Method: ${input.method}`,
    `IP: ${input.ip || "Unknown"}`,
    `Device: ${device}`,
    "",
    "If this was you, no action is needed.",
    "If you did not sign in, please change your password immediately or contact us.",
    "",
    `${storeConfig.name} · ${storeConfig.location}`,
    storeConfig.email,
  ].join("\n");

  return {
    subject: `New sign-in to your ${storeConfig.name} account`,
    html: layout({
      preheader: `New sign-in detected on your ${storeConfig.name} account.`,
      heading: "New sign-in detected",
      intro: `${greeting(input.name)} we noticed a new sign-in to your ${storeConfig.name} account. Here are the details:`,
      blocks,
      closing: "If this was you, no action is needed. If you did not sign in, please change your password immediately or contact us.",
    }),
    text,
  };
}

/** "How was it?" links for a delivered order — one per distinct product. */
function reviewLinks(order: EmailOrder): Array<{ name: string; url: string }> {
  const seen = new Set<string>();
  const links: Array<{ name: string; url: string }> = [];
  for (const item of order.items ?? []) {
    if (!item.productId || seen.has(item.productId)) continue;
    seen.add(item.productId);
    links.push({
      name: item.name,
      url: `${siteUrl}/products/${encodeURIComponent(item.productId)}#reviews-heading`,
    });
  }
  return links.slice(0, 6);
}

export function orderStatusEmail(
  order: EmailOrder,
  status: OrderStatus,
  options: { reviewRequest?: boolean } = {},
): MailContent {
  const copy = STATUS_COPY[status] ?? STATUS_COPY.placed;
  const reviews = status === "delivered" && options.reviewRequest ? reviewLinks(order) : [];
  const reviewBlock = reviews.length
    ? `<div style="margin:20px 0 0;padding:14px 16px;border:1px solid ${LINE};border-radius:12px;">
        <div style="font-size:14px;font-weight:600;color:${INK};">How was it?</div>
        <div style="margin-top:4px;font-size:13px;line-height:1.6;color:${MUTED};">A short review helps other parents choose. It takes a minute:</div>
        ${reviews
          .map(
            (link) =>
              `<div style="margin-top:8px;font-size:13px;"><a href="${link.url}" style="color:${INK};font-weight:600;">Review ${escape(link.name)}</a></div>`,
          )
          .join("")}
      </div>`
    : "";

  const blocks = `
    <div style="margin:16px 0 0;padding:14px 16px;background:${CREAM};border-radius:12px;">
      <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${ROSE};margin-bottom:4px;">Order</div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${INK};">${escape(order.order_number)}</div>
      <div style="margin-top:4px;font-size:12px;color:${MUTED};">${money(order.total)} · ${paymentLabel(order)}</div>
    </div>
    ${order.items?.length ? itemsTable(order.items) : ""}
    <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:${MUTED};">
      To follow your parcel, open the tracking page and enter this order number with the last four digits of your phone number.
    </p>
    ${reviewBlock}`;

  const text = [
    greeting(order.customer_name),
    "",
    `${copy.heading}: order ${order.order_number} (${money(order.total)}).`,
    "",
    copy.intro,
    "",
    `Track your order: ${trackUrl}`,
    ...(reviews.length
      ? ["", "How was it? A short review helps other parents choose:", ...reviews.map((link) => `- ${link.name}: ${link.url}`)]
      : []),
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

// ── Mail to the store itself ────────────────────────────────────────────────

const adminUrl = (path: string) => `${siteUrl}${path}`;

/** "You have a new order" — sent to the store's own mailbox. */
export function ownerNewOrderEmail(order: EmailOrder): MailContent {
  const paid = order.payment_status === "paid";
  const payment = order.payment_method === "cod" ? "Cash on delivery — collect on delivery" : paid ? "Paid online" : "Online payment pending";
  const address = [order.address, [order.city, order.state].filter(Boolean).join(", "), order.pincode ? `PIN ${order.pincode}` : null]
    .filter(Boolean)
    .join(", ");

  const blocks = `
    <div style="margin:16px 0 0;padding:14px 16px;background:${CREAM};border-radius:12px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${INK};">${escape(order.order_number)} · ${money(order.total)}</div>
      <div style="margin-top:4px;font-size:13px;color:${MUTED};">${escape(payment)}</div>
    </div>
    ${order.items?.length ? itemsTable(order.items) : ""}
    <div style="margin:18px 0 0;font-size:13px;line-height:1.7;color:${INK};">
      <strong>${escape(order.customer_name || "Customer")}</strong>${order.phone ? ` · ${escape(order.phone)}` : ""}<br />
      ${escape(address)}
    </div>`;

  const lines = (order.items ?? []).map(
    (item) => `- ${item.name}${item.size ? ` (${item.size}${item.color ? `, ${item.color}` : ""})` : ""} x ${item.quantity}`,
  );

  return {
    subject: `New order ${order.order_number} — ${money(order.total)}${order.payment_method === "cod" ? " (COD)" : paid ? " (paid)" : ""}`,
    html: layout({
      preheader: `${order.customer_name || "A customer"} ordered ${money(order.total)}.`,
      heading: "New order received",
      intro: "A customer has just placed an order. Here is what to pack:",
      blocks,
      cta: { label: "Open orders", href: adminUrl("/admin/orders") },
    }),
    text: [
      `New order ${order.order_number} — ${money(order.total)}`,
      payment,
      "",
      ...lines,
      "",
      `${order.customer_name || "Customer"}${order.phone ? ` · ${order.phone}` : ""}`,
      address,
      "",
      `Open orders: ${adminUrl("/admin/orders")}`,
    ].join("\n"),
  };
}

export type DigestSection = { title: string; lines: string[]; href: string };

/** The morning "what needs doing today" email for the store. */
export function dailyDigestEmail(input: {
  date: string;
  headline: string;
  sections: DigestSection[];
}): MailContent {
  const blocks = input.sections
    .map(
      (section) => `<div style="margin:16px 0 0;padding:14px 16px;background:${CREAM};border-radius:12px;">
        <div style="font-size:14px;font-weight:600;color:${INK};"><a href="${adminUrl(section.href)}" style="color:${INK};text-decoration:none;">${escape(section.title)}</a></div>
        ${section.lines
          .map((line) => `<div style="margin-top:5px;font-size:13px;line-height:1.55;color:${MUTED};">${escape(line)}</div>`)
          .join("")}
      </div>`,
    )
    .join("");

  return {
    subject: `${storeConfig.name}: ${input.headline}`,
    html: layout({
      preheader: input.headline,
      heading: `Today at the store`,
      intro: `${escape(input.date)} — ${escape(input.headline)}.`,
      blocks,
      cta: { label: "Open dashboard", href: adminUrl("/admin/dashboard") },
      closing: "You can switch this summary off in Admin → Settings → Automation.",
    }),
    text: [
      `${input.date} — ${input.headline}`,
      "",
      ...input.sections.flatMap((section) => [section.title, ...section.lines.map((line) => `  ${line}`), ""]),
      `Dashboard: ${adminUrl("/admin/dashboard")}`,
    ].join("\n"),
  };
}

// ── New arrivals (to customers) ─────────────────────────────────────────────

export function newArrivalsEmail(input: {
  name?: string | null;
  products: Array<{
    id: string;
    slug?: string;
    name: string;
    brand_name?: string;
    price: number;
    sale_price?: number | null;
    images?: string[];
  }>;
  /** New products not shown in this email. */
  moreCount: number;
  unsubscribeUrl: string;
}): MailContent {
  const priceOf = (product: { price: number; sale_price?: number | null }) =>
    typeof product.sale_price === "number" && product.sale_price > 0 && product.sale_price < product.price
      ? product.sale_price
      : product.price;
  const urlOf = (product: { id: string; slug?: string }) =>
    `${siteUrl}/products/${encodeURIComponent(product.slug || product.id)}`;
  // Photos stored inline in the database cannot be linked from an email.
  const photoOf = (product: { images?: string[] }) =>
    (product.images ?? []).find((image) => /^https:\/\//.test(image)) ?? null;

  const cards = input.products
    .map((product) => {
      const photo = photoOf(product);
      const onSale = priceOf(product) < product.price;
      return `<tr>
        <td style="padding:10px 0;border-top:1px solid ${LINE};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            ${photo ? `<td width="76" valign="top" style="padding-right:14px;"><a href="${urlOf(product)}"><img src="${escape(photo)}" width="76" height="96" alt="" style="display:block;width:76px;height:96px;object-fit:cover;border-radius:8px;border:0;" /></a></td>` : ""}
            <td valign="middle">
              ${product.brand_name ? `<div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${ROSE};">${escape(product.brand_name)}</div>` : ""}
              <a href="${urlOf(product)}" style="display:block;margin-top:2px;font-size:15px;line-height:1.4;color:${INK};font-weight:600;text-decoration:none;">${escape(product.name)}</a>
              <div style="margin-top:4px;font-size:14px;color:${INK};">${money(priceOf(product))}${onSale ? ` <span style="color:${MUTED};text-decoration:line-through;font-size:13px;">${money(product.price)}</span>` : ""}</div>
            </td>
          </tr></table>
        </td>
      </tr>`;
    })
    .join("");

  const count = input.products.length + input.moreCount;
  const heading = count === 1 ? "Something new just arrived" : `${count} new arrivals`;
  const blocks = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">${cards}</table>
    ${input.moreCount > 0 ? `<p style="margin:14px 0 0;font-size:13px;color:${MUTED};">…and ${input.moreCount} more in the shop.</p>` : ""}
    <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:${MUTED};">
      You are getting this because you have an account with ${escape(storeConfig.name)}.
      <a href="${input.unsubscribeUrl}" style="color:${MUTED};">Unsubscribe from new-arrival emails</a>, or change it in your account settings.
    </p>`;

  return {
    subject: count === 1 ? `New at ${storeConfig.name}: ${input.products[0].name}` : `${count} new arrivals at ${storeConfig.name}`,
    html: layout({
      preheader: input.products.map((product) => product.name).slice(0, 3).join(", "),
      heading,
      intro: `${greeting(input.name)} we have just added ${count === 1 ? "a new piece" : "new pieces"} to the shop:`,
      blocks,
      cta: { label: "See what is new", href: `${siteUrl}/products` },
    }),
    text: [
      greeting(input.name),
      "",
      `${heading} at ${storeConfig.name}:`,
      "",
      ...input.products.map((product) => `- ${product.name} — ${money(priceOf(product))}\n  ${urlOf(product)}`),
      ...(input.moreCount > 0 ? ["", `...and ${input.moreCount} more: ${siteUrl}/products`] : []),
      "",
      `Unsubscribe from new-arrival emails: ${input.unsubscribeUrl}`,
      "",
      `${storeConfig.name} · ${storeConfig.location}`,
    ].join("\n"),
  };
}

// ── Some items cancelled (to the customer) ──────────────────────────────────

export function itemsCancelledEmail(input: {
  order: EmailOrder;
  cancelled: EmailOrderItem[];
  /** Rupees being refunded; 0 when nothing was paid. */
  refund: number;
  reason?: string | null;
}): MailContent {
  const { order, cancelled } = input;
  const refundText = input.refund > 0
    ? `${money(input.refund)} will be refunded to your original payment method. Refunds usually take 5–7 working days to appear.`
    : "You had not paid for these items, so there is nothing to refund.";

  const blocks = `
    <div style="margin:16px 0 0;padding:14px 16px;background:${CREAM};border-radius:12px;">
      <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${ROSE};margin-bottom:4px;">Order</div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${INK};">${escape(order.order_number)}</div>
      <div style="margin-top:4px;font-size:12px;color:${MUTED};">New total ${money(order.total)}</div>
    </div>
    <p style="margin:18px 0 6px;font-size:13px;font-weight:600;color:${INK};">Cancelled</p>
    ${itemsTable(cancelled)}
    ${input.reason ? `<p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${MUTED};">Reason: ${escape(input.reason)}</p>` : ""}
    <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:${MUTED};">${escape(refundText)}</p>
    ${order.items?.length ? `<p style="margin:18px 0 6px;font-size:13px;font-weight:600;color:${INK};">Still on your order</p>${itemsTable(order.items)}` : ""}`;

  return {
    subject: `Update to your order ${order.order_number}: some items cancelled`,
    html: layout({
      preheader: `${cancelled.length} item${cancelled.length === 1 ? "" : "s"} cancelled on order ${order.order_number}.`,
      heading: "Some items were cancelled",
      intro: `${greeting(order.customer_name)} part of your order could not be fulfilled, so we have cancelled the items below. The rest of your order is going ahead.`,
      blocks,
      cta: { label: "Track your order", href: trackUrl },
      closing: "We are sorry for the inconvenience. Reply to this email if anything looks wrong.",
    }),
    text: [
      greeting(order.customer_name),
      "",
      `Some items on order ${order.order_number} were cancelled:`,
      ...cancelled.map((item) => `- ${item.name} x ${item.quantity}`),
      ...(input.reason ? ["", `Reason: ${input.reason}`] : []),
      "",
      refundText,
      "",
      `New order total: ${money(order.total)}`,
      `Track your order: ${trackUrl}`,
      "",
      `${storeConfig.name} · ${storeConfig.location}`,
    ].join("\n"),
  };
}
