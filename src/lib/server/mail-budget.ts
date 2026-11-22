/**
 * How many emails the store's mailbox may still send today.
 *
 * A free Gmail mailbox sends about 500 messages a day; Brevo's free plan, 300.
 * Every email that goes out is counted here (per India date), so order emails
 * and sign-in codes always keep room, and new-arrival announcements use only
 * what is left — spreading over several days instead of being cut off.
 *
 * MAIL_DAILY_LIMIT sets the mailbox's real limit (default 450, a safe margin
 * under Gmail's 500). MAIL_RESERVE is kept free for orders and sign-in codes.
 */
import { adminAdjustNumber, adminGet, isSecureCheckout } from "@/lib/server/rtdb-admin";

const envNumber = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
};

export const dailyMailLimit = () => envNumber("MAIL_DAILY_LIMIT", 450);
export const mailReserve = () => Math.min(envNumber("MAIL_RESERVE", 150), Math.floor(dailyMailLimit() / 2));

/** Today's date in India, e.g. 2026-11-22. */
export const indiaDate = (at = Date.now()) => new Date(at + 5.5 * 3600_000).toISOString().slice(0, 10);
const pathFor = (date = indiaDate()) => `serverState/mailSent/${date}`;

export async function mailsSentToday(): Promise<number> {
  if (!isSecureCheckout()) return 0;
  const value = await adminGet<number>(pathFor()).catch(() => null);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Records one sent email. Never throws. */
export async function countSentMail(): Promise<void> {
  if (!isSecureCheckout()) return;
  await adminAdjustNumber(pathFor(), 1, 3, { createIfMissing: true }).catch(() => null);
}

/** Emails a bulk send (announcements) may use today, leaving the reserve free. */
export async function bulkMailAllowance(): Promise<number> {
  return Math.max(0, dailyMailLimit() - mailReserve() - (await mailsSentToday()));
}

/** True while the mailbox is under its daily limit (sign-in codes, orders). */
export async function canSendMail(): Promise<boolean> {
  return (await mailsSentToday()) < dailyMailLimit();
}
