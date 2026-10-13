import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, money, num, round2, rupeesInWords } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pos?: string }> }) {
  const { orgId, org } = await requireOrg();
  const { id } = await params;
  const { pos } = await searchParams;
  const order = await db.order.findFirst({
    where: { id, organizationId: orgId },
    include: { items: { include: { sku: { include: { product: true } } } }, channel: true },
  });
  if (!order) notFound();

  const sameState = !order.customerState || !org.state || order.customerState.toLowerCase() === org.state.toLowerCase();
  const subtotal = num(order.subtotal);
  const factor = subtotal > 0 ? Math.max(0, subtotal - num(order.discount)) / subtotal : 1;
  const lines = order.items.map((i) => {
    const amount = round2(num(i.total) * factor);
    const rate = num(i.gstRate);
    const tax = round2((amount * rate) / (100 + rate));
    return { ...i, amount, rate, tax, taxable: round2(amount - tax), hsn: i.sku?.product.hsnCode ?? "" };
  });
  const taxable = round2(lines.reduce((s, l) => s + l.taxable, 0));
  const tax = round2(lines.reduce((s, l) => s + l.tax, 0));

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <PrintButton auto={!!pos} />
        <Link href={`/app/orders/${order.id}`} className="btn">View order</Link>
        {pos && <Link href="/app/pos" className="btn">New sale</Link>}
      </div>
      <article className="mx-auto max-w-3xl bg-white p-8 text-sm shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex justify-between gap-6 border-b pb-4">
          <div>
            <h1 className="text-xl font-bold">{org.name}</h1>
            {org.address && <p className="whitespace-pre-line text-slate-600">{org.address}</p>}
            {org.state && <p className="text-slate-600">{org.state}</p>}
            {org.phone && <p className="text-slate-600">Ph: {org.phone}</p>}
            {org.gstin && <p className="font-medium">GSTIN: {org.gstin}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-lg font-semibold uppercase tracking-wide">Tax Invoice</h2>
            <p>No: <strong>{order.invoiceNumber ?? order.orderNumber}</strong></p>
            <p>Date: {date(order.orderDate)}</p>
            <p className="text-slate-500">Order {order.orderNumber}{order.externalOrderId ? ` · ${order.externalOrderId}` : ""}</p>
          </div>
        </header>
        <section className="grid grid-cols-2 gap-6 border-b py-4">
          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-500">Bill to</h3>
            <p className="font-medium">{order.customerName ?? "Cash customer"}</p>
            {order.shippingAddress && <p className="whitespace-pre-line text-slate-600">{order.shippingAddress}</p>}
            {order.customerPhone && <p className="text-slate-600">{order.customerPhone}</p>}
            {order.customerGstin && <p>GSTIN: {order.customerGstin}</p>}
          </div>
          <div className="text-right">
            <h3 className="text-xs font-semibold uppercase text-slate-500">Place of supply</h3>
            <p>{order.customerState ?? org.state ?? "—"}</p>
            {order.paymentMethod && <p className="text-slate-600">Paid by {order.paymentMethod}</p>}
          </div>
        </section>
        <table className="mt-4 w-full text-left text-xs">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="p-2">#</th><th className="p-2">Item</th><th className="p-2">HSN</th><th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Rate</th><th className="p-2 text-right">Taxable</th><th className="p-2 text-right">GST</th>
              {sameState ? <><th className="p-2 text-right">CGST</th><th className="p-2 text-right">SGST</th></> : <th className="p-2 text-right">IGST</th>}
              <th className="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.id} className="border-b">
                <td className="p-2">{i + 1}</td>
                <td className="p-2">{l.name}<div className="text-slate-500">{l.skuCode}</div></td>
                <td className="p-2">{l.hsn}</td>
                <td className="p-2 text-right">{l.quantity}</td>
                <td className="p-2 text-right">{money(l.unitPrice)}</td>
                <td className="p-2 text-right">{money(l.taxable)}</td>
                <td className="p-2 text-right">{l.rate}%</td>
                {sameState ? <><td className="p-2 text-right">{money(l.tax / 2)}</td><td className="p-2 text-right">{money(l.tax / 2)}</td></> : <td className="p-2 text-right">{money(l.tax)}</td>}
                <td className="p-2 text-right">{money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <section className="ml-auto mt-4 w-72 space-y-1">
          <div className="flex justify-between"><span>Taxable value</span><span>{money(taxable)}</span></div>
          {sameState ? (
            <>
              <div className="flex justify-between"><span>CGST</span><span>{money(tax / 2)}</span></div>
              <div className="flex justify-between"><span>SGST</span><span>{money(tax / 2)}</span></div>
            </>
          ) : <div className="flex justify-between"><span>IGST</span><span>{money(tax)}</span></div>}
          {num(order.discount) > 0 && <div className="flex justify-between text-slate-500"><span>Discount applied</span><span>{money(order.discount)}</span></div>}
          {num(order.shippingFee) > 0 && <div className="flex justify-between"><span>Shipping</span><span>{money(order.shippingFee)}</span></div>}
          <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Total</span><span>{money(order.total)}</span></div>
        </section>
        <p className="mt-4 text-xs"><strong>Amount in words:</strong> {rupeesInWords(num(order.total))}</p>
        <footer className="mt-10 flex justify-between text-xs text-slate-500">
          <span>Thank you for your purchase!</span>
          <span>For {org.name}<br /><br />Authorised signatory</span>
        </footer>
      </article>
    </div>
  );
}
