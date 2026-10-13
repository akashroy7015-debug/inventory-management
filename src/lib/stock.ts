import type { MovementType } from "@prisma/client";
import { db, type Tx } from "./db";

export class StockError extends Error {}

type MoveInput = {
  orgId: string;
  skuId: string;
  locationId: string;
  batchId?: string | null;
  delta: number;
  type: MovementType;
  reference?: string | null;
  note?: string | null;
  orderId?: string | null;
  userId?: string | null;
};

/** The single primitive that changes stock: updates the level and appends to the ledger. */
export async function moveStock(tx: Tx, m: MoveInput) {
  if (!Number.isInteger(m.delta) || m.delta === 0) throw new StockError("Quantity must be a non-zero whole number");
  const batchKey = m.batchId ?? "";
  await tx.stockLevel.upsert({
    where: { skuId_locationId_batchKey: { skuId: m.skuId, locationId: m.locationId, batchKey } },
    create: {
      organizationId: m.orgId,
      skuId: m.skuId,
      locationId: m.locationId,
      batchId: m.batchId ?? null,
      batchKey,
      quantity: m.delta,
    },
    update: { quantity: { increment: m.delta } },
  });
  await tx.stockMovement.create({
    data: {
      organizationId: m.orgId,
      skuId: m.skuId,
      locationId: m.locationId,
      batchId: m.batchId ?? null,
      quantity: m.delta,
      type: m.type,
      reference: m.reference ?? null,
      note: m.note ?? null,
      orderId: m.orderId ?? null,
      userId: m.userId ?? null,
    },
  });
}

/** Finds or creates a batch for a SKU. Returns null when no batch number is given. */
export async function resolveBatch(
  tx: Tx,
  orgId: string,
  skuId: string,
  batchNo?: string | null,
  mfgDate?: Date | null,
  expiryDate?: Date | null,
) {
  const no = batchNo?.trim();
  if (!no) return null;
  const existing = await tx.batch.findUnique({ where: { skuId_batchNo: { skuId, batchNo: no } } });
  if (existing) {
    if ((mfgDate && !existing.mfgDate) || (expiryDate && !existing.expiryDate)) {
      return tx.batch.update({
        where: { id: existing.id },
        data: { mfgDate: existing.mfgDate ?? mfgDate, expiryDate: existing.expiryDate ?? expiryDate },
      });
    }
    return existing;
  }
  return tx.batch.create({
    data: { organizationId: orgId, skuId, batchNo: no, mfgDate: mfgDate ?? null, expiryDate: expiryDate ?? null },
  });
}

/**
 * Removes stock first-expiry-first-out across batches at one location.
 * With allowNegative, any shortfall is booked against un-batched stock (going below zero)
 * — used for marketplace orders that have already been sold and must be recorded.
 */
export async function deductFefo(
  tx: Tx,
  m: Omit<MoveInput, "delta" | "batchId"> & { quantity: number; allowNegative?: boolean },
) {
  if (!Number.isInteger(m.quantity) || m.quantity <= 0) throw new StockError("Quantity must be a positive whole number");
  const levels = await tx.stockLevel.findMany({
    where: { skuId: m.skuId, locationId: m.locationId, quantity: { gt: 0 } },
    include: { batch: true },
  });
  levels.sort((a, b) => {
    const ea = a.batch?.expiryDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const eb = b.batch?.expiryDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (ea !== eb) return ea - eb;
    return (a.batch?.createdAt.getTime() ?? 0) - (b.batch?.createdAt.getTime() ?? 0);
  });
  const available = levels.reduce((s, l) => s + l.quantity, 0);
  if (available < m.quantity && !m.allowNegative) {
    const sku = await tx.sku.findUnique({ where: { id: m.skuId } });
    throw new StockError(`Not enough stock for ${sku?.code ?? "SKU"}: ${available} available, ${m.quantity} needed`);
  }
  let remaining = m.quantity;
  const rest = { orgId: m.orgId, skuId: m.skuId, locationId: m.locationId, type: m.type, reference: m.reference, note: m.note, orderId: m.orderId, userId: m.userId };
  const taken: { batchId: string | null; quantity: number }[] = [];
  for (const level of levels) {
    if (remaining === 0) break;
    const take = Math.min(level.quantity, remaining);
    await moveStock(tx, { ...rest, batchId: level.batchId, delta: -take });
    taken.push({ batchId: level.batchId, quantity: take });
    remaining -= take;
  }
  if (remaining > 0) {
    await moveStock(tx, { ...rest, batchId: null, delta: -remaining });
    taken.push({ batchId: null, quantity: remaining });
  }
  return taken;
}

/** Moves stock between locations, keeping batch identity (FEFO from the source). */
export async function transferStock(
  tx: Tx,
  m: { orgId: string; skuId: string; fromId: string; toId: string; quantity: number; reference?: string | null; note?: string | null; userId?: string | null },
) {
  if (m.fromId === m.toId) throw new StockError("Choose two different locations");
  const common = { orgId: m.orgId, skuId: m.skuId, reference: m.reference, note: m.note, userId: m.userId };
  const taken = await deductFefo(tx, { ...common, locationId: m.fromId, quantity: m.quantity, type: "TRANSFER_OUT" });
  for (const t of taken) {
    await moveStock(tx, { ...common, locationId: m.toId, batchId: t.batchId, delta: t.quantity, type: "TRANSFER_IN" });
  }
}

export async function defaultLocationId(tx: Tx | typeof db, orgId: string) {
  const loc =
    (await tx.location.findFirst({ where: { organizationId: orgId, isDefault: true } })) ??
    (await tx.location.findFirst({ where: { organizationId: orgId }, orderBy: { createdAt: "asc" } }));
  if (!loc) throw new StockError("Create a location first");
  return loc.id;
}

/** On-hand quantity per SKU, optionally limited to one location. */
export async function onHandBySku(orgId: string, locationId?: string) {
  const rows = await db.stockLevel.groupBy({
    by: ["skuId"],
    where: { organizationId: orgId, ...(locationId ? { locationId } : {}) },
    _sum: { quantity: true },
  });
  return new Map(rows.map((r) => [r.skuId, r._sum.quantity ?? 0]));
}

/** Quantity to advertise on a channel: stock at its location minus the safety buffer. */
export async function channelAvailability(orgId: string, channelId: string) {
  const channel = await db.channel.findFirstOrThrow({ where: { id: channelId, organizationId: orgId } });
  const locationId = channel.locationId ?? (await defaultLocationId(db, orgId));
  const onHand = await onHandBySku(orgId, locationId);
  const skus = await db.sku.findMany({
    where: { organizationId: orgId, active: true },
    include: { product: true, listings: { where: { channelId } } },
    orderBy: { code: "asc" },
  });
  return skus.map((s) => ({
    skuId: s.id,
    sku: s.code,
    externalSku: s.listings[0]?.externalSku ?? s.code,
    externalId: s.listings[0]?.externalId ?? null,
    name: [s.product.name, s.variantName].filter(Boolean).join(" — "),
    onHand: onHand.get(s.id) ?? 0,
    available: Math.max(0, (onHand.get(s.id) ?? 0) - channel.bufferQty),
    price: Number(s.price),
  }));
}
