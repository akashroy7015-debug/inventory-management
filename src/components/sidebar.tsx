"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "./logo";
import { InstallAppButton } from "./pwa";
import {
  BarChart3, Boxes, CalendarClock, Code2, LayoutDashboard, Menu, Package, Plug,
  Settings, ShoppingCart, Store, Warehouse, X,
} from "lucide-react";

const NAV = [
  { items: [{ href: "/app", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Stock",
    items: [
      { href: "/app/products", label: "Products", icon: Package },
      { href: "/app/inventory", label: "Inventory", icon: Boxes },
      { href: "/app/batches", label: "Batches & Expiry", icon: CalendarClock },
      { href: "/app/locations", label: "Locations", icon: Warehouse },
    ],
  },
  {
    title: "Sell",
    items: [
      { href: "/app/orders", label: "Orders", icon: ShoppingCart },
      { href: "/app/pos", label: "Offline POS", icon: Store },
      { href: "/app/channels", label: "Channels", icon: Plug },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/app/reports", label: "Reports", icon: BarChart3 },
      { href: "/app/developers", label: "Website API", icon: Code2 },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar({ appName, footer }: { appName: string; footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:hidden print:hidden">
        <Link href="/app" className="flex items-center gap-2 font-display text-lg font-bold tracking-[-0.02em] text-ink"><LogoMark className="h-7 w-7" />{appName}</Link>
        <div className="flex items-center gap-2">
          <InstallAppButton className="flex h-11 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white" />
          <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-ink" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <aside className={`${open ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-64 flex-col bg-ink pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white lg:flex print:hidden`}>
        <Link href="/app" className="flex items-center gap-2.5 px-5 py-5 font-display text-xl font-bold tracking-[-0.02em]">
          <LogoMark /> {appName}
        </Link>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-1" aria-label="Main">
          {NAV.map((group, i) => (
            <div key={group.title ?? i}>
              {group.title && <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">{group.title}</div>}
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                        active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-500" />}
                      <Icon className={`h-[18px] w-[18px] ${active ? "text-[#a9c9a4]" : ""}`} /> {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">{footer}</div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
