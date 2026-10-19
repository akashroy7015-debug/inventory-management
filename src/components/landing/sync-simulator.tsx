"use client";

import { useState } from "react";

const CHANNELS = [
  { id: "website", name: "Website", dot: "#2D7DD2", buffer: 0 },
  { id: "amazon", name: "Amazon", dot: "#E8890C", buffer: 2 },
  { id: "flipkart", name: "Flipkart", dot: "#6B4FD8", buffer: 2 },
  { id: "counter", name: "Shop counter", dot: "#101A14", buffer: 0 },
] as const;

type Log = { id: number; text: string };

/** Interactive demo: sell or restock and watch every channel update. */
export function SyncSimulator() {
  const [stock, setStock] = useState(12);
  const [pulse, setPulse] = useState(0);
  const [log, setLog] = useState<Log[]>([{ id: 0, text: "Try selling a jar on any channel →" }]);

  const act = (delta: number, text: string) => {
    setStock((s) => Math.max(0, s + delta));
    setPulse((p) => p + 1);
    setLog((l) => [{ id: Date.now(), text }, ...l].slice(0, 4));
  };

  return (
    <div className="grid gap-6 rounded-[32px] border border-line bg-white p-5 shadow-[0_30px_60px_-40px_rgba(16,26,20,0.35)] sm:p-8 lg:grid-cols-[1fr_1.2fr]">
      <div className="flex flex-col gap-5">
        <div>
          <div className="text-sm text-subtle">Moringa Powder · 250 g</div>
          <div className="mt-1 flex items-end gap-3">
            <span key={pulse} className="anim-flash rounded-lg px-1 font-mono text-6xl font-medium tracking-[-0.03em]" aria-live="polite">{stock}</span>
            <span className="pb-2 text-sm text-subtle">units in your warehouse</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {CHANNELS.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={stock === 0}
              onClick={() => act(-1, `Sold 1 on ${c.name} · every channel updated`)}
              className="flex min-h-12 items-center gap-2.5 rounded-2xl border border-line px-4 text-left text-sm font-medium transition hover:border-ink disabled:opacity-40"
            >
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: c.dot }} />
              Sell on {c.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={() => act(10, "Stock in · +10 units, batch MV2412")} className="min-h-12 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">
            + Restock 10
          </button>
          <button type="button" onClick={() => act(1, "Amazon order cancelled · 1 unit restocked")} className="min-h-12 rounded-full border border-line px-5 text-sm font-medium hover:border-ink">
            Cancel an order
          </button>
        </div>
        <ul className="flex flex-col gap-1.5 text-[13px] text-muted" aria-label="Activity">
          {log.map((l) => (
            <li key={l.id} className="anim-rise flex items-center gap-2"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-500" />{l.text}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl bg-mist p-4 sm:p-5">
        <div className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-subtle">
          <span>Listed on</span><span>Available</span>
        </div>
        {CHANNELS.map((c) => {
          const qty = Math.max(0, stock - c.buffer);
          return (
            <div key={c.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5">
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: c.dot }} />
                <span className="text-[15px] font-medium">{c.name}</span>
                {c.buffer > 0 && <span className="rounded-full bg-[#fff4e0] px-2 py-0.5 text-[11px] text-[#8a5a00]">buffer {c.buffer}</span>}
              </span>
              <span className="flex items-center gap-3">
                <span key={`${c.id}-${pulse}`} className="anim-flash rounded px-1.5 font-mono text-lg">{qty}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs ${qty > 0 ? "bg-brand-50 text-[#1f5a33]" : "bg-[#fdeceb] text-[#a3261c]"}`}>{qty > 0 ? "In stock" : "Sold out"}</span>
              </span>
            </div>
          );
        })}
        <p className="px-1 text-xs text-subtle">Marketplaces keep a small buffer so a late order never oversells.</p>
      </div>
    </div>
  );
}
