"use client";

import { useEffect, useState } from "react";

const EVENTS = [
  { channel: "Amazon", dot: "#E8890C", text: "New order · 1 × Moringa 250 g", delta: -1 },
  { channel: "Counter", dot: "#101A14", text: "Walk-in sale · 2 × Moringa 250 g", delta: -2 },
  { channel: "Warehouse", dot: "#1F6B3A", text: "Stock in · batch MV2411", delta: 24 },
  { channel: "Flipkart", dot: "#6B4FD8", text: "New order · 1 × Moringa 250 g", delta: -1 },
  { channel: "Website", dot: "#2D7DD2", text: "Order cancelled · restocked", delta: 1 },
];

const BARS = [38, 52, 44, 61, 57, 72, 66, 80, 74, 88, 82, 96];

/** Animated product preview: stock changes as example events arrive. */
export function HeroVisual() {
  const [i, setI] = useState(0);
  const [stock, setStock] = useState(46);
  const [feed, setFeed] = useState<{ id: number; e: (typeof EVENTS)[number] }[]>([{ id: 0, e: EVENTS[0] }]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setI((n) => {
        const next = (n + 1) % EVENTS.length;
        const e = EVENTS[next];
        setStock((s) => Math.max(0, s + e.delta));
        setFeed((f) => [{ id: Date.now(), e }, ...f].slice(0, 3));
        return next;
      });
    }, 2600);
    return () => clearInterval(t);
  }, []);

  const channels = [
    { name: "Website", dot: "#2D7DD2", qty: stock },
    { name: "Amazon", dot: "#E8890C", qty: Math.max(0, stock - 2) },
    { name: "Flipkart", dot: "#6B4FD8", qty: Math.max(0, stock - 2) },
    { name: "Counter", dot: "#101A14", qty: stock },
  ];

  return (
    <div className="relative flex w-full max-w-[560px] flex-col" aria-label="Example of StockHub updating stock across channels as orders arrive" role="img">
      {/* Dashboard card */}
      <div className="overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_40px_80px_-40px_rgba(16,26,20,0.35)]">
        <div className="flex items-center gap-2 border-b border-[#eef0ec] px-5 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e5e7e3]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e5e7e3]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e5e7e3]" />
          <span className="ml-3 text-xs text-subtle">stockhub · Dashboard</span>
        </div>
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
          <div className="rounded-2xl bg-mist p-4">
            <div className="text-[11px] uppercase tracking-wide text-subtle">In stock</div>
            <div key={stock} className="anim-flash mt-1 rounded font-mono text-3xl font-medium tracking-[-0.02em]">{stock}</div>
            <div className="text-[11px] text-subtle">Moringa 250 g</div>
          </div>
          <div className="rounded-2xl bg-mist p-4">
            <div className="text-[11px] uppercase tracking-wide text-subtle">Channels</div>
            <div className="mt-1 font-mono text-3xl font-medium">4</div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#1f5a33]"><span className="anim-ping h-1.5 w-1.5 rounded-full bg-brand-500" />all synced</div>
          </div>
          <div className="col-span-2 rounded-2xl bg-mist p-4 sm:col-span-1">
            <div className="text-[11px] uppercase tracking-wide text-subtle">Sales trend</div>
            <div className="mt-2 flex h-12 items-end gap-1">
              {BARS.map((h, k) => (
                <span key={k} className="flex-1 rounded-sm bg-brand-500/80" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
        <div className="px-3 pb-4">
          {channels.map((c) => (
            <div key={c.name} className="flex items-center justify-between rounded-xl px-3 py-2.5">
              <span className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.dot }} />
                {c.name}
              </span>
              <span className="flex items-center gap-3">
                <span key={`${c.name}-${c.qty}`} className="anim-flash rounded px-1 font-mono text-sm">{c.qty}</span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-[#1f5a33]">Synced</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating live feed */}
      <div className="anim-float relative z-10 -mt-7 ml-4 hidden w-[310px] flex-col gap-2 sm:flex lg:-ml-10">
        {feed.map(({ id, e }) => (
          <div key={id} className="anim-rise flex items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-[0_16px_40px_-20px_rgba(16,26,20,0.4)] backdrop-blur">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.dot }} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-subtle">{e.channel}</div>
              <div className="truncate text-[13px]">{e.text}</div>
            </div>
            <span className={`font-mono text-[13px] ${e.delta > 0 ? "text-brand-600" : "text-ink"}`}>{e.delta > 0 ? `+${e.delta}` : e.delta}</span>
          </div>
        ))}
      </div>
      <span className="sr-only">Example values: {i >= 0 ? `${stock} units in stock` : ""}</span>
    </div>
  );
}
