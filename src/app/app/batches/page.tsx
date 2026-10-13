import { requireOrg } from "@/lib/auth";
import { date, daysUntil } from "@/lib/format";
import { batchesWithStock } from "@/lib/queries";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Batches & expiry" };

export default async function BatchesPage({ searchParams }: { searchParams: Promise<{ within?: string }> }) {
  const { orgId } = await requireOrg();
  const { within } = await searchParams;
  const limit = within ? Number(within) : null;
  const rows = (await batchesWithStock(orgId)).filter(
    (b) => !limit || (b.expiryDate && daysUntil(b.expiryDate) <= limit),
  );
  return (
    <>
      <PageHeader title="Batches & expiry" subtitle="Stock by batch, soonest expiry first. Sales always use the oldest-expiring batch first (FEFO)." />
      <form className="mb-4 flex gap-2">
        <select className="input w-auto" name="within" defaultValue={within ?? ""}>
          <option value="">All batches in stock</option>
          <option value="0">Already expired</option>
          <option value="30">Expiring in 30 days</option>
          <option value="60">Expiring in 60 days</option>
          <option value="90">Expiring in 90 days</option>
        </select>
        <button className="btn">Filter</button>
      </form>
      <Card pad={false}>
        {rows.length ? (
          <table className="table">
            <thead><tr><th>Batch</th><th>SKU</th><th>Product</th><th>Location</th><th>Mfg</th><th>Expiry</th><th className="text-right">Qty</th></tr></thead>
            <tbody>{rows.map((b) => {
              const d = b.expiryDate ? daysUntil(b.expiryDate) : null;
              return (
                <tr key={b.id}>
                  <td className="font-mono text-xs">{b.batchNo}</td>
                  <td className="font-mono text-xs">{b.skuCode}</td>
                  <td>{b.name}</td>
                  <td>{b.location}</td>
                  <td>{date(b.mfgDate)}</td>
                  <td>{date(b.expiryDate)} {d !== null && <Badge tone={d < 0 ? "red" : d <= 30 ? "red" : d <= 90 ? "amber" : "green"}>{d < 0 ? "Expired" : `${d}d`}</Badge>}</td>
                  <td className="text-right font-semibold">{b.quantity}</td>
                </tr>
              );
            })}</tbody>
          </table>
        ) : <Empty>No batch-tracked stock{limit !== null ? " in this range" : ""}. Enter a batch number when adding stock to track expiry.</Empty>}
      </Card>
    </>
  );
}
