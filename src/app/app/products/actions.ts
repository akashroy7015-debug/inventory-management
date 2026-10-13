"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg, requireRole } from "@/lib/auth";
import { formAction, optStr, str } from "@/lib/action";

const variantSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(1, "Every variant needs a SKU code").max(60),
  variantName: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  mrp: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  weightGrams: z.coerce.number().int().min(0).optional().or(z.literal("").transform(() => undefined)),
  lowStockThreshold: z.coerce.number().int().min(0),
  active: z.boolean().default(true),
});

export const saveProduct = formAction(async (fd) => {
  const { orgId } = await requireOrg();
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!name) throw new Error("Product name is required");
  const variants = z.array(variantSchema).min(1, "Add at least one variant / SKU").parse(JSON.parse(str(fd, "variants") || "[]"));
  const codes = variants.map((v) => v.code.toUpperCase());
  if (new Set(codes).size !== codes.length) throw new Error("SKU codes must be unique");

  const product = {
    name,
    brand: optStr(fd, "brand"),
    category: optStr(fd, "category"),
    description: optStr(fd, "description"),
    hsnCode: optStr(fd, "hsnCode"),
    gstRate: Number(str(fd, "gstRate") || 0),
    active: str(fd, "active") !== "off",
  };

  const productId = await db.$transaction(async (tx) => {
    let pid = id;
    if (pid) {
      const existing = await tx.product.findFirst({ where: { id: pid, organizationId: orgId } });
      if (!existing) throw new Error("Product not found");
      await tx.product.update({ where: { id: pid }, data: product });
    } else {
      pid = (await tx.product.create({ data: { ...product, organizationId: orgId } })).id;
    }
    for (const v of variants) {
      const data = {
        code: v.code.toUpperCase(),
        variantName: v.variantName || null,
        barcode: v.barcode || null,
        mrp: v.mrp,
        price: v.price,
        costPrice: v.costPrice,
        weightGrams: v.weightGrams ?? null,
        lowStockThreshold: v.lowStockThreshold,
        active: v.active,
      };
      if (v.id) {
        const owned = await tx.sku.findFirst({ where: { id: v.id, productId: pid, organizationId: orgId } });
        if (!owned) throw new Error("Variant not found");
        await tx.sku.update({ where: { id: v.id }, data });
      } else {
        await tx.sku.create({ data: { ...data, organizationId: orgId, productId: pid } });
      }
    }
    return pid;
  });
  revalidatePath("/app/products");
  redirect(`/app/products/${productId}?saved=1`);
});

export async function deleteProduct(fd: FormData) {
  const { orgId } = await requireRole(["OWNER", "ADMIN"]);
  const id = str(fd, "id");
  const used = await db.orderItem.count({ where: { sku: { productId: id, organizationId: orgId } } });
  if (used) {
    // Keep history intact — archive instead of deleting.
    await db.product.updateMany({ where: { id, organizationId: orgId }, data: { active: false } });
  } else {
    await db.product.deleteMany({ where: { id, organizationId: orgId } });
  }
  revalidatePath("/app/products");
  redirect("/app/products");
}
