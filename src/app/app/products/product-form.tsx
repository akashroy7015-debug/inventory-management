"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ActionForm, Submit } from "@/components/action-form";
import { GST_RATES } from "@/lib/india";
import { saveProduct } from "./actions";

export type VariantDraft = {
  id?: string; code: string; variantName: string; barcode: string; mrp: string; price: string;
  costPrice: string; weightGrams: string; lowStockThreshold: string; active: boolean;
};

export type ProductDraft = {
  id?: string; name: string; brand: string; category: string; description: string; hsnCode: string;
  gstRate: string; active: boolean; variants: VariantDraft[];
};

const blankVariant = (): VariantDraft => ({
  code: "", variantName: "", barcode: "", mrp: "", price: "", costPrice: "", weightGrams: "", lowStockThreshold: "10", active: true,
});

export function ProductForm({ initial, defaultBrand }: { initial?: ProductDraft; defaultBrand?: string }) {
  const [variants, setVariants] = useState<VariantDraft[]>(initial?.variants ?? [blankVariant()]);
  const update = (i: number, patch: Partial<VariantDraft>) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  return (
    <ActionForm action={saveProduct} className="space-y-6">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />

      <div className="card card-pad grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">Product name *</label>
          <input className="input" id="name" name="name" required defaultValue={initial?.name} placeholder="e.g. Organic Moringa Leaf Powder" />
        </div>
        <div>
          <label className="label" htmlFor="brand">Brand</label>
          <input className="input" id="brand" name="brand" defaultValue={initial?.brand ?? defaultBrand} />
        </div>
        <div>
          <label className="label" htmlFor="category">Category</label>
          <input className="input" id="category" name="category" defaultValue={initial?.category} placeholder="e.g. Superfood powders" />
        </div>
        <div>
          <label className="label" htmlFor="hsnCode">HSN code</label>
          <input className="input" id="hsnCode" name="hsnCode" defaultValue={initial?.hsnCode} placeholder="e.g. 1211" />
        </div>
        <div>
          <label className="label" htmlFor="gstRate">GST rate</label>
          <select className="input" id="gstRate" name="gstRate" defaultValue={initial?.gstRate ?? "5"}>
            {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="label" htmlFor="description">Description</label>
          <textarea className="input" id="description" name="description" rows={2} defaultValue={initial?.description} />
        </div>
        {initial?.id && (
          <label className="flex items-center gap-2 text-sm">
            <input type="hidden" name="active" value={initial.active ? "on" : "off"} />
            <input type="checkbox" defaultChecked={initial.active} onChange={(e) => {
              (e.currentTarget.previousElementSibling as HTMLInputElement).value = e.currentTarget.checked ? "on" : "off";
            }} /> Active (uncheck to archive)
          </label>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold">Variants / SKUs</h2>
            <p className="text-xs text-slate-500">One row per pack size or flavour. Prices include GST.</p>
          </div>
          <button type="button" className="btn btn-sm" onClick={() => setVariants((v) => [...v, blankVariant()])}><Plus className="h-3.5 w-3.5" /> Add variant</button>
        </div>
        <div className="overflow-x-auto">
          <table className="table min-w-[900px]">
            <thead>
              <tr><th>SKU code *</th><th>Variant</th><th>MRP</th><th>Selling price</th><th>Cost price</th><th>Barcode</th><th>Weight (g)</th><th>Reorder at</th><th /></tr>
            </thead>
            <tbody>
              {variants.map((v, i) => (
                <tr key={i} className={v.active ? "" : "opacity-50"}>
                  <td><input className="input font-mono uppercase" value={v.code} onChange={(e) => update(i, { code: e.target.value })} placeholder="MOR-250" aria-label="SKU code" required /></td>
                  <td><input className="input" value={v.variantName} onChange={(e) => update(i, { variantName: e.target.value })} placeholder="250 g" aria-label="Variant" /></td>
                  <td><input className="input w-24" type="number" step="0.01" min="0" value={v.mrp} onChange={(e) => update(i, { mrp: e.target.value })} aria-label="MRP" /></td>
                  <td><input className="input w-24" type="number" step="0.01" min="0" value={v.price} onChange={(e) => update(i, { price: e.target.value })} aria-label="Selling price" required /></td>
                  <td><input className="input w-24" type="number" step="0.01" min="0" value={v.costPrice} onChange={(e) => update(i, { costPrice: e.target.value })} aria-label="Cost price" /></td>
                  <td><input className="input w-32" value={v.barcode} onChange={(e) => update(i, { barcode: e.target.value })} aria-label="Barcode" /></td>
                  <td><input className="input w-20" type="number" min="0" value={v.weightGrams} onChange={(e) => update(i, { weightGrams: e.target.value })} aria-label="Weight" /></td>
                  <td><input className="input w-20" type="number" min="0" value={v.lowStockThreshold} onChange={(e) => update(i, { lowStockThreshold: e.target.value })} aria-label="Reorder level" /></td>
                  <td>
                    {v.id ? (
                      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={v.active} onChange={(e) => update(i, { active: e.target.checked })} /> Active</label>
                    ) : variants.length > 1 ? (
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} aria-label="Remove variant"><Trash2 className="h-3.5 w-3.5" /></button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Submit>{initial?.id ? "Save changes" : "Create product"}</Submit>
    </ActionForm>
  );
}
