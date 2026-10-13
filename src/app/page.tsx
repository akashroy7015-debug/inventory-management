import Link from "next/link";
import { BarChart3, Boxes, CalendarClock, FileText, Plug, ShieldCheck, Store, Users } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { getSession } from "@/lib/auth";

const FEATURES = [
  { icon: Boxes, title: "One stock count", text: "Website, Amazon, Flipkart, Meesho and your shop all sell from the same live inventory. No more overselling." },
  { icon: Plug, title: "Channel sync", text: "Import Amazon & Flipkart order reports in one click, export stock files back, and connect your website by API." },
  { icon: CalendarClock, title: "Batches & expiry", text: "Track batch, manufacturing and expiry dates. Sales automatically use the oldest-expiring stock first." },
  { icon: Store, title: "Offline POS", text: "Fast counter billing with barcode scanning and printable GST invoices for walk-in and B2B sales." },
  { icon: BarChart3, title: "Reports that matter", text: "Sales by channel and product, GST summary, stock valuation, margins and slow movers." },
  { icon: Users, title: "Team & multiple brands", text: "Invite staff with roles, and manage several businesses from a single login." },
];

export default async function Home() {
  const loggedIn = !!(await getSession());
  return (
    <div className="bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 text-lg font-semibold text-brand-900"><Boxes className="h-6 w-6 text-brand-600" /> {APP_NAME}</span>
        <nav className="flex gap-2">
          {loggedIn ? <Link href="/app" className="btn btn-primary">Open dashboard</Link> : <>
            <Link href="/login" className="btn">Log in</Link>
            <Link href="/signup" className="btn btn-primary">Start free</Link>
          </>}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 text-center sm:pt-20">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Built for Indian D2C brands</span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Centralised inventory for <span className="text-brand-600">every place you sell</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">{APP_TAGLINE} Track batches and expiry, bill offline customers, and see exactly what sells where.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup" className="btn btn-primary px-6 py-3 text-base">Create your free account</Link>
          <Link href="/login" className="btn px-6 py-3 text-base">Log in</Link>
        </div>
        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {["Your website", "Amazon", "Flipkart", "Offline store"].map((c) => (
            <div key={c} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-700">{c}</div>
          ))}
        </div>
        <div className="mx-auto h-10 w-px bg-brand-500" />
        <div className="mx-auto inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-4 font-semibold text-white shadow-lg"><Boxes className="h-5 w-5" /> One live stock count</div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card card-pad">
              <Icon className="h-6 w-6 text-brand-600" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="flex justify-center gap-8 text-slate-500">
          <span className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" /> Your data is private to your business</span>
          <span className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" /> GST-ready invoices</span>
        </div>
        <h2 className="mt-8 text-3xl font-bold">Set up in under a minute</h2>
        <p className="mt-3 text-slate-600">Add products, enter opening stock, and start selling everywhere from one dashboard.</p>
        <Link href="/signup" className="btn btn-primary mt-6 px-6 py-3 text-base">Get started — it&apos;s free</Link>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">© {new Date().getFullYear()} {APP_NAME}</footer>
    </div>
  );
}
