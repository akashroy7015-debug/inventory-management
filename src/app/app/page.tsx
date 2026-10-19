import Link from "next/link";
import { AlertTriangle, ArrowRight, Boxes, Check, IndianRupee, TrendingUp } from "lucide-react";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { APP_TIMEZONE, date, dayKey, daysUntil, int, label, money, startOfDay } from "@/lib/format";
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

  const done = steps.filter((s) => s.done).length;
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: APP_TIMEZONE }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.name.split(" ")[0];
  const attention = low.length + expiring.length;

  return (
    <>
      <PageHeader
        eyebrow={now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: APP_TIMEZONE })}
        title={welcome ? `Welcome to ${org.name}, ${firstName}!` : `${greeting}, ${firstName}`}
        subtitle={`Here’s how ${org.name} is doing across every channel.`}
        actions={<><Link href="/app/pos" className="btn">New offline sale</Link><Link href="/app/inventory" className="btn btn-primary">Stock in</Link></>}
      />

      {done < steps.length && (
        <section className="mb-6 overflow-hidden rounded-2xl bg-ink text-white">
          <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 sm:px-6">
            <div>
              <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-white">Finish setting up</h2>
              <p className="mt-1 text-sm text-white/65">{steps.length - done} {steps.length - done === 1 ? "step" : "steps"} left before every channel runs from one stock count.</p>
            </div>
            <div className="text-sm font-medium text-white/80">{done} of {steps.length} done</div>
          </div>
          <div className="mx-5 mt-4 h-1.5 rounded-full bg-white/10 sm:mx-6" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label="Setup progress">
            <div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
          <ol className="grid gap-2 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.label}>
                <Link href={s.href} className={`group flex min-h-14 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition ${s.done ? "bg-white/5 text-white/55" : "bg-white/10 text-white hover:bg-white/15"}`}>
                  <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${s.done ? "bg-brand-600 text-white" : "border border-white/30 text-white"}`}>
                    {s.done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={s.done ? "line-through decoration-white/30" : ""}>{s.label}</span>
                  {!s.done && <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100" />}
                  {s.done && <span className="sr-only">(done)</span>}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat icon={IndianRupee} label="Sales today" value={money(todaySales.revenue)} hint={`${todaySales.orders} ${todaySales.orders === 1 ? "order" : "orders"}`} href="/app/orders" />
        <Stat icon={TrendingUp} label="Last 30 days" value={money(sales.revenue)} hint={`${sales.orders} ${sales.orders === 1 ? "order" : "orders"}`} href="/app/reports" />
        <Stat icon={Boxes} label="Units in stock" value={int(units)} hint={`${skus.length} SKUs · ${money(value)} at cost`} href="/app/inventory" />
        <Stat
          icon={AlertTriangle}
          label="Needs attention"
          value={attention}
          hint={attention ? `${low.length} low · ${expiring.length} expiring` : "All clear"}
          tone={attention ? "amber" : undefined}
          href={low.length || !expiring.length ? "/app/inventory?filter=low" : "/app/batches"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Sales — last 30 days" className="lg:col-span-2" actions={sales.revenue > 0 && <span className="text-sm text-subtle">{money(sales.revenue)} · {sales.orders} orders</span>}>
          <DailyColumns
            days={days}
            values={days.map((d) => sales.byDay.get(d) ?? 0)}
            format={(n) => money(n)}
            empty={
              <div>
                <p className="font-medium text-ink">No sales in the last 30 days yet</p>
                <p className="mt-1 text-sm text-subtle">Ring up a counter sale or connect a marketplace — orders show up here.</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Link href="/app/pos" className="btn btn-sm">New offline sale</Link>
                  <Link href="/app/channels" className="btn btn-sm btn-primary">Connect a channel</Link>
                </div>
              </div>
            }
          />
        </Card>
        <Card title="By channel (30 days)">
          {sales.byChannel.length ? (
            <Bars rows={sales.byChannel.map((c) => ({ label: c.name, value: c.revenue, display: `${money(c.revenue)} · ${c.units} units`, tone: channelTone[c.type] }))} />
          ) : (
            <div className="flex h-full flex-col justify-center py-6 text-center">
              <p className="text-sm text-subtle">Sales split by Website, Amazon, Flipkart and your counter appear here.</p>
              <Link href="/app/channels" className="link mt-2 text-sm">Set up channels →</Link>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Low stock</span>} pad={false} actions={<Link href="/app/inventory?filter=low" className="link text-xs">View all</Link>}>
          {low.length ? (
            <table className="table">
              <thead><tr><th className="m-hide">SKU</th><th>Product</th><th className="text-right">On hand</th><th className="text-right">Reorder at</th></tr></thead>
              <tbody>{low.slice(0, 8).map((s) => (
                <tr key={s.id}><td className="m-hide font-mono text-xs">{s.code}</td><td>{s.name}<div className="whitespace-nowrap font-mono text-xs text-slate-500 sm:hidden">{s.code}</div></td><td className={`text-right font-semibold ${s.onHand <= 0 ? "text-red-600" : "text-amber-600"}`}>{s.onHand}</td><td className="text-right text-slate-500">{s.threshold}</td></tr>
              ))}</tbody>
            </table>
          ) : <Empty>All SKUs are above their reorder level.</Empty>}
        </Card>
        <Card title={<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600" /> Expiring within 90 days</span>} pad={false} actions={<Link href="/app/batches" className="link text-xs">View all</Link>}>
          {expiring.length ? (
            <table className="table">
              <thead><tr><th className="m-hide">Batch</th><th>Product</th><th>Expiry</th><th className="text-right">Qty</th></tr></thead>
              <tbody>{expiring.slice(0, 8).map((b) => {
                const d = daysUntil(b.expiryDate!);
                return <tr key={b.id}><td className="m-hide font-mono text-xs">{b.batchNo}</td><td>{b.name}<div className="whitespace-nowrap font-mono text-xs text-slate-500 sm:hidden">{b.batchNo}</div></td><td className="whitespace-nowrap"><Badge tone={d < 0 ? "red" : d <= 30 ? "red" : "amber"}>{d < 0 ? "Expired" : `${d} days`}</Badge><div className="mt-0.5 text-xs text-subtle">{date(b.expiryDate)}</div></td><td className="text-right">{b.quantity}</td></tr>;
              })}</tbody>
            </table>
          ) : <Empty>No batches expiring soon.</Empty>}
        </Card>
      </div>

      <Card title="Recent orders" className="mt-6" pad={false} actions={<Link href="/app/orders" className="link text-xs">All orders</Link>}>
        {recent.length ? (
          <table className="table">
            <thead><tr><th>Order</th><th className="m-hide">Channel</th><th className="m-hide">Customer</th><th className="m-hide">Date</th><th>Status</th><th className="text-right">Total</th></tr></thead>
            <tbody>{recent.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/app/orders/${o.id}`} className="link">{o.orderNumber}</Link>{o.externalOrderId && <div className="text-xs text-slate-500">{o.externalOrderId}</div>}<div className="text-xs text-slate-500 sm:hidden">{o.channel.name} · {date(o.orderDate)}</div></td>
                <td className="m-hide"><Badge tone={channelTone[o.channel.type]}>{o.channel.name}</Badge></td>
                <td className="m-hide">{o.customerName ?? "—"}</td>
                <td className="m-hide">{date(o.orderDate)}</td>
                <td><Badge tone={statusTone[o.status]}>{label(o.status)}</Badge></td>
                <td className="whitespace-nowrap text-right font-medium">{money(o.total)}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <Empty action={{ href: "/app/orders/new", label: "Record an order" }}>No orders yet.</Empty>}
      </Card>
    </>
  );
}
