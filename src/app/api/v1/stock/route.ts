import { NextResponse, type NextRequest } from "next/server";
import { apiError, apiOrg, resolveChannel } from "@/lib/api";
import { channelAvailability } from "@/lib/stock";

export const dynamic = "force-dynamic";

/** GET /api/v1/stock?channel=website&sku=MOR-250 — sellable quantity per SKU for a channel. */
export async function GET(req: NextRequest) {
  const org = await apiOrg(req);
  if (!org) return apiError(401, "Invalid or missing API key");
  const channel = await resolveChannel(org.id, req.nextUrl.searchParams.get("channel"));
  if (!channel) return apiError(404, "Channel not found");
  const sku = req.nextUrl.searchParams.get("sku")?.toLowerCase();
  const rows = (await channelAvailability(org.id, channel.id))
    .filter((r) => !sku || r.sku.toLowerCase() === sku || r.externalSku.toLowerCase() === sku)
    .map((r) => ({ sku: r.externalSku, internal_sku: r.sku, name: r.name, available: r.available, in_stock: r.available > 0, price: r.price }));
  return NextResponse.json({ channel: { id: channel.id, name: channel.name }, updated_at: new Date().toISOString(), items: rows });
}
