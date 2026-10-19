"use client";

import { useState } from "react";

const CASES = [
  {
    id: "d2c",
    label: "D2C brands",
    title: "Selling on your site and every marketplace",
    points: ["Amazon, Flipkart, Shopify and WooCommerce orders in one list", "Stock pushed to every listing after each sale", "Safety buffers so you never oversell on marketplaces"],
    stat: "4 channels", statLabel: "one stock count",
  },
  {
    id: "retail",
    label: "Shops & counters",
    title: "Billing walk-in customers fast",
    points: ["Barcode scan and one-tap billing", "GST invoice with CGST/SGST or IGST, amount in words", "Counter sales reduce online stock instantly"],
    stat: "1 tap", statLabel: "to print a GST bill",
  },
  {
    id: "food",
    label: "Food & wellness",
    title: "Products that expire",
    points: ["Batch, mfg and expiry date on every unit", "Oldest-expiring batch ships first, automatically", "Alerts at 30, 60 and 90 days before expiry"],
    stat: "FEFO", statLabel: "first-expiry, first-out",
  },
  {
    id: "multi",
    label: "Multiple brands",
    title: "Running more than one business",
    points: ["Separate workspace for each brand", "Switch businesses from one login", "Invite staff with Owner, Admin or Staff roles"],
    stat: "∞", statLabel: "workspaces per login",
  },
];

export function UseCases() {
  const [active, setActive] = useState(CASES[0].id);
  const c = CASES.find((x) => x.id === active)!;
  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" aria-label="Business type" className="flex flex-wrap gap-2">
        {CASES.map((x) => (
          <button
            key={x.id}
            role="tab"
            id={`tab-${x.id}`}
            aria-selected={x.id === active}
            aria-controls={`panel-${x.id}`}
            onClick={() => setActive(x.id)}
            className={`min-h-11 rounded-full px-5 text-[15px] font-medium transition ${x.id === active ? "bg-ink text-white" : "border border-line text-ink hover:border-ink"}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div key={c.id} role="tabpanel" id={`panel-${c.id}`} aria-labelledby={`tab-${c.id}`} className="anim-rise grid items-center gap-8 rounded-[28px] bg-mist p-8 sm:p-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-5">
          <h3 className="font-display text-[clamp(26px,3vw,36px)] font-bold leading-tight tracking-[-0.03em]">{c.title}</h3>
          <ul className="flex flex-col gap-3 text-base">
            {c.points.map((p) => (
              <li key={p} className="flex gap-3">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-brand-600"><path d="M5 12l5 5L20 7" /></svg>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-start gap-1 rounded-3xl bg-ink p-8 text-white">
          <span className="font-display text-6xl font-bold tracking-[-0.04em]">{c.stat}</span>
          <span className="text-[#c4ccc6]">{c.statLabel}</span>
        </div>
      </div>
    </div>
  );
}
