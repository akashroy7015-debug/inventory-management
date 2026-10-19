import Link from "next/link";
import type { MovementType, Prisma } from "@prisma/client";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateTime, label } from "@/lib/format";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Stock history" };

const TYPES: MovementType[] = ["PURCHASE", "PRODUCTION", "SALE", "RETURN", "CANCEL", "ADJUSTMENT", "DAMAGE", "TRANSFER_IN", "TRANSFER_OUT"];

export default async function MovementsPage({ searchParams }: { searchParams: Promise<{ type?: string; sku?: string }> }) {
  const { orgId } = await requireOrg();
  const { type, sku } = await searchParams;
  const where: Prisma.StockMovementWhereInput = { organizationId: orgId };
  if (type && TYPES.includes(type as MovementType)) where.type = type as MovementType;
  if (sku) where.sku = { code: { contains: sku, mode: "insensitive" } };
  const moves = await db.stockMovement.findMany({
    where,
    include: { sku: { include: { product: true } }, location: true, batch: true, user: true, order: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    <>
      <PageHeader title="Stock history" subtitle={<>Every stock change, newest first. <Link href="/app/inventory" className="link">← Inventory</Link></>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" name="sku" defaultValue={sku} placeholder="SKU code" />
        <select className="input w-auto" name="type" defaultValue={type ?? ""}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
        </select>
        <button className="btn">Filter</button>
      </form>
      <Card pad={false}>
        {moves.length ? (
          <table className="table">
            <thead><tr><th>When</th><th>SKU</th><th className="m-hide">Location</th><th className="m-hide">Batch</th><th>Type</th><th className="text-right">Qty</th><th className="m-hide">Reference</th><th className="m-hide">By</th></tr></thead>
            <tbody>{moves.map((m) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap text-xs text-slate-500">{dateTime(m.createdAt)}</td>
                <td><span className="font-mono text-xs">{m.sku.code}</span><div className="text-xs text-slate-500">{m.sku.product.name}</div><div className="text-xs text-slate-500 sm:hidden">{m.location.name}</div></td>
                <td className="m-hide">{m.location.name}</td>
                <td className="m-hide font-mono text-xs">{m.batch?.batchNo ?? "—"}</td>
                <td><Badge tone={m.quantity > 0 ? "green" : "red"}>{label(m.type)}</Badge></td>
                <td className={`text-right font-semibold ${m.quantity > 0 ? "text-green-700" : "text-red-600"}`}>{m.quantity > 0 ? "+" : ""}{m.quantity}</td>
                <td className="m-hide text-xs">{m.order ? <Link className="link" href={`/app/orders/${m.order.id}`}>{m.reference}</Link> : m.reference ?? "—"}{m.note && <div className="text-slate-500">{m.note}</div>}</td>
                <td className="m-hide text-xs text-slate-500">{m.user?.name ?? "API"}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <Empty>No stock movements yet.</Empty>}
      </Card>
    </>
  );
}
