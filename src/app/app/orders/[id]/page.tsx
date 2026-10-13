import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, dateTime, label, money } from "@/lib/format";
import { ActionForm, Submit } from "@/components/action-form";
import { Badge, Card, PageHeader, channelTone, statusTone } from "@/components/ui";
import { generateInvoice, updatePayment, updateStatus } from "../actions";

const NEXT: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED", "CANCELLED"],
  DELIVERED: ["RETURNED"],
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await requireOrg();
  const { id } = await params;
  const order = await db.order.findFirst({
    where: { id, organizationId: orgId },
    include: {
      channel: true, location: true, items: true,
      movements: { include: { batch: true, sku: true, location: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();
  const next = NEXT[order.status] ?? [];

  return (
    <>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        subtitle={<><Link href="/app/orders" className="link">← Orders</Link> · {dateTime(order.orderDate)}</>}
        actions={order.invoiceNumber ? (
          <Link href={`/app/orders/${order.id}/invoice`} className="btn"><FileText className="h-4 w-4" /> Invoice {order.invoiceNumber}</Link>
        ) : (
          <form action={generateInvoice}><input type="hidden" name="id" value={order.id} /><Submit className="btn"><FileText className="h-4 w-4" /> Generate invoice</Submit></form>
        )}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card pad={false}>
            <table className="table">
              <thead><tr><th>Item</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">GST</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}><td>{i.name}<div className="font-mono text-xs text-slate-500">{i.skuCode}</div></td><td className="text-right">{i.quantity}</td><td className="text-right">{money(i.unitPrice)}</td><td className="text-right text-slate-500">{Number(i.gstRate)}%</td><td className="text-right">{money(i.total)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 border-t border-slate-100 px-5 py-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
              {Number(order.discount) > 0 && <div className="flex justify-between"><span>Discount</span><span>−{money(order.discount)}</span></div>}
              {Number(order.shippingFee) > 0 && <div className="flex justify-between"><span>Shipping</span><span>{money(order.shippingFee)}</span></div>}
              <div className="flex justify-between text-slate-500"><span>Includes GST</span><span>{money(order.taxTotal)}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{money(order.total)}</span></div>
            </div>
          </Card>
          <Card title="Stock movements" pad={false}>
            <table className="table">
              <thead><tr><th>When</th><th>SKU</th><th>Location</th><th>Batch</th><th>Type</th><th className="text-right">Qty</th></tr></thead>
              <tbody>
                {order.movements.length === 0 && <tr><td colSpan={6} className="text-center text-slate-500">No stock was moved for this order.</td></tr>}
                {order.movements.map((m) => (
                  <tr key={m.id}><td className="text-xs text-slate-500">{dateTime(m.createdAt)}</td><td className="font-mono text-xs">{m.sku.code}</td><td>{m.location.name}</td><td className="font-mono text-xs">{m.batch?.batchNo ?? "—"}</td><td>{label(m.type)}</td><td className={`text-right font-semibold ${m.quantity > 0 ? "text-green-700" : "text-red-600"}`}>{m.quantity}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Status">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone={channelTone[order.channel.type]}>{order.channel.name}</Badge>
              <Badge tone={statusTone[order.status]}>{label(order.status)}</Badge>
              <Badge tone={statusTone[order.paymentStatus]}>{label(order.paymentStatus)}</Badge>
            </div>
            {order.externalOrderId && <p className="text-sm">Channel order ID: <span className="font-mono">{order.externalOrderId}</span></p>}
            <p className="text-sm text-slate-500">Ships from {order.location?.name ?? "—"}</p>
            {next.length > 0 && (
              <ActionForm action={updateStatus} className="mt-4 space-y-2">
                <input type="hidden" name="id" value={order.id} />
                <select name="status" className="input" defaultValue={next[0]}>{next.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
                {next.includes("RETURNED") && (
                  <label className="flex items-center gap-2 text-xs text-slate-600"><select name="restock" className="input py-1 text-xs" defaultValue="on"><option value="on">Return items to stock</option><option value="off">Items damaged — don’t restock</option></select></label>
                )}
                <Submit className="btn w-full" confirm="Update order status?">Update status</Submit>
              </ActionForm>
            )}
            <ActionForm action={updatePayment} className="mt-3 flex gap-2">
              <input type="hidden" name="id" value={order.id} />
              <select name="paymentStatus" className="input" defaultValue={order.paymentStatus}>{["UNPAID", "PAID", "COD", "REFUNDED"].map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
              <Submit className="btn">Save</Submit>
            </ActionForm>
          </Card>
          <Card title="Customer">
            <dl className="space-y-1 text-sm">
              <div>{order.customerName ?? "Walk-in customer"}</div>
              {order.customerPhone && <div className="text-slate-600">{order.customerPhone}</div>}
              {order.customerEmail && <div className="text-slate-600">{order.customerEmail}</div>}
              {order.customerGstin && <div className="text-slate-600">GSTIN {order.customerGstin}</div>}
              {order.shippingAddress && <div className="whitespace-pre-line text-slate-600">{order.shippingAddress}</div>}
              {order.customerState && <div className="text-slate-600">{order.customerState}</div>}
              {order.notes && <div className="mt-2 rounded bg-slate-50 p-2 text-slate-600">{order.notes}</div>}
            </dl>
            <p className="mt-3 text-xs text-slate-400">Created {date(order.createdAt)}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
