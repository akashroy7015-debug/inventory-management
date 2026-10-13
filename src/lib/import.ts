import { db } from "./db";
import { createOrder } from "./orders";
import { isCancelledStatus, parseOrderReport } from "./marketplace";

export type ImportSummary = { created: number; skipped: number; failed: number; messages: string[] };

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
  return (externalSku: string) => map.get(externalSku.trim().toLowerCase()) ?? null;
}

export async function importOrderReport(orgId: string, channelId: string, text: string, userId: string | null) {
  const parsed = parseOrderReport(text);
  const summary: ImportSummary = { created: 0, skipped: 0, failed: 0, messages: [...parsed.errors] };
  if (!parsed.orders.length) return summary;

  const resolve = await skuResolver(orgId, channelId);
  const existing = new Set(
    (
      await db.order.findMany({
        where: { channelId, externalOrderId: { in: parsed.orders.map((o) => o.externalOrderId) } },
        select: { externalOrderId: true },
      })
    ).map((o) => o.externalOrderId),
  );

  for (const o of parsed.orders) {
    if (existing.has(o.externalOrderId) || isCancelledStatus(o.status)) {
      summary.skipped++;
      continue;
    }
    const unknown = o.lines.filter((l) => !resolve(l.externalSku)).map((l) => l.externalSku);
    if (unknown.length) {
      summary.failed++;
      summary.messages.push(`Order ${o.externalOrderId}: unknown SKU ${unknown.join(", ")} — map it under Channels`);
      continue;
    }
    try {
      await createOrder(orgId, {
        channelId,
        externalOrderId: o.externalOrderId,
        orderDate: o.orderDate ?? new Date(),
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerState: o.customerState,
        shippingAddress: o.shippingAddress,
        paymentStatus: "PAID",
        status: /deliver/i.test(o.status ?? "") ? "DELIVERED" : /ship/i.test(o.status ?? "") ? "SHIPPED" : "CONFIRMED",
        items: o.lines.map((l) => ({ skuId: resolve(l.externalSku)!, quantity: l.quantity, unitPrice: l.unitPrice })),
        allowNegative: true,
        userId,
      });
      summary.created++;
    } catch (e) {
      summary.failed++;
      summary.messages.push(`Order ${o.externalOrderId}: ${(e as Error).message}`);
    }
  }
  return summary;
}
