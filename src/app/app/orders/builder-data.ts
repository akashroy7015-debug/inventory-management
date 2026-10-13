import { db } from "@/lib/db";
import { onHandBySku, defaultLocationId } from "@/lib/stock";
import { skusWithStock } from "@/lib/queries";
import type { ChannelType } from "@prisma/client";

export async function builderData(orgId: string, types?: ChannelType[]) {
  const channels = await db.channel.findMany({
    where: { organizationId: orgId, active: true, ...(types ? { type: { in: types } } : {}) },
    orderBy: { createdAt: "asc" },
  });
  // POS shows stock at the shop's location; orders show total stock.
  const locationId = types ? channels[0]?.locationId ?? (await defaultLocationId(db, orgId)) : undefined;
  const [skus, local] = await Promise.all([skusWithStock(orgId, { activeOnly: true }), locationId ? onHandBySku(orgId, locationId) : null]);
  return {
    channels: channels.map((c) => ({ id: c.id, name: c.name, type: c.type })),
    skus: skus.map((s) => ({ id: s.id, code: s.code, name: s.name, barcode: s.barcode, price: s.price, gstRate: s.gstRate, stock: local ? local.get(s.id) ?? 0 : s.onHand })),
  };
}
