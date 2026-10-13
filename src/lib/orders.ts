import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { db, type Tx } from "./db";
import { deductFefo, defaultLocationId, moveStock, StockError } from "./stock";
import { inclusiveTax, num, round2 } from "./format";

export type OrderItemInput = { skuId: string; quantity: number; unitPrice?: number | null };

export type OrderInput = {
  channelId: string;
  externalOrderId?: string | null;
  items: OrderItemInput[];
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerGstin?: string | null;
  customerState?: string | null;
  shippingAddress?: string | null;
  discount?: number;
  shippingFee?: number;
  notes?: string | null;
  orderDate?: Date;
  /** Record the sale even when stock is short (marketplace orders are already sold). */
  allowNegative?: boolean;
  userId?: string | null;
};

const ACTIVE: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"];

export async function nextInvoiceNumber(tx: Tx, orgId: string) {
  const org = await tx.organization.update({ where: { id: orgId }, data: { invoiceSeq: { increment: 1 } } });
  return `${org.invoicePrefix}-${String(org.invoiceSeq).padStart(5, "0")}`;
}

export async function createOrder(orgId: string, input: OrderInput) {
  if (!input.items.length) throw new StockError("Add at least one item");
  return db.$transaction(async (tx) => {
    const channel = await tx.channel.findFirst({ where: { id: input.channelId, organizationId: orgId } });
    if (!channel) throw new StockError("Unknown sales channel");
    const locationId = channel.locationId ?? (await defaultLocationId(tx, orgId));

    const skus = await tx.sku.findMany({
      where: { organizationId: orgId, id: { in: input.items.map((i) => i.skuId) } },
      include: { product: true },
    });
    const skuMap = new Map(skus.map((s) => [s.id, s]));

    const lines = input.items.map((i) => {
      const sku = skuMap.get(i.skuId);
      if (!sku) throw new StockError("Unknown SKU in order");
      const qty = Math.trunc(i.quantity);
      if (qty <= 0) throw new StockError(`Quantity for ${sku.code} must be at least 1`);
      const unitPrice = round2(i.unitPrice ?? num(sku.price));
      const total = round2(unitPrice * qty);
      const gstRate = num(sku.product.gstRate);
      return {
        skuId: sku.id,
        name: [sku.product.name, sku.variantName].filter(Boolean).join(" — "),
        skuCode: sku.code,
        quantity: qty,
        unitPrice,
        gstRate,
        taxAmount: inclusiveTax(total, gstRate),
        total,
      };
    });

    const subtotal = round2(lines.reduce((s, l) => s + l.total, 0));
    const discount = round2(input.discount ?? 0);
    const shippingFee = round2(input.shippingFee ?? 0);
    // Scale tax by the discount share so the invoice tax matches what was charged.
    const factor = subtotal > 0 ? Math.max(0, subtotal - discount) / subtotal : 1;
    const taxTotal = round2(lines.reduce((s, l) => s + l.taxAmount, 0) * factor);
    const status = input.status ?? "CONFIRMED";

    const org = await tx.organization.update({ where: { id: orgId }, data: { orderSeq: { increment: 1 } } });
    const orderNumber = `SO-${String(org.orderSeq).padStart(5, "0")}`;
    // Marketplaces issue their own tax invoices; we invoice direct sales.
    const invoiceNumber =
      channel.type === "AMAZON" || channel.type === "FLIPKART" || channel.type === "MEESHO"
        ? null
        : await nextInvoiceNumber(tx, orgId);

    const order = await tx.order.create({
      data: {
        organizationId: orgId,
        channelId: channel.id,
        locationId,
        orderNumber,
        externalOrderId: input.externalOrderId?.trim() || null,
        status,
        paymentStatus: input.paymentStatus ?? "UNPAID",
        paymentMethod: input.paymentMethod ?? null,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone ?? null,
        customerEmail: input.customerEmail ?? null,
        customerGstin: input.customerGstin ?? null,
        customerState: input.customerState ?? null,
        shippingAddress: input.shippingAddress ?? null,
        notes: input.notes ?? null,
        orderDate: input.orderDate ?? new Date(),
        subtotal,
        discount,
        shippingFee,
        taxTotal,
        total: round2(subtotal - discount + shippingFee),
        invoiceNumber,
        items: { create: lines },
      },
    });

    if (ACTIVE.includes(status)) {
      for (const l of lines) {
        await deductFefo(tx, {
          orgId,
          skuId: l.skuId,
          locationId,
          quantity: l.quantity,
          type: "SALE",
          reference: order.externalOrderId ?? order.orderNumber,
          orderId: order.id,
          userId: input.userId,
          allowNegative: input.allowNegative,
        });
      }
    }
    return order;
  });
}

/** Puts back whatever stock an order still holds (net of earlier restocks). */
async function restockOrder(tx: Tx, orgId: string, orderId: string, type: "CANCEL" | "RETURN", userId?: string | null) {
  const moves = await tx.stockMovement.findMany({ where: { orderId, organizationId: orgId } });
  const net = new Map<string, { skuId: string; locationId: string; batchId: string | null; qty: number; ref: string | null }>();
  for (const m of moves) {
    const key = `${m.skuId}|${m.locationId}|${m.batchId ?? ""}`;
    const cur = net.get(key) ?? { skuId: m.skuId, locationId: m.locationId, batchId: m.batchId, qty: 0, ref: m.reference };
    cur.qty += m.quantity;
    net.set(key, cur);
  }
  for (const n of net.values()) {
    if (n.qty < 0) {
      await moveStock(tx, {
        orgId,
        skuId: n.skuId,
        locationId: n.locationId,
        batchId: n.batchId,
        delta: -n.qty,
        type,
        reference: n.ref,
        orderId,
        userId,
      });
    }
  }
}

export async function changeOrderStatus(
  orgId: string,
  orderId: string,
  status: OrderStatus,
  opts: { restock?: boolean; userId?: string | null } = {},
) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, organizationId: orgId } });
    if (!order) throw new StockError("Order not found");
    if (order.status === status) return order;
    if (!ACTIVE.includes(order.status)) throw new StockError(`A ${order.status.toLowerCase()} order cannot be changed`);
    if (status === "CANCELLED") await restockOrder(tx, orgId, orderId, "CANCEL", opts.userId);
    if (status === "RETURNED" && opts.restock !== false) await restockOrder(tx, orgId, orderId, "RETURN", opts.userId);
    return tx.order.update({ where: { id: orderId }, data: { status } });
  });
}

export async function ensureInvoice(orgId: string, orderId: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findFirstOrThrow({ where: { id: orderId, organizationId: orgId } });
    if (order.invoiceNumber) return order;
    return tx.order.update({ where: { id: orderId }, data: { invoiceNumber: await nextInvoiceNumber(tx, orgId) } });
  });
}
