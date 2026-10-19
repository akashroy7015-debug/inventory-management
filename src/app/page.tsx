import Link from "next/link";
import { getSession } from "@/lib/auth";
import { APP_NAME, GROWTH_PLAN } from "@/lib/brand";
import { Logo, LogoMark } from "@/components/logo";
import { HeroVisual } from "@/components/landing/hero-visual";
import { SyncSimulator } from "@/components/landing/sync-simulator";
import { UseCases } from "@/components/landing/use-cases";
import { Reveal } from "@/components/landing/reveal";

const CHANNELS = ["Amazon", "Flipkart", "Shopify", "WooCommerce", "Your website", "Shop counter", "Meesho (file import)", "Amazon FBA"];

const HUB = [
  { name: "Amazon", dot: "#E8890C", note: "SP-API" },
  { name: "Flipkart", dot: "#6B4FD8", note: "Seller API" },
  { name: "Shopify", dot: "#5E8E3E", note: "Admin API" },
  { name: "WooCommerce", dot: "#7F54B3", note: "REST API" },
  { name: "Website", dot: "#2D7DD2", note: "Website API" },
  { name: "Counter POS", dot: "#E5E7E3", note: "Built in" },
];

const BEFORE = [
  "Updating stock by hand in five dashboards",
  "Overselling on Amazon while the shop sold out",
  "Expired batches found in the warehouse",
  "Month-end GST from scattered spreadsheets",
];
const AFTER = [
  "One stock count, synced to every channel",
  "Safety buffers stop marketplace overselling",
  "Oldest-expiring stock ships first, automatically",
  "GST summary and sales register in one click",
];

const STEPS = [
  { n: "01", title: "Add products", text: "Each pack size as a SKU, with GST rate and opening stock by batch." },
  { n: "02", title: "Connect channels", text: "Paste your marketplace keys once. Listings link themselves by SKU." },
  { n: "03", title: "Sell everywhere", text: "Orders flow in, stock flows out — every sale updates every channel." },
];

const FAQ = [
  { q: "Do I need technical skills to connect Amazon or Flipkart?", a: "No. Each channel has a step-by-step guide inside the app. You paste your keys once and StockHub does the rest." },
  { q: "What happens if an order is cancelled?", a: "The units go back into stock automatically, into the exact batches they came from, and every channel is updated." },
  { q: "Can I use it for my shop counter too?", a: "Yes. The built-in billing screen works with a barcode scanner and prints GST invoices with CGST/SGST or IGST." },
  { q: "Is my data safe?", a: "Every business’s data is kept separate, and marketplace credentials are encrypted before they are stored." },
];

