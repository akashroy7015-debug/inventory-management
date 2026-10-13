"use client";

import { useState } from "react";
import { ActionForm, Submit } from "@/components/action-form";
import { adjustStock, stockIn, transfer } from "./actions";

type Opt = { id: string; label: string };

function SkuSelect({ skus, defaultValue }: { skus: Opt[]; defaultValue?: string }) {
  return (
    <div>
      <label className="label">Product / SKU</label>
      <select className="input" name="skuId" required defaultValue={defaultValue ?? ""}>
        <option value="" disabled>Select…</option>
        {skus.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </div>
  );
}

function LocationSelect({ locations, name = "locationId", label = "Location", defaultValue }: { locations: Opt[]; name?: string; label?: string; defaultValue?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" name={name} required defaultValue={defaultValue ?? locations[0]?.id}>
        {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
      </select>
    </div>
  );
}

export function StockForms({ skus, locations, defaultSku }: { skus: Opt[]; locations: Opt[]; defaultSku?: string }) {
  const [tab, setTab] = useState<"in" | "adjust" | "transfer">("in");
  const tabs = [
    { id: "in", label: "Stock in" },
    { id: "adjust", label: "Adjust / count" },
    { id: "transfer", label: "Transfer" },
  ] as const;
  return (
    <div className="card">
      <div className="flex border-b border-slate-100">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-3 text-sm font-medium ${tab === t.id ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500 hover:text-slate-800"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="card-pad">
        {tab === "in" && (
          <ActionForm action={stockIn} reset className="space-y-3">
            <SkuSelect skus={skus} defaultValue={defaultSku} />
            <div className="grid grid-cols-2 gap-3">
              <LocationSelect locations={locations} />
              <div>
                <label className="label">Source</label>
                <select className="input" name="type" defaultValue="PURCHASE">
                  <option value="PURCHASE">Purchase</option>
                  <option value="PRODUCTION">Production / packing</option>
                  <option value="RETURN">Customer return</option>
                  <option value="ADJUSTMENT">Opening stock</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Quantity</label><input className="input" name="quantity" type="number" min="1" step="1" required /></div>
              <div><label className="label">Batch / lot no.</label><input className="input" name="batchNo" placeholder="Optional" /></div>
              <div><label className="label">Mfg date</label><input className="input" name="mfgDate" type="date" /></div>
              <div><label className="label">Expiry date</label><input className="input" name="expiryDate" type="date" /></div>
            </div>
            <div><label className="label">Reference / supplier</label><input className="input" name="reference" placeholder="Bill no., supplier…" /></div>
            <Submit className="btn btn-primary w-full">Add stock</Submit>
          </ActionForm>
        )}
        {tab === "adjust" && (
          <ActionForm action={adjustStock} reset className="space-y-3">
            <SkuSelect skus={skus} defaultValue={defaultSku} />
            <LocationSelect locations={locations} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select className="input" name="mode" defaultValue="count">
                  <option value="count">Set counted quantity</option>
                  <option value="add">Add</option>
                  <option value="remove">Remove</option>
                </select>
              </div>
              <div><label className="label">Quantity</label><input className="input" name="quantity" type="number" min="0" step="1" required /></div>
              <div>
                <label className="label">Reason</label>
                <select className="input" name="reason"><option value="ADJUSTMENT">Correction</option><option value="DAMAGE">Damaged / expired</option></select>
              </div>
              <div><label className="label">Batch no.</label><input className="input" name="batchNo" placeholder="All batches" /></div>
            </div>
            <div><label className="label">Note</label><input className="input" name="note" /></div>
            <Submit className="btn btn-primary w-full">Save adjustment</Submit>
          </ActionForm>
        )}
        {tab === "transfer" && (
          <ActionForm action={transfer} reset className="space-y-3">
            <SkuSelect skus={skus} defaultValue={defaultSku} />
            <div className="grid grid-cols-2 gap-3">
              <LocationSelect locations={locations} name="fromId" label="From" />
              <LocationSelect locations={locations} name="toId" label="To" defaultValue={locations[1]?.id} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Quantity</label><input className="input" name="quantity" type="number" min="1" step="1" required /></div>
              <div><label className="label">Reference</label><input className="input" name="reference" placeholder="e.g. FBA shipment ID" /></div>
            </div>
            <p className="text-xs text-slate-500">Oldest-expiry batches are moved first. Use this to send stock to Amazon FBA or your shop.</p>
            <Submit className="btn btn-primary w-full">Transfer</Submit>
          </ActionForm>
        )}
      </div>
    </div>
  );
}
