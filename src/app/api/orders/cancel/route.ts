/**
 * Cancel an order, or some of its items.
 *
 * POST /api/orders/cancel  { orderId, itemIndexes?: number[], reason?, restock? }
 *
 * Admins can cancel any items at any stage. A signed-in customer can cancel
 * their own whole order while it is still "placed" or "confirmed" — once it
 * is packed it can no longer be cancelled, only returned after delivery.
 *
 * Cancelling touches money and stock, so it is done here on the server rather
 * than from the browser:
 *
 *  · The chosen lines are marked cancelled. If every line is now cancelled the
 *    order itself becomes "cancelled"; otherwise the order carries on with the
 *    remaining items and its totals are recalculated.
 *  · On a paid order the amount owed back to the customer is recorded as
 *    `refund_due`. The refund itself is made by the owner (Razorpay dashboard,
 *    UPI or cash) and then ticked off in the admin — this route moves no money.
 *  · Stock that the order took is put back, unless `restock` is false (for
 *    goods that are damaged or will not return to the shelf).
 *  · A fully cancelled order gives its coupon back, so the customer can use it
 *    on their next order.
 *  · The customer is emailed what was cancelled.
 */
import { itemsCancelledEmail, orderStatusEmail, ownerCustomerCancelledEmail, toEmailOrder } from "@/lib/server/email-templates";
import { crossOriginResponse, isSameOrigin, rateLimit, tooManyRequestsResponse } from "@/lib/server/http";
import { canCustomerCancel } from "@/lib/orders";
import { callerFrom } from "@/lib/server/id-token";
import {
  adminAdjustNumber,
  adminDelete,
  adminGet,
  adminUpdate,
  isSecureCheckout,
} from "@/lib/server/rtdb-admin";
import { isMailConfigured, mailSender, sendMail } from "@/lib/server/smtp";
import { cancellationMoney } from "@/lib/cancellation";
import type { Order, OrderStatusEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
// `node:tls` powers the SMTP connection, so this route must not run on Edge.
export const runtime = "nodejs";

const json = (data: unknown, status = 200) => Response.json(data, { status });

type Body = { orderId?: unknown; itemIndexes?: unknown; reason?: unknown; restock?: unknown };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse();
  if (!isSecureCheckout()) {
    return json(
      { ok: false, code: "not-configured", error: "The server credentials (FIREBASE_SERVICE_ACCOUNT) are not set up yet." },
      503,
    );
  }

  const caller = await callerFrom(request);
  if (!caller) return json({ ok: false, error: "Sign in required." }, 401);

  const body = (await request.json().catch(() => null)) as Body | null;
  const orderId = String(body?.orderId ?? "").trim();
  const reason = String(body?.reason ?? "").trim().slice(0, 300) || null;
  let restock = body?.restock !== false;
  let wanted = Array.isArray(body?.itemIndexes)
    ? Array.from(new Set(body.itemIndexes.map((value) => Math.floor(Number(value))))).filter(
        (value) => Number.isFinite(value) && value >= 0,
      )
    : [];

  if (!/^[A-Za-z0-9_-]{1,120}$/.test(orderId)) return json({ ok: false, error: "Unknown order." }, 400);
  try {
    const isAdmin = Boolean(await adminGet<unknown>(`admins/${caller.uid}`));
    if (!isAdmin) {
      const gate = await rateLimit(`cancel:${caller.uid}`, 5, 60 * 60 * 1000);
      if (!gate.ok) return tooManyRequestsResponse(gate.retryAfter);
    }

    const order = await adminGet<Order>(`orders/${orderId}`);
    // A customer is told "not found" for anyone else's order, never "not yours".
    if (!order || (!isAdmin && order.user_id !== caller.uid)) {
      return json({ ok: false, error: "Order not found." }, 404);
    }
    if (order.order_status === "cancelled") {
      return json({ ok: false, error: "This order is already cancelled." }, 409);
    }

    const items = Array.isArray(order.items) ? order.items : [];
    if (!isAdmin) {
      if (!canCustomerCancel(order.order_status)) {
        return json(
          {
            ok: false,
            code: "too-late",
            error: "This order has already been packed, so it can no longer be cancelled. Once it arrives you can return it within the return window.",
          },
          409,
        );
      }
      // Customers cancel the whole order; picking single items is for the store.
      wanted = items.map((item, index) => (item && !item.cancelled ? index : -1)).filter((index) => index >= 0);
      restock = true;
    }
    if (!wanted.length) return json({ ok: false, error: "Choose at least one item to cancel." }, 400);

    const toCancel = wanted.filter((index) => items[index] && !items[index].cancelled);
    if (!toCancel.length || toCancel.length !== wanted.length) {
      return json({ ok: false, error: "Those items are no longer available to cancel. Refresh and try again." }, 409);
    }

    const iso = new Date().toISOString();
    const cancelledNow = toCancel.map((index) => items[index]);
    const nextItems = items.map((item, index) =>
      toCancel.includes(index) ? { ...item, cancelled: true, cancelled_at: iso } : item,
    );
    const remaining = nextItems.filter((item) => !item.cancelled);
    const fullCancel = remaining.length === 0;
    const wasPaid = order.payment_status === "paid";
    const names = cancelledNow.map((item) => `${item.name} × ${item.quantity}`).join(", ");

    // ── Money ───────────────────────────────────────────────────────────────
    // See src/lib/cancellation.ts (shared with the tests).
    const money = cancellationMoney(order, cancelledNow, remaining.length);
    const { subtotal, discount, taxableBase, tax } = money;
    const newTotal = money.total;
    const oldTotal = Math.max(0, Number(order.total) || 0);
    const refundNow = money.refund;
    const refundDue = Math.max(0, Number(order.refund_due) || 0) + (wasPaid ? refundNow : 0);

    const history: OrderStatusEvent[] = [
      ...(Array.isArray(order.status_history) ? order.status_history : []),
      {
        status: fullCancel ? "cancelled" : order.order_status,
        at: iso,
        note: `${fullCancel ? "Order cancelled" : "Items cancelled"}${isAdmin ? "" : " by the customer"}: ${names}${reason ? ` — ${reason}` : ""}`,
      },
    ];

    const patch: Record<string, unknown> = {
      items: nextItems,
      status_history: history,
      updated_at: iso,
      ...(reason ? { cancel_reason: reason } : {}),
      ...(wasPaid ? { refund_due: refundDue } : {}),
      ...(fullCancel
        ? { order_status: "cancelled", cancelled_at: iso }
        : { subtotal, discount, taxable_base: taxableBase, tax, total: newTotal }),
    };
    await adminUpdate(`orders/${orderId}`, patch);

    // From here the order is updated; the rest must not fail the request.
    const step = async (label: string, work: () => Promise<unknown>) => {
      try {
        await work();
      } catch (error) {
        console.error(`Cancel ${order.order_number}: ${label} failed:`, error);
      }
    };

    await step("tracking record", () =>
      adminUpdate(`tracking/${order.order_number}`, {
        order_status: fullCancel ? "cancelled" : order.order_status,
        status_history: history,
        total: fullCancel ? oldTotal : newTotal,
        updated_at: iso,
      }),
    );

    // Put the stock back — only stock this order actually took.
    if (restock && order.stock_decremented) {
      for (const item of cancelledNow) {
        if (!item.productId) continue;
        await step(`stock for ${item.productId}`, () =>
          adminAdjustNumber(`products/${item.productId}/stock`, item.quantity),
        );
      }
    }
    for (const item of cancelledNow) {
      if (!item.productId) continue;
      await step(`sales count for ${item.productId}`, () =>
        adminAdjustNumber(`products/${item.productId}/sold_count`, -item.quantity),
      );
    }

    // A fully cancelled order did not really use its coupon.
    if (fullCancel && order.coupon_code && order.user_id) {
      const code = order.coupon_code;
      await step("coupon release", async () => {
        await adminDelete(`couponRedemptions/${code}/${order.user_id}`);
        await adminDelete(`userCoupons/${order.user_id}/${code}`);
        const phone10 = String(order.phone ?? "").replace(/\D/g, "").slice(-10);
        if (phone10.length === 10) await adminDelete(`couponRedemptionsByPhone/${code}/${phone10}`);
        await adminAdjustNumber(`coupons/${code}/used_count`, -1);
      });
    }

    const updated: Order = { ...order, ...(patch as Partial<Order>), id: orderId };
    if (order.email && isMailConfigured()) {
      await step("customer email", async () => {
        const refundLine = wasPaid && refundNow > 0 ? refundNow : 0;
        const mail = fullCancel
          ? orderStatusEmail(toEmailOrder({ ...updated, items }), "cancelled")
          : itemsCancelledEmail({
              order: toEmailOrder(updated),
              cancelled: cancelledNow.map((item) => ({
                name: item.name,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                price: item.price,
              })),
              refund: refundLine,
              reason,
            });
        const sent = await sendMail({ to: order.email as string, ...mail });
        if (!sent.ok) throw new Error(sent.error || "mail not sent");
      });
    }

    if (!isAdmin && isMailConfigured() && mailSender()) {
      await step("store notification", async () => {
        const mail = ownerCustomerCancelledEmail({
          order: toEmailOrder({ ...updated, items }),
          reason,
          refund: wasPaid ? refundNow : 0,
        });
        const sent = await sendMail({ to: mailSender(), ...mail });
        if (!sent.ok) throw new Error(sent.error || "mail not sent");
      });
    }

    return json({
      ok: true,
      fullCancel,
      cancelled: cancelledNow.length,
      refundDue: wasPaid ? refundNow : 0,
      newTotal: fullCancel ? oldTotal : newTotal,
    });
  } catch (error) {
    console.error("Order cancellation failed:", error);
    return json({ ok: false, error: "Could not cancel. Nothing was changed — please try again." }, 500);
  }
}
