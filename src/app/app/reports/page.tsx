import { Download } from "lucide-react";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { int, money, num, round2 } from "@/lib/format";
import { salesSummary, skusWithStock } from "@/lib/queries";
import { Card, Empty, PageHeader, Stat, channelTone } from "@/components/ui";
import { Bars } from "@/components/bars";
import { parseRange } from "./range";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { orgId } = await requireOrg();
  const range = parseRange(await searchParams);
  const [sales, skus, locations, items] = await Promise.all([
    salesSummary(orgId, range.from, range.to),
    skusWithStock(orgId),
    db.location.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "asc" } }),
    db.orderItem.findMany({
      where: { order: { organizationId: orgId, orderDate: { gte: range.from, lte: range.to }, status: { notIn: ["CANCELLED", "RETURNED"] } } },
      include: { order: { select: { subtotal: true, discount: true } }, sku: { select: { costPrice: true } } },
    }),
  ]);

  // GST summary by rate (prices are tax-inclusive; order discounts are spread proportionally).
  const gst = new Map<number, { taxable: number; tax: number }>();
  let cogs = 0;
  for (const i of items) {
    const sub = num(i.order.subtotal);
    const factor = sub > 0 ? Math.max(0, sub - num(i.order.discount)) / sub : 1;
    const amount = num(i.total) * factor;
    const rate = num(i.gstRate);
    const tax = (amount * rate) / (100 + rate);
    const g = gst.get(rate) ?? { taxable: 0, tax: 0 };
    g.taxable += amount - tax;
    g.tax += tax;
    gst.set(rate, g);
    cogs += num(i.sku?.costPrice) * i.quantity;
  }
  const netSales = [...gst.values()].reduce((s, g) => s + g.taxable, 0);
  const valuation = locations.map((l) => ({
    name: l.name,
    units: skus.reduce((s, k) => s + Math.max(0, k.perLocation[l.id] ?? 0), 0),
    value: skus.reduce((s, k) => s + Math.max(0, k.perLocation[l.id] ?? 0) * k.costPrice, 0),
  }));
  const slow = skus.filter((s) => s.active && s.onHand > 0 && !sales.bySku.some((b) => b.code === s.code));

  return (
    <>
      <PageHeader
        title="Reports"
        actions={<a className="btn" href={`/app/reports/export?from=${range.fromStr}&to=${range.toStr}`}><Download className="h-4 w-4" /> Sales register (CSV)</a>}
      />
      <form className="mb-6 flex flex-wrap items-end gap-2">
        <div><label className="label">From</label><input className="input" type="date" name="from" defaultValue={range.fromStr} /></div>
        <div><label className="label">To</label><input className="input" type="date" name="to" defaultValue={range.toStr} /></div>
        <button className="btn">Apply</button>
      </form>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Gross sales" value={money(sales.revenue)} hint={`${sales.orders} orders`} />
        <Stat label="Net of GST" value={money(netSales)} hint={`GST ${money(sales.tax)}`} />
        <Stat label="Cost of goods" value={money(cogs)} hint="At current cost prices" />
        <Stat label="Gross margin" value={money(netSales - cogs)} hint={netSales ? `${round2(((netSales - cogs) / netSales) * 100)}% of net sales` : "—"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Sales by channel">
          {sales.byChannel.length ? <Bars rows={sales.byChannel.map((c) => ({ label: c.name, value: c.revenue, display: `${money(c.revenue)} · ${c.orders} orders · ${c.units} units`, tone: channelTone[c.type] }))} /> : <p className="text-sm text-slate-500">No sales in this period.</p>}
        </Card>
        <Card title="GST summary (outward supplies)" pad={false}>
          {gst.size ? (
            <table className="table">
              <thead><tr><th>GST rate</th><th className="text-right">Taxable value</th><th className="text-right">GST</th><th className="text-right">Total</th></tr></thead>
              <tbody>{[...gst.entries()].sort((a, b) => a[0] - b[0]).map(([rate, g]) => (
                <tr key={rate}><td>{rate}%</td><td className="text-right">{money(g.taxable)}</td><td className="text-right">{money(g.tax)}</td><td className="text-right">{money(g.taxable + g.tax)}</td></tr>
              ))}</tbody>
            </table>
          ) : <Empty>No sales in this period.</Empty>}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Top products" pad={false}>
          {sales.bySku.length ? (
            <table className="table">
              <thead><tr><th className="m-hide">SKU</th><th>Product</th><th className="text-right">Units</th><th className="text-right">Revenue</th></tr></thead>
              <tbody>{sales.bySku.slice(0, 15).map((s) => (
                <tr key={s.code}><td className="m-hide font-mono text-xs">{s.code}</td><td>{s.name}<div className="whitespace-nowrap font-mono text-xs text-slate-500 sm:hidden">{s.code}</div></td><td className="text-right">{int(s.units)}</td><td className="text-right">{money(s.revenue)}</td></tr>
              ))}</tbody>
            </table>
          ) : <Empty>No sales in this period.</Empty>}
        </Card>
        <div className="space-y-6">
          <Card title="Stock valuation (at cost)" pad={false}>
            <table className="table">
              <thead><tr><th>Location</th><th className="text-right">Units</th><th className="text-right">Value</th></tr></thead>
              <tbody>{valuation.map((v) => <tr key={v.name}><td>{v.name}</td><td className="text-right">{int(v.units)}</td><td className="text-right">{money(v.value)}</td></tr>)}</tbody>
            </table>
          </Card>
          <Card title="Not selling (in stock, no sales in period)" pad={false}>
            {slow.length ? (
              <table className="table"><tbody>{slow.slice(0, 10).map((s) => <tr key={s.id}><td className="font-mono text-xs">{s.code}</td><td>{s.name}</td><td className="text-right">{s.onHand} in stock</td></tr>)}</tbody></table>
            ) : <Empty>Every stocked SKU sold in this period.</Empty>}
          </Card>
        </div>
      </div>
    </>
  );
}
