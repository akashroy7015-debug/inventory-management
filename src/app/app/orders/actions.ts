"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { formAction, optDate, optNum, optStr, str } from "@/lib/action";
import { changeOrderStatus, createOrder, ensureInvoice } from "@/lib/orders";

const STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];
const PAYMENTS: PaymentStatus[] = ["UNPAID", "PAID", "COD", "REFUNDED"];

const itemsSchema = z
  .array(z.object({ skuId: z.string().min(1), quantity: z.coerce.number().int().min(1), unitPrice: z.coerce.number().min(0) }))
  .min(1, "Add at least one item");

export const createOrderAction = formAction(async (fd) => {
  const { orgId, user } = await requireOrg();
  const mode = str(fd, "mode");
  const status = STATUSES.includes(str(fd, "status") as OrderStatus) ? (str(fd, "status") as OrderStatus) : "CONFIRMED";
  const paymentStatus = PAYMENTS.includes(str(fd, "paymentStatus") as PaymentStatus) ? (str(fd, "paymentStatus") as PaymentStatus) : mode === "pos" ? "PAID" : "UNPAID";
  const order = await createOrder(orgId, {
    channelId: str(fd, "channelId"),
    externalOrderId: optStr(fd, "externalOrderId"),
    items: itemsSchema.parse(JSON.parse(str(fd, "items") || "[]")),
    status: mode === "pos" ? "DELIVERED" : status,
    paymentStatus,
    paymentMethod: optStr(fd, "paymentMethod"),
    customerName: optStr(fd, "customerName"),
    customerPhone: optStr(fd, "customerPhone"),
    customerEmail: optStr(fd, "customerEmail"),
    customerGstin: optStr(fd, "customerGstin"),
    customerState: optStr(fd, "customerState"),
    shippingAddress: optStr(fd, "shippingAddress"),
    discount: optNum(fd, "discount") ?? 0,
    shippingFee: optNum(fd, "shippingFee") ?? 0,
    notes: optStr(fd, "notes"),
    orderDate: optDate(fd, "orderDate") ?? new Date(),
    allowNegative: mode !== "pos" && str(fd, "allowNegative") === "on",
    userId: user.id,
  });
  revalidatePath("/app", "layout");
  redirect(mode === "pos" ? `/app/orders/${order.id}/invoice?pos=1` : `/app/orders/${order.id}`);
});

export const updateStatus = formAction(async (fd) => {
  const { orgId, user } = await requireOrg();
  const status = str(fd, "status") as OrderStatus;
  if (!STATUSES.includes(status)) throw new Error("Invalid status");
  await changeOrderStatus(orgId, str(fd, "id"), status, { restock: str(fd, "restock") !== "off", userId: user.id });
  revalidatePath("/app", "layout");
  return status === "CANCELLED" ? "Order cancelled — stock returned" : status === "RETURNED" ? "Marked as returned" : "Status updated";
});

export const updatePayment = formAction(async (fd) => {
  const { orgId } = await requireOrg();
  const paymentStatus = str(fd, "paymentStatus") as PaymentStatus;
  if (!PAYMENTS.includes(paymentStatus)) throw new Error("Invalid payment status");
  await db.order.updateMany({ where: { id: str(fd, "id"), organizationId: orgId }, data: { paymentStatus } });
  revalidatePath("/app/orders");
  return "Payment updated";
});

export async function generateInvoice(fd: FormData) {
  const { orgId } = await requireOrg();
  const id = str(fd, "id");
  await ensureInvoice(orgId, id);
  redirect(`/app/orders/${id}/invoice`);
}
