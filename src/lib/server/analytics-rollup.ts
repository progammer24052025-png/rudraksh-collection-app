/**
 * Nightly roll-up of the store's own analytics.
 *
 * Each finished day's raw hits (`analytics/hits/{day}`) are summed into one
 * small record (`analytics/daily/{day}`) and the raw hits are deleted, so the
 * database holds a bounded amount of data and only totals are kept long-term.
 * Summaries older than `KEEP_DAYS` are removed.
 *
 * Safe to run more than once: a day that was already summed is added to, not
 * replaced, and its raw hits are only deleted after the summary is saved.
 */
import { combine, istDay, summarise, type DaySummary, type Hit } from "@/lib/analytics";
import { adminDelete, adminGet, adminSet } from "@/lib/server/rtdb-admin";

const KEEP_DAYS = 400;

export async function rollupAnalytics(now: number = Date.now()): Promise<{ days: number; pruned: number }> {
  const today = istDay(now);
  const raw = (await adminGet<Record<string, Record<string, Hit>>>("analytics/hits")) ?? {};
  let days = 0;

  for (const [day, hits] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      await adminDelete(`analytics/hits/${day}`).catch(() => {});
      continue;
    }
    if (day >= today) continue; // still being collected
    const summary = summarise(Object.values(hits ?? {}));
    const existing = await adminGet<DaySummary>(`analytics/daily/${day}`);
    await adminSet(`analytics/daily/${day}`, existing ? combine([existing, summary]) : summary);
    await adminDelete(`analytics/hits/${day}`);
    days += 1;
  }

  let pruned = 0;
  const cutoff = istDay(now - KEEP_DAYS * 86_400_000);
  const daily = (await adminGet<Record<string, unknown>>("analytics/daily")) ?? {};
  for (const day of Object.keys(daily)) {
    if (day < cutoff) {
      await adminDelete(`analytics/daily/${day}`).catch(() => {});
      pruned += 1;
    }
  }

  return { days, pruned };
}
