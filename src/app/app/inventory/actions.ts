"use server";

import { revalidatePath } from "next/cache";
import type { MovementType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { formAction, optDate, optStr, str } from "@/lib/action";
import { StockError, deductFefo, moveStock, resolveBatch, transferStock } from "@/lib/stock";
import { afterStockChange } from "@/lib/integrations/sync";

async function ownedIds(orgId: string, skuId: string, ...locationIds: string[]) {
  const [sku, locs] = await Promise.all([
    db.sku.findFirst({ where: { id: skuId, organizationId: orgId } }),
    db.location.count({ where: { id: { in: locationIds }, organizationId: orgId } }),
  ]);
  if (!sku) throw new StockError("Choose a product");
  if (locs !== new Set(locationIds).size) throw new StockError("Choose a location");
  return sku;
}

function qty(fd: FormData, key = "quantity") {
  const n = Number(str(fd, key));
  if (!Number.isInteger(n) || n <= 0) throw new StockError("Quantity must be a whole number above 0");
  return n;
}

export const stockIn = formAction(async (fd) => {
  const { orgId, user } = await requireOrg();
  const skuId = str(fd, "skuId");
  const locationId = str(fd, "locationId");
  const sku = await ownedIds(orgId, skuId, locationId);
  const quantity = qty(fd);
  const type = (["PURCHASE", "PRODUCTION", "RETURN", "ADJUSTMENT"].includes(str(fd, "type")) ? str(fd, "type") : "PURCHASE") as MovementType;
  await db.$transaction(async (tx) => {
    const batch = await resolveBatch(tx, orgId, skuId, optStr(fd, "batchNo"), optDate(fd, "mfgDate"), optDate(fd, "expiryDate"));
    await moveStock(tx, {
      orgId, skuId, locationId, batchId: batch?.id, delta: quantity, type,
      reference: optStr(fd, "reference"), note: optStr(fd, "note"), userId: user.id,
    });
  });
  afterStockChange(orgId);
  revalidatePath("/app", "layout");
  return `Added ${quantity} × ${sku.code}`;
});

export const adjustStock = formAction(async (fd) => {
  const { orgId, user } = await requireOrg();
  const skuId = str(fd, "skuId");
  const locationId = str(fd, "locationId");
  const sku = await ownedIds(orgId, skuId, locationId);
  const mode = str(fd, "mode");
  const reason = str(fd, "reason") === "DAMAGE" ? "DAMAGE" : "ADJUSTMENT";
  const note = optStr(fd, "note");
  const batchNo = optStr(fd, "batchNo");

  const msg = await db.$transaction(async (tx) => {
    const batch = batchNo ? await tx.batch.findUnique({ where: { skuId_batchNo: { skuId, batchNo } } }) : null;
    if (batchNo && !batch) throw new StockError(`Batch ${batchNo} not found for ${sku.code}`);
    let delta: number;
    if (mode === "count") {
      const counted = Number(str(fd, "quantity"));
      if (!Number.isInteger(counted) || counted < 0) throw new StockError("Counted quantity must be 0 or more");
      const levels = await tx.stockLevel.findMany({ where: { skuId, locationId, ...(batch ? { batchId: batch.id } : {}) } });
      delta = counted - levels.reduce((s, l) => s + l.quantity, 0);
      if (delta === 0) return "Count matches — no change needed";
    } else {
      delta = qty(fd) * (mode === "remove" ? -1 : 1);
    }
    const base = { orgId, skuId, locationId, type: reason as MovementType, note, reference: "Manual", userId: user.id };
    if (delta > 0 || batch) await moveStock(tx, { ...base, batchId: batch?.id, delta });
    else await deductFefo(tx, { ...base, quantity: -delta });
    return `${sku.code}: ${delta > 0 ? "+" : ""}${delta}`;
  });
  afterStockChange(orgId);
  revalidatePath("/app", "layout");
  return msg;
});

export const transfer = formAction(async (fd) => {
  const { orgId, user } = await requireOrg();
  const skuId = str(fd, "skuId");
  const fromId = str(fd, "fromId");
  const toId = str(fd, "toId");
  const sku = await ownedIds(orgId, skuId, fromId, toId);
  const quantity = qty(fd);
  await db.$transaction((tx) => transferStock(tx, { orgId, skuId, fromId, toId, quantity, reference: optStr(fd, "reference"), userId: user.id }));
  afterStockChange(orgId);
  revalidatePath("/app", "layout");
  return `Moved ${quantity} × ${sku.code}`;
});
