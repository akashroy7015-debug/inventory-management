"use server";

import { revalidatePath } from "next/cache";
import type { LocationType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { formAction, optStr, str } from "@/lib/action";

const TYPES: LocationType[] = ["WAREHOUSE", "STORE", "AMAZON_FBA", "FLIPKART_FC", "OTHER"];

export const saveLocation = formAction(async (fd) => {
  const { orgId } = await requireRole(["OWNER", "ADMIN"]);
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!name) throw new Error("Name is required");
  const type = (TYPES.includes(str(fd, "type") as LocationType) ? str(fd, "type") : "WAREHOUSE") as LocationType;
  const data = { name, type, address: optStr(fd, "address") };
  const makeDefault = str(fd, "isDefault") === "on";
  await db.$transaction(async (tx) => {
    let locId = id;
    if (id) {
      const { count } = await tx.location.updateMany({ where: { id, organizationId: orgId }, data });
      if (!count) throw new Error("Location not found");
    } else {
      locId = (await tx.location.create({ data: { ...data, organizationId: orgId } })).id;
    }
    if (makeDefault) {
      await tx.location.updateMany({ where: { organizationId: orgId }, data: { isDefault: false } });
      await tx.location.update({ where: { id: locId }, data: { isDefault: true } });
    }
  });
  revalidatePath("/app/locations");
  return id ? "Location updated" : "Location added";
});

export const deleteLocation = formAction(async (fd) => {
  const { orgId } = await requireRole(["OWNER", "ADMIN"]);
  const id = str(fd, "id");
  const loc = await db.location.findFirst({ where: { id, organizationId: orgId } });
  if (!loc) throw new Error("Location not found");
  if (loc.isDefault) throw new Error("Make another location the default first");
  const [stock, moves] = await Promise.all([
    db.stockLevel.count({ where: { locationId: id, quantity: { not: 0 } } }),
    db.stockMovement.count({ where: { locationId: id } }),
  ]);
  if (stock || moves) throw new Error("This location has stock history and can't be deleted");
  await db.location.delete({ where: { id } });
  revalidatePath("/app/locations");
  return "Deleted";
});
