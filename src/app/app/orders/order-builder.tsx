"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { ActionForm, Submit } from "@/components/action-form";
import { INDIAN_STATES } from "@/lib/india";
import { createOrderAction } from "./actions";

export type BuilderSku = { id: string; code: string; name: string; barcode: string | null; price: number; gstRate: number; stock: number };
export type BuilderChannel = { id: string; name: string; type: string };
type Line = { skuId: string; quantity: number; unitPrice: number };

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

export function OrderBuilder({ skus, channels, mode }: { skus: BuilderSku[]; channels: BuilderChannel[]; mode: "order" | "pos" }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState("");
  const [discount, setDiscount] = useState(0);
  const [shipping, setShipping] = useState(0);
  const byId = useMemo(() => new Map(skus.map((s) => [s.id, s])), [skus]);
  const results = q
    ? skus.filter((s) => [s.code, s.name, s.barcode ?? ""].some((v) => v.toLowerCase().includes(q.toLowerCase()))).slice(0, 8)
    : [];

  const add = (s: BuilderSku) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.skuId === s.id);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, quantity: l.quantity + 1 } : l));
      return [...ls, { skuId: s.id, quantity: 1, unitPrice: s.price }];
    });
    setQ("");
  };
  const set = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const subtotal = lines.reduce((t, l) => t + l.quantity * l.unitPrice, 0);
  const total = Math.max(0, subtotal - discount) + shipping;

  return (
    <ActionForm action={createOrderAction} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <div className="space-y-4">
        <div className="card card-pad">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className="input pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const exact = skus.find((s) => s.barcode === q.trim() || s.code.toLowerCase() === q.trim().toLowerCase());
                if (exact) add(exact);
                else if (results.length === 1) add(results[0]);
              }}
              placeholder="Search product, SKU or scan barcode…"
              autoFocus={mode === "pos"}
              aria-label="Find product"
            />
            {results.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                {results.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => add(s)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50">
                      <span><span className="font-mono text-xs text-slate-500">{s.code}</span> {s.name}</span>
                      <span className="text-xs text-slate-500">{inr(s.price)} · {s.stock} in stock</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {mode === "pos" && skus.length <= 24 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {skus.map((s) => (
                <button key={s.id} type="button" onClick={() => add(s)} disabled={s.stock <= 0}
                  className="rounded-lg border border-slate-200 p-3 text-left text-sm hover:border-brand-500 hover:bg-brand-50 disabled:opacity-40">
                  <div className="font-medium leading-tight">{s.name}</div>
                  <div className="mt-1 flex justify-between text-xs text-slate-500"><span>{inr(s.price)}</span><span>{s.stock} left</span></div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Item</th><th className="w-32">Qty</th><th className="w-32">Price (incl. GST)</th><th className="text-right">Total</th><th /></tr></thead>
            <tbody>
              {lines.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No items yet — search above to add.</td></tr>}
              {lines.map((l, i) => {
                const s = byId.get(l.skuId)!;
                return (
                  <tr key={l.skuId}>
                    <td>{s.name}<div className="font-mono text-xs text-slate-500">{s.code} · {s.stock} in stock{l.quantity > s.stock && <span className="text-red-600"> · short</span>}</div></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button type="button" className="btn btn-sm" onClick={() => set(i, { quantity: Math.max(1, l.quantity - 1) })} aria-label="Less"><Minus className="h-3 w-3" /></button>
                        <input className="input w-14 px-1 text-center" type="number" min="1" value={l.quantity} onChange={(e) => set(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} aria-label="Quantity" />
                        <button type="button" className="btn btn-sm" onClick={() => set(i, { quantity: l.quantity + 1 })} aria-label="More"><Plus className="h-3 w-3" /></button>
                      </div>
                    </td>
                    <td><input className="input" type="number" min="0" step="0.01" value={l.unitPrice} onChange={(e) => set(i, { unitPrice: Number(e.target.value) || 0 })} aria-label="Unit price" /></td>
                    <td className="text-right font-medium">{inr(l.quantity * l.unitPrice)}</td>
                    <td><button type="button" className="btn btn-sm btn-danger" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card card-pad space-y-3">
          <div>
            <label className="label">Sales channel</label>
            <select className="input" name="channelId" required defaultValue={channels[0]?.id}>
              {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {mode === "order" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Channel order ID</label><input className="input" name="externalOrderId" placeholder="Optional" /></div>
                <div><label className="label">Order date</label><input className="input" name="orderDate" type="date" /></div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" name="status" defaultValue="CONFIRMED">
                    {["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"].map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Payment</label>
                  <select className="input" name="paymentStatus" defaultValue="UNPAID">
                    {["UNPAID", "PAID", "COD"].map((s) => <option key={s} value={s}>{s === "COD" ? "Cash on delivery" : s[0] + s.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" name="allowNegative" className="mt-0.5" /> Record even if stock is short (stock goes negative until you add it)</label>
            </>
          ) : (
            <div>
              <label className="label">Payment method</label>
              <select className="input" name="paymentMethod" defaultValue="Cash">{["Cash", "UPI", "Card", "Credit"].map((m) => <option key={m}>{m}</option>)}</select>
            </div>
          )}
        </div>

        <div className="card card-pad space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Customer name</label><input className="input" name="customerName" /></div>
            <div><label className="label">Phone</label><input className="input" name="customerPhone" type="tel" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Customer GSTIN</label><input className="input" name="customerGstin" placeholder="B2B only" /></div>
            <div>
              <label className="label">State</label>
              <select className="input" name="customerState" defaultValue=""><option value="">Same as business</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          </div>
          {mode === "order" && (
            <>
              <div><label className="label">Email</label><input className="input" name="customerEmail" type="email" /></div>
              <div><label className="label">Shipping address</label><textarea className="input" name="shippingAddress" rows={2} /></div>
            </>
          )}
        </div>

        <div className="card card-pad space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
          <div className="flex items-center justify-between gap-2"><label htmlFor="discount">Discount</label><input id="discount" className="input w-28 text-right" name="discount" type="number" min="0" step="0.01" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value) || 0)} /></div>
          {mode === "order" && <div className="flex items-center justify-between gap-2"><label htmlFor="shippingFee">Shipping</label><input id="shippingFee" className="input w-28 text-right" name="shippingFee" type="number" min="0" step="0.01" value={shipping || ""} onChange={(e) => setShipping(Number(e.target.value) || 0)} /></div>}
          <div className="flex justify-between border-t border-slate-100 pt-2 text-lg font-semibold"><span>Total</span><span>{inr(total)}</span></div>
          <Submit className="btn btn-primary w-full py-3 text-base">{mode === "pos" ? "Complete sale & print bill" : "Create order"}</Submit>
        </div>
      </div>
    </ActionForm>
  );
}
