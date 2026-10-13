"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, Boxes, CalendarClock, Code2, LayoutDashboard, Menu, Package, Plug,
  Settings, ShoppingCart, Store, Warehouse, X,
} from "lucide-react";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/products", label: "Products", icon: Package },
  { href: "/app/inventory", label: "Inventory", icon: Boxes },
  { href: "/app/batches", label: "Batches & Expiry", icon: CalendarClock },
  { href: "/app/orders", label: "Orders", icon: ShoppingCart },
  { href: "/app/pos", label: "Offline POS", icon: Store },
  { href: "/app/channels", label: "Channels", icon: Plug },
  { href: "/app/locations", label: "Locations", icon: Warehouse },
  { href: "/app/reports", label: "Reports", icon: BarChart3 },
  { href: "/app/developers", label: "Website API", icon: Code2 },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ appName, footer }: { appName: string; footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="flex items-center gap-2 font-semibold text-brand-900"><Boxes className="h-5 w-5 text-brand-600" />{appName}</span>
        <button className="btn btn-sm" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
      </div>
      <aside className={`${open ? "block" : "hidden"} fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white lg:block print:hidden`}>
        <div className="flex h-full flex-col">
          <Link href="/app" className="hidden items-center gap-2 px-5 py-5 text-lg font-semibold text-brand-900 lg:flex">
            <Boxes className="h-6 w-6 text-brand-600" /> {appName}
          </Link>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-3">{footer}</div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}

