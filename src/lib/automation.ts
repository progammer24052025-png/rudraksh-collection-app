/**
 * What the store does on its own, so one person can run it.
 *
 * Every automation has a switch in Admin → Settings → Automation, and every
 * automated step can still be done (or undone) by hand from the admin screens.
 * The defaults below apply until the owner changes them.
 */
import type { OrderStatus, StoreSettings } from "./types";

export type Automation = {
  /** COD orders start as "confirmed" instead of waiting to be confirmed by hand. */
  autoConfirmCod: boolean;
  /** Email the store's own mailbox whenever an order comes in. */
  ownerOrderEmail: boolean;
  /** One morning email listing what needs doing today. */
  dailyDigest: boolean;
  /** Ask for a review in the "delivered" email. */
  reviewRequest: boolean;
  /** Email subscribed customers when new products are added (one email a day at most). */
  newProductEmails: boolean;
  /** Stock at or below this counts as low in the dashboard and the digest. */
  lowStockThreshold: number;
};

export const AUTOMATION_DEFAULTS: Automation = {
  autoConfirmCod: false,
  ownerOrderEmail: true,
  dailyDigest: true,
  reviewRequest: true,
  newProductEmails: true,
  lowStockThreshold: 3,
};

export function resolveAutomation(settings?: Pick<StoreSettings, "automation"> | null): Automation {
  const saved = settings?.automation ?? {};
  const threshold = Number(saved.lowStockThreshold);
  return {
    autoConfirmCod: saved.autoConfirmCod ?? AUTOMATION_DEFAULTS.autoConfirmCod,
    ownerOrderEmail: saved.ownerOrderEmail ?? AUTOMATION_DEFAULTS.ownerOrderEmail,
    dailyDigest: saved.dailyDigest ?? AUTOMATION_DEFAULTS.dailyDigest,
    reviewRequest: saved.reviewRequest ?? AUTOMATION_DEFAULTS.reviewRequest,
    newProductEmails: saved.newProductEmails ?? AUTOMATION_DEFAULTS.newProductEmails,
    lowStockThreshold:
      Number.isFinite(threshold) && threshold >= 0
        ? Math.min(100, Math.floor(threshold))
        : AUTOMATION_DEFAULTS.lowStockThreshold,
  };
}

/** The step that normally follows each status — what the one-click button does. */
const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  placed: { status: "confirmed", label: "Confirm order" },
  confirmed: { status: "packed", label: "Mark packed" },
  packed: { status: "shipped", label: "Mark shipped" },
  shipped: { status: "delivered", label: "Mark delivered" },
};

export const nextOrderStep = (status: OrderStatus) => NEXT_STEP[status] ?? null;

/** A shipped order this old with no delivery update is worth a look. */
export const SHIPPED_FOLLOW_UP_DAYS = 7;
