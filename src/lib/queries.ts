import { db } from "./db";
import { dayKey, num } from "./format";

/** Every SKU with its on-hand stock across all locations. */
export async function skusWithStock(orgId: string, opts: { activeOnly?: boolean } = {}) {
  const [skus, levels] = await Promise.all([
    db.sku.findMany({
      where: { organizationId: orgId, ...(opts.activeOnly ? { active: true, product: { active: true } } : {}) },
      include: { product: true },
      orderBy: [{ product: { name: "asc" } }, { code: "asc" }],
    }),
    db.stockLevel.groupBy({ by: ["skuId", "locationId"], where: { organizationId: orgId }, _sum: { quantity: true } }),
  ]);
  const byLoc = new Map<string, Record<string, number>>();
  for (const l of levels) {
    const m = byLoc.get(l.skuId) ?? {};
    m[l.locationId] = l._sum.quantity ?? 0;
    byLoc.set(l.skuId, m);
  }
  return skus.map((s) => {
    const perLocation = byLoc.get(s.id) ?? {};
    const onHand = Object.values(perLocation).reduce((a, b) => a + b, 0);
    return {
      id: s.id,
      code: s.code,
      name: [s.product.name, s.variantName].filter(Boolean).join(" — "),
      productId: s.productId,
      productName: s.product.name,
      variantName: s.variantName,
      brand: s.product.brand,
      category: s.product.category,
      barcode: s.barcode,
      price: num(s.price),
      mrp: num(s.mrp),
      costPrice: num(s.costPrice),
      gstRate: num(s.product.gstRate),
      threshold: s.lowStockThreshold,
      active: s.active && s.product.active,
      perLocation,
      onHand,
      low: onHand <= s.lowStockThreshold,
    };
  });
}

export type SkuRow = Awaited<ReturnType<typeof skusWithStock>>[number];

/** Batches that still have stock, soonest expiry first. */
export async function batchesWithStock(orgId: string) {
  const levels = await db.stockLevel.findMany({
    where: { organizationId: orgId, batchId: { not: null }, quantity: { not: 0 } },
    include: { batch: true, sku: { include: { product: true } }, location: true },
  });
  return levels
    .map((l) => ({
      id: l.id,
      batchNo: l.batch!.batchNo,
      mfgDate: l.batch!.mfgDate,
      expiryDate: l.batch!.expiryDate,
      skuCode: l.sku.code,
      name: [l.sku.product.name, l.sku.variantName].filter(Boolean).join(" — "),
      location: l.location.name,
      quantity: l.quantity,
    }))
    .sort((a, b) => (a.expiryDate?.getTime() ?? Infinity) - (b.expiryDate?.getTime() ?? Infinity));
}

export async function salesSummary(orgId: string, from: Date, to: Date = new Date()) {
  const orders = await db.order.findMany({
    where: { organizationId: orgId, orderDate: { gte: from, lte: to }, status: { notIn: ["CANCELLED"] } },
    include: { channel: true, items: true },
  });
  const byChannel = new Map<string, { name: string; type: string; orders: number; revenue: number; units: number }>();
  const bySku = new Map<string, { code: string; name: string; units: number; revenue: number }>();
  const byDay = new Map<string, number>();
  let revenue = 0;
  let tax = 0;
  for (const o of orders) {
    const net = o.status === "RETURNED" ? 0 : num(o.total);
    revenue += net;
    if (o.status !== "RETURNED") tax += num(o.taxTotal);
    const c = byChannel.get(o.channelId) ?? { name: o.channel.name, type: o.channel.type, orders: 0, revenue: 0, units: 0 };
    c.orders++;
    c.revenue += net;
    const day = dayKey(o.orderDate);
    byDay.set(day, (byDay.get(day) ?? 0) + net);
    for (const i of o.items) {
      if (o.status === "RETURNED") continue;
      c.units += i.quantity;
      const s = bySku.get(i.skuCode) ?? { code: i.skuCode, name: i.name, units: 0, revenue: 0 };
      s.units += i.quantity;
      s.revenue += num(i.total);
      bySku.set(i.skuCode, s);
    }
    byChannel.set(o.channelId, c);
  }
  return {
    orders: orders.length,
    revenue,
    tax,
    byChannel: [...byChannel.values()].sort((a, b) => b.revenue - a.revenue),
    bySku: [...bySku.values()].sort((a, b) => b.revenue - a.revenue),
    byDay,
  };
}
