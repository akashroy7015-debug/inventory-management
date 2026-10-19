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
    <ActionForm action={createOrderAction} className="grid grid-cols-1 gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-0">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <div className="min-w-0 space-y-4">
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
                  <div className="mt-1 flex justify-between text-xs text-slate-500"><span>{inr(s.price)}</span><span className={s.stock <= 0 ? "font-medium text-red-700" : ""}>{s.stock <= 0 ? "Out of stock" : `${s.stock} left`}</span></div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="hidden grid-cols-[minmax(0,1fr)_8.5rem_7rem_6rem_2.5rem] gap-3 border-b border-line bg-mist px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
            <span>Item</span><span>Qty</span><span>Price (incl. GST)</span><span className="text-right">Total</span><span />
          </div>
          {lines.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">No items yet — search above to add.</p>}
          <ul className="divide-y divide-slate-100">
            {lines.map((l, i) => {
              const s = byId.get(l.skuId)!;
              return (
                <li key={l.skuId} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2.5 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_8.5rem_7rem_6rem_2.5rem]">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink">{s.name}</div>
                    <div className="font-mono text-xs text-slate-500">{s.code} · {s.stock} in stock{l.quantity > s.stock && <span className="text-red-600"> · short</span>}</div>
                  </div>
                  <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 sm:order-last" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label={`Remove ${s.name}`}><Trash2 className="h-4 w-4" /></button>
                  <div className="col-span-2 flex items-center gap-3 sm:contents">
                    <div className="flex items-center rounded-lg border border-slate-300">
                      <button type="button" className="flex h-10 w-10 items-center justify-center text-slate-600" onClick={() => set(i, { quantity: Math.max(1, l.quantity - 1) })} aria-label="Less"><Minus className="h-4 w-4" /></button>
                      <input className="h-10 w-12 border-x border-slate-300 bg-white text-center text-sm outline-none" inputMode="numeric" type="number" min="1" value={l.quantity} onChange={(e) => set(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} aria-label="Quantity" />
                      <button type="button" className="flex h-10 w-10 items-center justify-center text-slate-600" onClick={() => set(i, { quantity: l.quantity + 1 })} aria-label="More"><Plus className="h-4 w-4" /></button>
                    </div>
                    <label className="flex min-w-0 flex-1 items-center gap-1 sm:flex-none">
                      <span className="whitespace-nowrap text-sm text-slate-500 sm:hidden">@ ₹</span>
                      <input className="input min-w-0" inputMode="decimal" type="number" min="0" step="0.01" value={l.unitPrice} onChange={(e) => set(i, { unitPrice: Number(e.target.value) || 0 })} aria-label="Unit price" />
                    </label>
                    <div className="ml-auto text-right text-sm font-semibold sm:ml-0">{inr(l.quantity * l.unitPrice)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
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

      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden print:hidden">
          <div className="min-w-0">
            <div className="text-xs text-subtle">{(() => { const n = lines.reduce((t, l) => t + l.quantity, 0); return `${n} ${n === 1 ? "item" : "items"}`; })()}</div>
            <div className="font-display text-xl font-bold text-ink">{inr(total)}</div>
          </div>
          <Submit className="btn btn-primary ml-auto min-h-12 px-5 text-base">{mode === "pos" ? "Complete sale" : "Create order"}</Submit>
        </div>
      )}
    </ActionForm>
  );
}
