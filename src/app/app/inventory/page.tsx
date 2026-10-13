import Link from "next/link";
import { History } from "lucide-react";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { int, money } from "@/lib/format";
import { skusWithStock } from "@/lib/queries";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { StockForms } from "./stock-forms";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; sku?: string }> }) {
  const { orgId } = await requireOrg();
  const { q = "", filter, sku } = await searchParams;
  const [all, locations] = await Promise.all([
    skusWithStock(orgId, { activeOnly: true }),
    db.location.findMany({ where: { organizationId: orgId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
  ]);
  const term = q.toLowerCase();
  const rows = all.filter((s) => (filter !== "low" || s.low) && (!term || s.code.toLowerCase().includes(term) || s.name.toLowerCase().includes(term)));
  const value = all.reduce((t, s) => t + Math.max(0, s.onHand) * s.costPrice, 0);

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle={`${int(all.reduce((t, s) => t + Math.max(0, s.onHand), 0))} units · ${money(value)} at cost`}
        actions={<Link href="/app/inventory/movements" className="btn"><History className="h-4 w-4" /> Stock history</Link>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div>
          <form className="mb-4 flex flex-wrap gap-2">
            <input className="input max-w-xs" name="q" defaultValue={q} placeholder="Search SKU or product…" />
            <select className="input w-auto" name="filter" defaultValue={filter ?? ""}><option value="">All SKUs</option><option value="low">Low stock only</option></select>
            <button className="btn">Filter</button>
          </form>
          <Card pad={false}>
            {rows.length ? (
              <table className="table">
                <thead>
                  <tr><th>SKU</th><th>Product</th>{locations.map((l) => <th key={l.id} className="text-right">{l.name}</th>)}<th className="text-right">Total</th></tr>
                </thead>
                <tbody>{rows.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs"><Link className="link" href={`/app/inventory?sku=${s.id}`}>{s.code}</Link></td>
                    <td>{s.name}</td>
                    {locations.map((l) => <td key={l.id} className={`text-right ${(s.perLocation[l.id] ?? 0) < 0 ? "text-red-600" : ""}`}>{s.perLocation[l.id] ?? 0}</td>)}
                    <td className="text-right font-semibold">{s.low ? <Badge tone={s.onHand <= 0 ? "red" : "amber"}>{s.onHand}</Badge> : s.onHand}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <Empty action={all.length ? undefined : { href: "/app/products/new", label: "Add a product" }}>{all.length ? "Nothing matches." : "Add products to start tracking stock."}</Empty>}
          </Card>
          <p className="mt-2 text-xs text-slate-500">Negative numbers mean orders were recorded before stock was entered — add stock to correct them.</p>
        </div>
        <div>
          <StockForms
            skus={all.map((s) => ({ id: s.id, label: `${s.code} — ${s.name}` }))}
            locations={locations.map((l) => ({ id: l.id, label: l.name }))}
            defaultSku={sku}
          />
        </div>
      </div>
    </>
  );
}
