import type { OrderStatus } from "@prisma/client";
import { db } from "./db";
import { changeOrderStatus, createOrder } from "./orders";
import { parseOrderReport, type ParsedOrder } from "./marketplace";
import type { ExternalOrder, ExternalStatus } from "./integrations/types";

export type ImportSummary = {
  created: number;
  updated: number;
  cancelled: number;
  skipped: number;
  failed: number;
  messages: string[];
};

/** Matches a channel's SKU (listing mapping first, then our own SKU code / barcode). */
export async function skuResolver(orgId: string, channelId: string) {
  const [listings, skus] = await Promise.all([
    db.channelListing.findMany({ where: { channelId } }),
    db.sku.findMany({ where: { organizationId: orgId }, select: { id: true, code: true, barcode: true } }),
  ]);
  const map = new Map<string, string>();
  for (const s of skus) {
    map.set(s.code.toLowerCase(), s.id);
    if (s.barcode) map.set(s.barcode.toLowerCase(), s.id);
  }
  for (const l of listings) {
    map.set(l.externalSku.toLowerCase(), l.skuId);
    if (l.externalId) map.set(l.externalId.toLowerCase(), l.skuId);
  }
  return (externalSku: string | null | undefined) => (externalSku ? map.get(externalSku.trim().toLowerCase()) ?? null : null);
}

export function normalizeStatus(status: string | null | undefined): ExternalStatus {
  const s = status ?? "";
  if (/cancel|refund|void/i.test(s)) return "CANCELLED";
  if (/deliver|complete/i.test(s)) return "DELIVERED";
  if (/ship|dispatch/i.test(s)) return "SHIPPED";
  if (/^pending/i.test(s)) return "PENDING";
  return "CONFIRMED";
}

const RANK: Record<string, number> = { PENDING: 0, CONFIRMED: 1, SHIPPED: 2, DELIVERED: 3 };
const ACTIVE = new Set(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"]);

/**
 * Creates new orders (deducting stock), cancels orders the marketplace cancelled (restocking),
 * and moves statuses forward. Safe to run repeatedly over overlapping windows.
 */
export async function importExternalOrders(
  orgId: string,
  channelId: string,
  orders: ExternalOrder[],
  opts: { userId?: string | null; locationFor?: (o: ExternalOrder) => string | null | "skip" } = {},
) {
  const summary: ImportSummary = { created: 0, updated: 0, cancelled: 0, skipped: 0, failed: 0, messages: [] };
  if (!orders.length) return summary;
  const resolve = await skuResolver(orgId, channelId);
  const existing = new Map(
    (
      await db.order.findMany({
        where: { channelId, externalOrderId: { in: orders.map((o) => o.externalOrderId) } },
        select: { id: true, externalOrderId: true, status: true },
      })
    ).map((o) => [o.externalOrderId!, o]),
  );

  for (const o of orders) {
    const found = existing.get(o.externalOrderId);
    try {
      if (found) {
        if (!ACTIVE.has(found.status)) {
          summary.skipped++;
        } else if (o.status === "CANCELLED") {
          await changeOrderStatus(orgId, found.id, "CANCELLED", { userId: opts.userId });
          summary.cancelled++;
        } else if (RANK[o.status] > RANK[found.status]) {
          await changeOrderStatus(orgId, found.id, o.status as OrderStatus, { userId: opts.userId });
          summary.updated++;
        } else {
          summary.skipped++;
        }
        continue;
      }
      if (o.status === "CANCELLED") {
        summary.skipped++;
        continue;
      }
      const location = opts.locationFor?.(o) ?? null;
      if (location === "skip") {
        summary.skipped++;
        continue;
      }
      const unknown = o.lines.filter((l) => !resolve(l.externalSku) && !resolve(l.externalId)).map((l) => l.externalSku || l.externalId);
      if (unknown.length || !o.lines.length) {
        summary.failed++;
        summary.messages.push(`Order ${o.externalOrderId}: ${o.lines.length ? `unknown SKU ${unknown.join(", ")} — map it under the channel's SKU mapping` : "no items"}`);
        continue;
      }
      await createOrder(orgId, {
        channelId,
        externalOrderId: o.externalOrderId,
        orderDate: o.orderDate ?? new Date(),
        status: o.status as OrderStatus,
        paymentStatus: o.paymentStatus ?? "PAID",
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        customerState: o.customerState,
        shippingAddress: o.shippingAddress,
        discount: o.discount,
        shippingFee: o.shippingFee,
        locationId: location,
        items: o.lines.map((l) => ({ skuId: (resolve(l.externalSku) ?? resolve(l.externalId))!, quantity: l.quantity, unitPrice: l.unitPrice })),
        allowNegative: true,
        userId: opts.userId,
      });
      summary.created++;
    } catch (e) {
      summary.failed++;
      summary.messages.push(`Order ${o.externalOrderId}: ${(e as Error).message}`);
    }
  }
  return summary;
}

export function parsedToExternal(o: ParsedOrder): ExternalOrder {
  return { ...o, status: normalizeStatus(o.status), paymentStatus: "PAID" };
}

export async function importOrderReport(orgId: string, channelId: string, text: string, userId: string | null) {
  const parsed = parseOrderReport(text);
  const summary = await importExternalOrders(orgId, channelId, parsed.orders.map(parsedToExternal), { userId });
  summary.messages.unshift(...parsed.errors);
  return summary;
}

export function describeSummary(s: ImportSummary) {
  const parts = [`${s.created} new`];
  if (s.updated) parts.push(`${s.updated} status updates`);
  if (s.cancelled) parts.push(`${s.cancelled} cancelled & restocked`);
  parts.push(`${s.skipped} skipped`, `${s.failed} failed`);
  return parts.join(" · ");
}
