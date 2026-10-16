import Link from "next/link";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, dayKey, daysUntil, int, label, money, startOfDay } from "@/lib/format";
import { batchesWithStock, salesSummary, skusWithStock } from "@/lib/queries";
import { Badge, Card, Empty, PageHeader, Stat, channelTone, statusTone } from "@/components/ui";
import { Bars, DailyColumns, lastNDays } from "@/components/bars";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { orgId, org, user } = await requireOrg();
  const { welcome } = await searchParams;
  const since = new Date(Date.now() - 30 * 86_400_000);
  const today = startOfDay(dayKey(new Date()));

  const [skus, batches, sales, todaySales, recent, movementCount, listingCount] = await Promise.all([
    skusWithStock(orgId, { activeOnly: true }),
    batchesWithStock(orgId),
    salesSummary(orgId, since),
    salesSummary(orgId, today),
    db.order.findMany({ where: { organizationId: orgId }, include: { channel: true }, orderBy: { orderDate: "desc" }, take: 8 }),
    db.stockMovement.count({ where: { organizationId: orgId } }),
    db.channelListing.count({ where: { channel: { organizationId: orgId } } }),
  ]);

  const units = skus.reduce((s, k) => s + Math.max(0, k.onHand), 0);
  const value = skus.reduce((s, k) => s + Math.max(0, k.onHand) * k.costPrice, 0);
  const low = skus.filter((s) => s.low);
  const expiring = batches.filter((b) => b.expiryDate && daysUntil(b.expiryDate) <= 90 && b.quantity > 0);
  const days = lastNDays(30);

  const steps = [
    { done: skus.length > 0, label: "Add your first product", href: "/app/products/new" },
    { done: movementCount > 0, label: "Add opening stock", href: "/app/inventory" },
    { done: listingCount > 0, label: "Map SKUs to Amazon / Flipkart", href: "/app/channels" },
    { done: recent.length > 0, label: "Record or import your first order", href: "/app/orders" },
  ];

  return (
    <>
      <PageHeader
        title={welcome ? `Welcome, ${user.name.split(" ")[0]}!` : org.name}
        subtitle="Stock and sales across every channel, in one place."
        actions={<><Link href="/app/pos" className="btn">New offline sale</Link><Link href="/app/inventory" className="btn btn-primary">Stock in</Link></>}
      />

      {steps.some((s) => !s.done) && (
        <Card title="Get started" className="mb-6">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${s.done ? "border-green-200 bg-green-50 text-green-800" : "border-slate-200 hover:border-brand-500"}`}>
                  {s.done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-slate-400" />} {s.label}
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Sales today" value={money(todaySales.revenue)} hint={`${todaySales.orders} orders`} />
        <Stat label="Sales (30 days)" value={money(sales.revenue)} hint={`${sales.orders} orders`} />
        <Stat label="Units in stock" value={int(units)} hint={`${skus.length} SKUs · ${money(value)} at cost`} />
        <Stat label="Needs attention" value={low.length + expiring.length} hint={`${low.length} low stock · ${expiring.length} expiring batches`} tone={low.length + expiring.length ? "amber" : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Sales — last 30 days" className="lg:col-span-2">
          <DailyColumns days={days} values={days.map((d) => sales.byDay.get(d) ?? 0)} format={(n) => money(n)} />
        </Card>
        <Card title="By channel (30 days)">
          {sales.byChannel.length ? (
            <Bars rows={sales.byChannel.map((c) => ({ label: c.name, value: c.revenue, display: `${money(c.revenue)} · ${c.units} units`, tone: channelTone[c.type] }))} />
          ) : <p className="text-sm text-slate-500">No sales yet.</p>}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Low stock</span>} pad={false} actions={<Link href="/app/inventory?filter=low" className="link text-xs">View all</Link>}>
          {low.length ? (
            <table className="table">
              <thead><tr><th>SKU</th><th>Product</th><th className="text-right">On hand</th><th className="text-right">Reorder at</th></tr></thead>
              <tbody>{low.slice(0, 8).map((s) => (
                <tr key={s.id}><td className="font-mono text-xs">{s.code}</td><td>{s.name}</td><td className={`text-right font-semibold ${s.onHand <= 0 ? "text-red-600" : "text-amber-600"}`}>{s.onHand}</td><td className="text-right text-slate-500">{s.threshold}</td></tr>
              ))}</tbody>
            </table>
          ) : <Empty>All SKUs are above their reorder level.</Empty>}
        </Card>
        <Card title={<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Expiring within 90 days</span>} pad={false} actions={<Link href="/app/batches" className="link text-xs">View all</Link>}>
          {expiring.length ? (
            <table className="table">
              <thead><tr><th>Batch</th><th>Product</th><th>Expiry</th><th className="text-right">Qty</th></tr></thead>
              <tbody>{expiring.slice(0, 8).map((b) => {
                const d = daysUntil(b.expiryDate!);
                return <tr key={b.id}><td className="font-mono text-xs">{b.batchNo}</td><td>{b.name}</td><td><Badge tone={d < 0 ? "red" : d <= 30 ? "red" : "amber"}>{d < 0 ? "Expired" : `${d} days`}</Badge> <span className="text-xs text-slate-500">{date(b.expiryDate)}</span></td><td className="text-right">{b.quantity}</td></tr>;
              })}</tbody>
            </table>
          ) : <Empty>No batches expiring soon.</Empty>}
        </Card>
      </div>

      <Card title="Recent orders" className="mt-6" pad={false} actions={<Link href="/app/orders" className="link text-xs">All orders</Link>}>
        {recent.length ? (
          <table className="table">
            <thead><tr><th>Order</th><th>Channel</th><th>Customer</th><th>Date</th><th>Status</th><th className="text-right">Total</th></tr></thead>
            <tbody>{recent.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/app/orders/${o.id}`} className="link">{o.orderNumber}</Link>{o.externalOrderId && <div className="text-xs text-slate-500">{o.externalOrderId}</div>}</td>
                <td><Badge tone={channelTone[o.channel.type]}>{o.channel.name}</Badge></td>
                <td>{o.customerName ?? "—"}</td>
                <td>{date(o.orderDate)}</td>
                <td><Badge tone={statusTone[o.status]}>{label(o.status)}</Badge></td>
                <td className="text-right font-medium">{money(o.total)}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <Empty action={{ href: "/app/orders/new", label: "Record an order" }}>No orders yet.</Empty>}
      </Card>
    </>
  );
}
