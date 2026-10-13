import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth";
import { channelAvailability } from "@/lib/stock";
import { toCsv } from "@/lib/marketplace";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await requireOrg();
  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format") ?? "csv";
  const rows = await channelAvailability(orgId, id);
  const stamp = new Date().toISOString().slice(0, 10);

  let body: string;
  let ext = "csv";
  if (format === "amazon") {
    // Amazon "Inventory Loader" style: tab-delimited sku / quantity / handling time.
    body = toCsv([["sku", "quantity", "handling-time"], ...rows.map((r) => [r.externalSku, r.available, 2])], "\t");
    ext = "txt";
  } else if (format === "flipkart") {
    body = toCsv([["Seller SKU Id", "FSN", "System Stock count"], ...rows.map((r) => [r.externalSku, r.externalId ?? "", r.available])]);
  } else {
    body = toCsv([["sku", "name", "quantity"], ...rows.map((r) => [r.externalSku, r.name, r.available])]);
  }
  return new NextResponse(body, {
    headers: {
      "Content-Type": ext === "txt" ? "text/plain; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stock-${format}-${stamp}.${ext}"`,
    },
  });
}
