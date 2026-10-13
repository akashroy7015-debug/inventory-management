import Link from "next/link";
import { Plus } from "lucide-react";
import { requireOrg } from "@/lib/auth";
import { money } from "@/lib/format";
import { skusWithStock } from "@/lib/queries";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; archived?: string }> }) {
  const { orgId } = await requireOrg();
  const { q = "", archived } = await searchParams;
  const term = q.toLowerCase();
  const rows = (await skusWithStock(orgId)).filter(
    (s) =>
      (archived ? !s.active : s.active) &&
      (!term || [s.code, s.name, s.brand, s.category, s.barcode].some((v) => v?.toLowerCase().includes(term))),
  );
  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Your catalogue — every product and its pack sizes (SKUs)."
        actions={<Link href="/app/products/new" className="btn btn-primary"><Plus className="h-4 w-4" /> New product</Link>}
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" name="q" defaultValue={q} placeholder="Search name, SKU, barcode…" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="archived" value="1" defaultChecked={!!archived} /> Archived</label>
        <button className="btn">Search</button>
      </form>
      <Card pad={false}>
        {rows.length ? (
          <table className="table">
            <thead><tr><th>Product</th><th>SKU</th><th>Brand</th><th className="text-right">MRP</th><th className="text-right">Price</th><th className="text-right">GST</th><th className="text-right">In stock</th></tr></thead>
            <tbody>{rows.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/app/products/${s.productId}`} className="link">{s.productName}</Link>{s.variantName && <span className="text-slate-500"> — {s.variantName}</span>}</td>
                <td className="font-mono text-xs">{s.code}</td>
                <td>{s.brand ?? "—"}</td>
                <td className="text-right text-slate-500">{money(s.mrp)}</td>
                <td className="text-right">{money(s.price)}</td>
                <td className="text-right">{s.gstRate}%</td>
                <td className="text-right">{s.low ? <Badge tone={s.onHand <= 0 ? "red" : "amber"}>{s.onHand}</Badge> : s.onHand}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <Empty action={q ? undefined : { href: "/app/products/new", label: "Add a product" }}>{q ? "No products match your search." : "No products yet."}</Empty>}
      </Card>
    </>
  );
}
