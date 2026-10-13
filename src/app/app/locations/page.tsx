import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { label } from "@/lib/format";
import { ActionForm, Submit } from "@/components/action-form";
import { Badge, Card, PageHeader } from "@/components/ui";
import { deleteLocation, saveLocation } from "./actions";

export const metadata = { title: "Locations" };

const TYPES = ["WAREHOUSE", "STORE", "AMAZON_FBA", "FLIPKART_FC", "OTHER"];

function LocationFields({ l }: { l?: { id: string; name: string; type: string; address: string | null; isDefault: boolean } }) {
  return (
    <>
      {l && <input type="hidden" name="id" value={l.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <div><label className="label">Name</label><input className="input" name="name" required defaultValue={l?.name} placeholder="e.g. Jaipur shop" /></div>
        <div>
          <label className="label">Type</label>
          <select className="input" name="type" defaultValue={l?.type ?? "WAREHOUSE"}>{TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>
        </div>
      </div>
      <div><label className="label">Address</label><input className="input" name="address" defaultValue={l?.address ?? ""} /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDefault" defaultChecked={l?.isDefault} /> Default location</label>
    </>
  );
}

export default async function LocationsPage() {
  const { orgId } = await requireOrg();
  const [locations, stock] = await Promise.all([
    db.location.findMany({ where: { organizationId: orgId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
    db.stockLevel.groupBy({ by: ["locationId"], where: { organizationId: orgId }, _sum: { quantity: true } }),
  ]);
  const units = new Map(stock.map((s) => [s.locationId, s._sum.quantity ?? 0]));
  return (
    <>
      <PageHeader title="Locations" subtitle="Warehouses, shops, and stock held at Amazon FBA or Flipkart fulfilment centres." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {locations.map((l) => (
            <Card key={l.id} title={<span className="flex items-center gap-2">{l.name} {l.isDefault && <Badge tone="green">Default</Badge>}</span>} actions={<span className="text-sm text-slate-500">{units.get(l.id) ?? 0} units · {label(l.type)}</span>}>
              <ActionForm action={saveLocation} className="space-y-3"><LocationFields l={l} /><Submit className="btn">Save</Submit></ActionForm>
              {!l.isDefault && (
                <ActionForm action={deleteLocation} className="mt-2"><input type="hidden" name="id" value={l.id} /><Submit className="btn btn-sm btn-danger" confirm="Delete this location?">Delete</Submit></ActionForm>
              )}
            </Card>
          ))}
        </div>
        <Card title="Add location">
          <ActionForm action={saveLocation} reset className="space-y-3"><LocationFields /><Submit>Add location</Submit></ActionForm>
        </Card>
      </div>
    </>
  );
}
