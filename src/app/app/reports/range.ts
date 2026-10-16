import { dayKey, endOfDay, startOfDay } from "@/lib/format";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Report period in the business time zone; defaults to this month so far. */
export function parseRange(sp: { from?: string; to?: string }) {
  const today = dayKey(new Date());
  const fromStr = sp.from && DAY.test(sp.from) ? sp.from : `${today.slice(0, 8)}01`;
  const toStr = sp.to && DAY.test(sp.to) ? sp.to : today;
  return { from: startOfDay(fromStr), to: endOfDay(toStr), fromStr, toStr };
}
