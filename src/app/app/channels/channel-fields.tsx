import { label } from "@/lib/format";

const TYPES = ["WEBSITE", "AMAZON", "FLIPKART", "OFFLINE", "MEESHO", "OTHER"];

export function ChannelFields({ c, locations }: {
  c?: { name: string; type: string; bufferQty: number; locationId: string | null; active: boolean };
  locations: { id: string; name: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div><label className="label">Name</label><input className="input" name="name" required defaultValue={c?.name} placeholder="e.g. Meesho" /></div>
      <div>
        <label className="label">Type</label>
        <select className="input" name="type" defaultValue={c?.type ?? "OTHER"}>{TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>
      </div>
      <div>
        <label className="label">Sell stock from</label>
        <select className="input" name="locationId" defaultValue={c?.locationId ?? ""}>
          <option value="">Default location</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Safety buffer (units)</label>
        <input className="input" name="bufferQty" type="number" min="0" defaultValue={c?.bufferQty ?? 0} />
      </div>
      {c && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={c.active} /> Active</label>}
    </div>
  );
}
