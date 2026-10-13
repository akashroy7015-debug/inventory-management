import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { num, round2 } from "@/lib/format";
import { toCsv } from "@/lib/marketplace";
import { parseRange } from "../range";

/** Line-level sales register for the accountant / GST filing. */
export async function GET(req: NextRequest) {
  const { orgId, org } = await requireOrg();
  const sp = req.nextUrl.searchParams;
  const range = parseRange({ from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined });
  const orders = await db.order.findMany({
    where: { organizationId: orgId, orderDate: { gte: range.from, lte: range.to } },
    include: { channel: true, items: { include: { sku: { include: { product: true } } } } },
    orderBy: { orderDate: "asc" },
  });
  const rows: (string | number | null)[][] = [[
    "Date", "Order no", "Invoice no", "Channel", "Channel order id", "Status", "Customer", "Customer GSTIN", "Place of supply",
    "SKU", "Item", "HSN", "Qty", "Unit price (incl GST)", "GST rate", "Taxable value", "CGST", "SGST", "IGST", "Line total",
  ]];
  for (const o of orders) {
    const sub = num(o.subtotal);
    const factor = sub > 0 ? Math.max(0, sub - num(o.discount)) / sub : 1;
    const pos = o.customerState ?? org.state ?? "";
    const intra = !o.customerState || !org.state || o.customerState.toLowerCase() === org.state.toLowerCase();
    for (const i of o.items) {
      const amount = round2(num(i.total) * factor);
      const rate = num(i.gstRate);
      const tax = round2((amount * rate) / (100 + rate));
      rows.push([
        o.orderDate.toISOString().slice(0, 10), o.orderNumber, o.invoiceNumber, o.channel.name, o.externalOrderId, o.status,
        o.customerName, o.customerGstin, pos, i.skuCode, i.name, i.sku?.product.hsnCode ?? "", i.quantity, num(i.unitPrice), rate,
        round2(amount - tax), intra ? round2(tax / 2) : 0, intra ? round2(tax / 2) : 0, intra ? 0 : tax, amount,
      ]);
    }
  }
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-register-${range.fromStr}-to-${range.toStr}.csv"`,
    },
  });
}
