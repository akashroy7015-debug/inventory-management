import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiOrg, resolveChannel } from "@/lib/api";
import { changeOrderStatus } from "@/lib/orders";
import { StockError } from "@/lib/stock";

export const dynamic = "force-dynamic";

/** POST /api/v1/orders/cancel { order_id, channel? } — cancels and returns stock. */
export async function POST(req: NextRequest) {
  const org = await apiOrg(req);
  if (!org) return apiError(401, "Invalid or missing API key");
  const body = (await req.json().catch(() => ({}))) as { order_id?: string; channel?: string };
  if (!body.order_id) return apiError(400, "order_id is required");
  const channel = await resolveChannel(org.id, body.channel);
  if (!channel) return apiError(404, "Channel not found");
  const order = await db.order.findUnique({ where: { channelId_externalOrderId: { channelId: channel.id, externalOrderId: body.order_id } } });
  if (!order) return apiError(404, "Order not found");
  if (order.status === "CANCELLED") return NextResponse.json({ id: order.id, status: "CANCELLED" });
  try {
    const updated = await changeOrderStatus(org.id, order.id, "CANCELLED");
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (e) {
    if (e instanceof StockError) return apiError(422, e.message);
    throw e;
  }
}