function Check({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`mt-0.5 shrink-0 ${className}`}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function Cross() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="mt-0.5 shrink-0 text-[#b4473b]">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function SectionHead({ eyebrow, title, sub, center = false }: { eyebrow: string; title: string; sub?: string; center?: boolean }) {
  return (
    <Reveal className={`flex max-w-[680px] flex-col gap-4 ${center ? "mx-auto items-center text-center" : ""}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="display text-[clamp(32px,4.2vw,52px)] leading-[1.05]">{title}</h2>
      {sub && <p className="text-lg leading-relaxed text-muted">{sub}</p>}
    </Reveal>
  );
}

export default async function Home() {
  const loggedIn = !!(await getSession());
  const startHref = loggedIn ? "/app" : "/signup";
  const startLabel = loggedIn ? "Open your dashboard" : "Create your free account";

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-ink">
      <noscript><style>{`.reveal{opacity:1;transform:none}`}</style></noscript>
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-[#eceeea] bg-white/85 backdrop-blur">
        <nav aria-label="Main" className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <Logo />
          <div className="hidden items-center gap-7 text-[15px] text-[#3d4a42] md:flex">
            <a href="#demo" className="hover:text-ink">Live demo</a>
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </div>
          <div className="flex items-center gap-2.5">
            {!loggedIn && <Link href="/login" className="inline-flex min-h-11 items-center px-4 text-[15px] font-medium">Log in</Link>}
            <Link href={startHref} className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-[15px] font-medium text-white hover:bg-ink-2">
              {loggedIn ? "Open dashboard" : "Start free"}
            </Link>
          </div>
        </nav>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="bg-grid relative">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-white" />
          <div className="relative mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-14 gap-y-20 px-6 pb-28 pt-16 sm:pt-24">
            <div className="anim-rise flex min-w-0 flex-[1_1_480px] flex-col gap-7">
              <span className="inline-flex items-center gap-2 self-start rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-sm font-medium text-[#1f5a33]">
                <span aria-hidden="true" className="anim-ping h-2 w-2 rounded-full bg-brand-500" />
                Live sync for Amazon, Flipkart, Shopify &amp; WooCommerce
              </span>
              <h1 className="display text-[clamp(44px,6.6vw,84px)] leading-[0.98] tracking-[-0.04em]">
                One stock count for <span className="relative whitespace-nowrap text-brand-600">every place<svg aria-hidden="true" viewBox="0 0 300 12" className="absolute -bottom-2 left-0 w-full" preserveAspectRatio="none"><path d="M2 9C80 2 220 2 298 7" fill="none" stroke="#bfe0b5" strokeWidth="6" strokeLinecap="round" /></svg></span> you sell.
              </h1>
              <p className="max-w-[540px] text-xl leading-[1.55] text-muted">
                Your website, Amazon, Flipkart and shop counter — synced from one calm dashboard. Sell anywhere. Never oversell.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={startHref} className="pill-primary">
                  {startLabel}
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
                </Link>
                <a href="#demo" className="pill-ghost bg-white">Try the live demo</a>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-subtle">
                <li className="flex items-center gap-1.5"><Check className="text-brand-600" />Free to start</li>
                <li className="flex items-center gap-1.5"><Check className="text-brand-600" />No card needed</li>
                <li className="flex items-center gap-1.5"><Check className="text-brand-600" />GST-ready</li>
              </ul>
            </div>
            <div className="flex min-w-0 flex-[1_1_460px] justify-center">
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* Channel marquee */}
        <section aria-label="Works with" className="border-y border-[#eceeea] bg-white py-6">
          <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
            <div className="anim-marquee flex w-max gap-14 pr-14">
              {[...CHANNELS, ...CHANNELS].map((n, k) => (
                <span key={k} aria-hidden={k >= CHANNELS.length} className="font-display text-2xl font-medium whitespace-nowrap text-[#3d4a42]">{n}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Live demo */}
        <section id="demo" className="mx-auto flex max-w-[1200px] scroll-mt-20 flex-col gap-12 px-6 py-28">
          <SectionHead eyebrow="Try it yourself" title="Sell a jar. Watch every channel update." sub="This is exactly what StockHub does with your real orders — click around." />
          <Reveal><SyncSimulator /></Reveal>
        </section>

        {/* Hub and spoke */}
        <section className="bg-ink text-white">
          <div className="mx-auto grid max-w-[1200px] items-center gap-16 px-6 py-28 lg:grid-cols-2">
            <Reveal className="flex flex-col gap-6">
              <span className="text-sm font-semibold uppercase tracking-[0.06em] text-[#a9c9a4]">Connect once</span>
              <h2 className="font-display text-[clamp(32px,4.2vw,52px)] font-bold leading-[1.05] tracking-[-0.03em] text-white">Every channel plugged into one source of truth.</h2>
              <p className="text-lg leading-relaxed text-[#c4ccc6]">
                Orders come in from each marketplace on their own. Every stock change — a sale, a return, a new batch — goes back out to all of them. Your keys are encrypted and only used to sync.
              </p>
              <ul className="grid gap-3 text-[15px] text-[#d6ddd8] sm:grid-cols-2">
                {["Auto-imports new orders", "Restocks cancelled orders", "Links listings by SKU", "Full sync history per channel"].map((x) => (
                  <li key={x} className="flex gap-2.5"><Check className="text-[#a9c9a4]" />{x}</li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={120} className="grid grid-cols-2 gap-3 sm:hidden">
              {HUB.map((h) => (
                <div key={h.name} className="flex flex-col gap-1 rounded-2xl border border-[#2c3a31] bg-ink-2 px-4 py-3.5">
                  <span className="flex items-center gap-2 text-sm font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: h.dot }} />{h.name}</span>
                  <span className="text-xs text-[#a3ada6]">{h.note}</span>
                </div>
              ))}
              <div className="col-span-2 flex items-center justify-center gap-2.5 rounded-2xl bg-brand-600 px-4 py-4 font-display font-bold">
                <LogoMark className="h-8 w-8 bg-white/15" /> All synced through {APP_NAME}
              </div>
            </Reveal>
            <Reveal delay={120} className="relative mx-auto hidden aspect-square w-full max-w-[480px] sm:block">
              <svg aria-hidden="true" viewBox="0 0 480 480" className="absolute inset-0 h-full w-full">
                {HUB.map((_, k) => {
                  const a = (Math.PI * 2 * k) / HUB.length - Math.PI / 2;
                  return <line key={k} x1="240" y1="240" x2={240 + Math.cos(a) * 180} y2={240 + Math.sin(a) * 180} stroke="#3a4a40" strokeWidth="2" className="anim-dash" />;
                })}
              </svg>
              <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1.5 rounded-[28px] bg-brand-600 shadow-[0_0_0_10px_rgba(46,139,79,0.15)]">
                <LogoMark className="h-10 w-10 bg-white/15" />
                <span className="font-display text-sm font-bold">{APP_NAME}</span>
              </div>
              {HUB.map((h, k) => {
                const a = (Math.PI * 2 * k) / HUB.length - Math.PI / 2;
                return (
                  <div
                    key={h.name}
                    className="absolute flex w-[130px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border border-[#2c3a31] bg-ink-2 px-3 py-3 text-center"
                    style={{ left: `${50 + Math.cos(a) * 37.5}%`, top: `${50 + Math.sin(a) * 37.5}%` }}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: h.dot }} />{h.name}</span>
                    <span className="text-[11px] text-[#a3ada6]">{h.note}</span>
                  </div>
                );
              })}
            </Reveal>
          </div>
        </section>

        {/* Bento features */}
        <section id="features" className="mx-auto flex max-w-[1200px] scroll-mt-20 flex-col gap-12 px-6 py-28">
          <SectionHead eyebrow="Everything in one place" title="Simple on the surface. Serious underneath." />
          <div className="grid gap-5 md:grid-cols-6">
            {/* Expiry */}
            <Reveal className="flex flex-col gap-5 rounded-[28px] bg-mist p-7 md:col-span-3">
              <div>
                <h3 className="text-xl font-semibold">Batches &amp; expiry, handled</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">Every unit carries its batch and expiry. Sales always ship the oldest-expiring stock first.</p>
              </div>
              <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 text-sm" aria-hidden="true">
                {[["MV2409", "Expires in 18 days", "bg-[#fdeceb] text-[#a3261c]", "ships first"], ["MV2411", "Expires in 74 days", "bg-[#fff4e0] text-[#8a5a00]", "next"], ["MV2412", "Expires in 11 months", "bg-brand-50 text-[#1f5a33]", "later"]].map(([b, e, c, t]) => (
                  <div key={b} className="flex items-center justify-between rounded-xl px-2 py-2">
                    <span className="font-mono">{b}</span><span className="text-muted">{e}</span><span className={`rounded-full px-2.5 py-0.5 text-xs ${c}`}>{t}</span>
                  </div>
                ))}
              </div>
            </Reveal>
            {/* Invoice */}
            <Reveal delay={80} className="flex flex-col gap-5 rounded-[28px] bg-mist p-7 md:col-span-3">
              <div>
                <h3 className="text-xl font-semibold">Counter billing with GST invoices</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">Scan, bill and print in seconds — CGST/SGST or IGST worked out for you.</p>
              </div>
              <div className="rounded-2xl bg-white p-5 text-sm" aria-hidden="true">
                <div className="flex justify-between border-b border-dashed border-line pb-2.5 font-semibold"><span>TAX INVOICE</span><span className="font-mono">MV-00042</span></div>
                <div className="flex justify-between py-2"><span>Moringa Powder 250 g × 2</span><span className="font-mono">₹698.00</span></div>
                <div className="flex justify-between text-muted"><span>CGST 2.5% · SGST 2.5%</span><span className="font-mono">₹33.24</span></div>
                <div className="mt-2.5 flex justify-between border-t border-line pt-2.5 font-semibold"><span>Total</span><span className="font-mono">₹698.00</span></div>
              </div>
            </Reveal>
            {/* Reports */}
            <Reveal className="flex flex-col gap-5 rounded-[28px] bg-mist p-7 md:col-span-2">
              <h3 className="text-xl font-semibold">Reports that matter</h3>
              <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 text-sm" aria-hidden="true">
                {[["Website", 82, "#2D7DD2"], ["Amazon", 64, "#E8890C"], ["Flipkart", 47, "#6B4FD8"], ["Counter", 30, "#101A14"]].map(([n, w, c]) => (
                  <div key={n as string}>
                    <div className="mb-1 text-xs text-muted">{n}</div>
                    <div className="h-2 rounded-full bg-mist"><div className="h-2 rounded-full" style={{ width: `${w}%`, background: c as string }} /></div>
                  </div>
                ))}
              </div>
              <p className="text-[15px] text-muted">Sales by channel, GST summary, margins and slow movers.</p>
            </Reveal>
            {/* Buffers */}
            <Reveal delay={80} className="flex flex-col gap-5 rounded-[28px] bg-brand-600 p-7 text-white md:col-span-2">
              <h3 className="text-xl font-semibold text-white">Never oversell</h3>
              <div className="flex items-end gap-3" aria-hidden="true">
                <span className="font-mono text-5xl font-medium">44</span>
                <span className="pb-1.5 text-sm text-[#d6ecd0]">shown on Amazon<br />of 46 in stock</span>
              </div>
              <p className="text-[15px] text-[#e4f0e0]">A safety buffer per channel absorbs late orders and slow marketplace updates.</p>
            </Reveal>
            {/* Team & security */}
            <Reveal delay={160} className="flex flex-col gap-5 rounded-[28px] bg-mist p-7 md:col-span-2">
              <h3 className="text-xl font-semibold">Team access, kept private</h3>
              <div className="flex -space-x-2" aria-hidden="true">
                {[["AS", "#1F6B3A"], ["RK", "#2D7DD2"], ["PM", "#E8890C"], ["+3", "#101A14"]].map(([i, c]) => (
                  <span key={i} className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-mist text-sm font-semibold text-white" style={{ background: c }}>{i}</span>
                ))}
              </div>
              <p className="text-[15px] text-muted">Owner, Admin and Staff roles. Each business’s data is separate; marketplace keys are encrypted.</p>
            </Reveal>
          </div>
        </section>

        {/* Before / after */}
        <section className="bg-mist">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-6 py-28">
            <SectionHead eyebrow="Why switch" title="From five dashboards to one." center />
            <div className="grid gap-5 md:grid-cols-2">
              <Reveal className="flex flex-col gap-5 rounded-[28px] border border-line bg-white p-8">
                <span className="self-start rounded-full bg-[#fdeceb] px-3 py-1 text-sm font-medium text-[#a3261c]">Without StockHub</span>
                <ul className="flex flex-col gap-4 text-[17px] text-muted">
                  {BEFORE.map((x) => <li key={x} className="flex gap-3"><Cross />{x}</li>)}
                </ul>
              </Reveal>
              <Reveal delay={100} className="flex flex-col gap-5 rounded-[28px] border-2 border-brand-600 bg-white p-8">
                <span className="self-start rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-[#1f5a33]">With StockHub</span>
                <ul className="flex flex-col gap-4 text-[17px]">
                  {AFTER.map((x) => <li key={x} className="flex gap-3"><Check className="text-brand-600" />{x}</li>)}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="mx-auto flex max-w-[1200px] flex-col gap-12 px-6 py-28">
          <SectionHead eyebrow="Made for how you sell" title="Pick your kind of business." />
          <Reveal><UseCases /></Reveal>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto flex max-w-[1200px] scroll-mt-20 flex-col gap-12 px-6 pb-28">
          <SectionHead eyebrow="How it works" title="Live in three steps. No spreadsheets." />
          <div className="relative grid gap-5 md:grid-cols-3">
            <div aria-hidden="true" className="absolute left-0 right-0 top-[52px] hidden h-px bg-line md:block" />
            {STEPS.map((s, k) => (
              <Reveal key={s.n} delay={k * 100} className="relative flex flex-col gap-4 rounded-[24px] border border-line bg-white p-8">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink font-mono text-sm text-white">{s.n}</span>
                <h3 className="text-[22px] font-semibold tracking-[-0.01em]">{s.title}</h3>
                <p className="text-base leading-relaxed text-muted">{s.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 bg-mist">
          <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-12 px-6 py-28">
            <SectionHead eyebrow="Pricing" title="Start free. Grow when you do." center />
            <Reveal className={`grid w-full gap-6 ${GROWTH_PLAN.price ? "max-w-[880px] md:grid-cols-2" : "max-w-[460px]"}`}>
              <div className="flex flex-col gap-5 rounded-[28px] border border-line bg-white p-9">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-semibold">Starter</h3>
                  <div className="font-display text-[48px] font-bold tracking-[-0.03em]">Free</div>
                  <p className="text-[15px] text-muted">Everything you need to get organised.</p>
                </div>
                <ul className="flex flex-col gap-3 text-[15px]">
                  {["Products, batches & multi-location stock", "Amazon, Flipkart, Shopify & WooCommerce sync", "Counter billing & GST invoices", "Reports and team access"].map((x) => (
                    <li key={x} className="flex gap-2.5"><Check className="text-brand-600" />{x}</li>
                  ))}
                </ul>
                <Link href={startHref} className="mt-auto inline-flex min-h-12 items-center justify-center rounded-full bg-brand-600 px-5 text-base font-semibold text-white hover:bg-brand-700">
                  {loggedIn ? "Open dashboard" : "Start free"}
                </Link>
              </div>
              {GROWTH_PLAN.price && (
                <div className="flex flex-col gap-5 rounded-[28px] border-2 border-brand-600 bg-white p-9">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-semibold">Growth</h3>
                    <div className="font-display text-[48px] font-bold tracking-[-0.03em]">
                      {GROWTH_PLAN.price}<span className="font-sans text-base font-normal text-muted"> / {GROWTH_PLAN.period}</span>
                    </div>
                    <p className="text-[15px] text-muted">For brands selling on every channel.</p>
                  </div>
                  <Link href={startHref} className="mt-auto inline-flex min-h-12 items-center justify-center rounded-full bg-brand-600 px-5 text-base font-semibold text-white hover:bg-brand-700">Start free trial</Link>
                </div>
              )}
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto flex max-w-[820px] scroll-mt-20 flex-col gap-10 px-6 py-28">
          <h2 className="display text-center text-[clamp(32px,4vw,48px)] leading-[1.1]">Questions, answered</h2>
          <div className="flex flex-col gap-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-line px-6 py-4 open:bg-mist">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl text-brand-600 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 pb-2 text-base leading-[1.65] text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 pb-28">
          <div className="bg-grid relative mx-auto max-w-[1152px] overflow-hidden rounded-[36px] bg-ink">
            <div className="absolute inset-0 bg-ink/85" />
            <div className="relative flex flex-col items-center gap-6 px-8 py-24 text-center text-white">
              <LogoMark className="h-12 w-12 rounded-[14px]" />
              <h2 className="max-w-[760px] font-display text-[clamp(34px,5vw,64px)] font-bold leading-[1.02] tracking-[-0.04em] text-white">Stop counting stock in five places.</h2>
              <p className="max-w-[520px] text-lg leading-relaxed text-[#c4ccc6]">Set up your products today and connect your first channel in minutes.</p>
              <Link href={startHref} className="pill-primary bg-brand-500 hover:bg-brand-600">{startLabel}</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#eceeea]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-subtle">
          <span className="flex items-center gap-2"><LogoMark className="h-6 w-6 rounded-md" />© {new Date().getFullYear()} {APP_NAME}</span>
          <div className="flex flex-wrap gap-6">
            <a href="#demo" className="hover:text-ink">Live demo</a>
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
            <Link href="/login" className="hover:text-ink">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
