import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import type { OrderStatus, Prisma } from "@prisma/client";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, endOfDay, label, money, startOfDay } from "@/lib/format";
import { Badge, Card, Empty, PageHeader, channelTone, statusTone } from "@/components/ui";

export const metadata = { title: "Orders" };

const STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ channel?: string; status?: string; q?: string; from?: string; to?: string }> }) {
  const { orgId } = await requireOrg();
  const sp = await searchParams;
  const channels = await db.channel.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "asc" } });
  const where: Prisma.OrderWhereInput = { organizationId: orgId };
  if (sp.channel) {
    const ids = channels.filter((c) => c.id === sp.channel || c.type.toLowerCase() === sp.channel).map((c) => c.id);
    where.channelId = { in: ids };
  }
  if (sp.status && STATUSES.includes(sp.status as OrderStatus)) where.status = sp.status as OrderStatus;
  if (sp.q) {
    where.OR = [
      { orderNumber: { contains: sp.q, mode: "insensitive" } },
      { externalOrderId: { contains: sp.q, mode: "insensitive" } },
      { customerName: { contains: sp.q, mode: "insensitive" } },
      { customerPhone: { contains: sp.q } },
      { invoiceNumber: { contains: sp.q, mode: "insensitive" } },
    ];
  }
  if (sp.from || sp.to) {
    where.orderDate = {
      ...(sp.from ? { gte: startOfDay(sp.from) } : {}),
      ...(sp.to ? { lte: endOfDay(sp.to) } : {}),
    };
  }
  const orders = await db.order.findMany({
    where,
    include: { channel: true, _count: { select: { items: true } } },
    orderBy: { orderDate: "desc" },
    take: 200,
  });
  const total = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "RETURNED").reduce((s, o) => s + Number(o.total), 0);

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={`${orders.length} orders · ${money(total)}${orders.length === 200 ? " (latest 200)" : ""}`}
        actions={<>
          <Link href="/app/channels" className="btn"><Upload className="h-4 w-4" /> Import from Amazon / Flipkart</Link>
          <Link href="/app/orders/new" className="btn btn-primary"><Plus className="h-4 w-4" /> New order</Link>
        </>}
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-[220px]" name="q" defaultValue={sp.q} placeholder="Order #, customer, phone…" />
        <select className="input w-auto" name="channel" defaultValue={sp.channel ?? ""}>
          <option value="">All channels</option>
          {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-auto" name="status" defaultValue={sp.status ?? ""}>
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <input className="input w-auto" type="date" name="from" defaultValue={sp.from} aria-label="From" />
        <input className="input w-auto" type="date" name="to" defaultValue={sp.to} aria-label="To" />
        <button className="btn">Filter</button>
      </form>
      <Card pad={false}>
        {orders.length ? (
          <table className="table">
            <thead><tr><th>Order</th><th>Channel</th><th>Customer</th><th>Date</th><th>Items</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/app/orders/${o.id}`} className="link">{o.orderNumber}</Link>{o.externalOrderId && <div className="text-xs text-slate-500">{o.externalOrderId}</div>}</td>
                <td><Badge tone={channelTone[o.channel.type]}>{o.channel.name}</Badge></td>
                <td>{o.customerName ?? "—"}{o.customerPhone && <div className="text-xs text-slate-500">{o.customerPhone}</div>}</td>
                <td className="whitespace-nowrap">{date(o.orderDate)}</td>
                <td>{o._count.items}</td>
                <td><Badge tone={statusTone[o.status]}>{label(o.status)}</Badge></td>
                <td><Badge tone={statusTone[o.paymentStatus]}>{o.paymentStatus === "COD" ? "COD" : label(o.paymentStatus)}</Badge></td>
                <td className="text-right font-medium">{money(o.total)}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <Empty action={{ href: "/app/orders/new", label: "Create an order" }}>No orders found.</Empty>}
      </Card>
    </>
  );
}
