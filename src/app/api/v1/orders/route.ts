import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, apiOrg, resolveChannel } from "@/lib/api";
import { createOrder } from "@/lib/orders";
import { skuResolver } from "@/lib/import";
import { StockError } from "@/lib/stock";

export const dynamic = "force-dynamic";

const schema = z.object({
  channel: z.string().optional(),
  order_id: z.string().min(1).max(100),
  order_date: z.string().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"]).optional(),
  payment_status: z.enum(["UNPAID", "PAID", "COD"]).optional(),
  payment_method: z.string().optional(),
  discount: z.number().min(0).optional(),
  shipping_fee: z.number().min(0).optional(),
  notes: z.string().optional(),
  customer: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      gstin: z.string().optional(),
      state: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
  items: z.array(z.object({ sku: z.string().min(1), quantity: z.number().int().min(1), price: z.number().min(0).optional() })).min(1),
});

/** POST /api/v1/orders — record a website order and deduct stock. Idempotent on (channel, order_id). */
export async function POST(req: NextRequest) {
  const org = await apiOrg(req);
  if (!org) return apiError(401, "Invalid or missing API key");
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e) {
    return apiError(400, "Invalid request body", { details: e instanceof z.ZodError ? e.issues : String(e) });
  }
  const channel = await resolveChannel(org.id, body.channel);
  if (!channel) return apiError(404, "Channel not found");

  const existing = await db.order.findUnique({ where: { channelId_externalOrderId: { channelId: channel.id, externalOrderId: body.order_id } } });
  if (existing) return NextResponse.json({ id: existing.id, order_number: existing.orderNumber, status: existing.status, duplicate: true });

  const resolve = await skuResolver(org.id, channel.id);
  const unknown = body.items.filter((i) => !resolve(i.sku)).map((i) => i.sku);
  if (unknown.length) return apiError(422, "Unknown SKU", { skus: unknown });

  try {
    const order = await createOrder(org.id, {
      channelId: channel.id,
      externalOrderId: body.order_id,
      orderDate: body.order_date ? new Date(body.order_date) : new Date(),
      status: body.status ?? "CONFIRMED",
      paymentStatus: body.payment_status ?? "UNPAID",
      paymentMethod: body.payment_method,
      discount: body.discount,
      shippingFee: body.shipping_fee,
      notes: body.notes,
      customerName: body.customer?.name,
      customerPhone: body.customer?.phone,
      customerEmail: body.customer?.email,
      customerGstin: body.customer?.gstin,
      customerState: body.customer?.state,
      shippingAddress: body.customer?.address,
      items: body.items.map((i) => ({ skuId: resolve(i.sku)!, quantity: i.quantity, unitPrice: i.price })),
      // The customer has already paid on the website — always record it.
      allowNegative: true,
    });
    return NextResponse.json({ id: order.id, order_number: order.orderNumber, status: order.status, duplicate: false }, { status: 201 });
  } catch (e) {
    if (e instanceof StockError) return apiError(422, e.message);
    // A concurrent duplicate submission hits the unique index.
    if (e instanceof Error && e.message.includes("Unique constraint")) return apiError(409, "Order already exists");
    console.error(e);
    return apiError(500, "Could not create order");
  }
}
