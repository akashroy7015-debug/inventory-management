import Link from "next/link";
import { getSession } from "@/lib/auth";
import { APP_NAME, GROWTH_PLAN } from "@/lib/brand";
import { Logo } from "@/components/logo";

const CHANNELS = [
  { name: "Website", dot: "#2D7DD2", qty: 46 },
  { name: "Amazon", dot: "#E8890C", qty: 44 },
  { name: "Flipkart", dot: "#6B4FD8", qty: 44 },
  { name: "Shop counter", dot: "#101A14", qty: 46 },
];

const STEPS = [
  { n: "01", title: "Add your products", text: "Every pack size as its own SKU, with prices, GST rate and opening stock by batch." },
  { n: "02", title: "Connect your channels", text: "Paste your Amazon, Flipkart, Shopify or WooCommerce keys once. Listings link themselves by SKU." },
  { n: "03", title: "Sell everywhere", text: "Orders flow in on their own. Stock updates go out to every marketplace the moment anything sells." },
];

const icon = {
  sync: <><path d="M21 12a9 9 0 0 1-15.5 6.2" /><path d="M3 12a9 9 0 0 1 15.5-6.2" /><path d="M18 2v4h-4" /><path d="M6 22v-4h4" /></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></>,
  receipt: <><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 7h6M9 11h6M9 15h4" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  team: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18.5 14a6.5 6.5 0 0 1 3 6" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
};

const FEATURES = [
  { icon: icon.sync, title: "Live marketplace sync", text: "Orders in, stock out — Amazon, Flipkart, Shopify and WooCommerce, with a safety buffer per channel." },
  { icon: icon.calendar, title: "Batches & expiry", text: "Track batch, mfg and expiry dates. Sales always ship the oldest-expiring stock first." },
  { icon: icon.receipt, title: "Counter billing & GST invoices", text: "Scan, bill and print a GST tax invoice for walk-in and B2B customers in seconds." },
  { icon: icon.chart, title: "Reports that matter", text: "Sales by channel and product, GST summary, margins and slow movers — export for your accountant." },
  { icon: icon.team, title: "Team & multiple brands", text: "Invite staff with roles, and run several businesses from a single login." },
  { icon: icon.lock, title: "Private by design", text: "Your data stays with your business, and marketplace keys are stored encrypted." },
];

const FAQ = [
  { q: "Do I need technical skills to connect Amazon or Flipkart?", a: "No. Each channel has a step-by-step guide inside the app. You paste your keys once and StockHub does the rest." },
  { q: "What happens if an order is cancelled?", a: "The units go back into stock automatically, into the exact batches they came from, and every channel is updated." },
  { q: "Can I use it for my shop counter too?", a: "Yes. The built-in billing screen works with a barcode scanner and prints GST invoices with CGST/SGST or IGST." },
  { q: "Is my data safe?", a: "Every business’s data is kept separate, and marketplace credentials are encrypted before they are stored." },
];

function Svg({ children, size = 22, className = "" }: { children: React.ReactNode; size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  );
}

export default async function Home() {
  const loggedIn = !!(await getSession());
  const startHref = loggedIn ? "/app" : "/signup";

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="border-b border-[#eceeea]">
        <nav aria-label="Main" className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Logo />
          <div className="hidden flex-wrap items-center gap-7 text-[15px] text-[#3d4a42] md:flex">
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </div>
          <div className="flex items-center gap-2.5">
            {loggedIn ? (
              <Link href="/app" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-[15px] font-medium text-white hover:bg-ink-2">Open dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="inline-flex min-h-11 items-center px-4 text-[15px] font-medium">Log in</Link>
                <Link href="/signup" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-[15px] font-medium text-white hover:bg-ink-2">Start free</Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-6 pb-[72px] pt-16 sm:pt-[88px]">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-7">
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-brand-50 px-3.5 py-1.5 text-sm font-medium text-[#1f5a33]">
              <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-brand-600" />
              Built for Indian D2C brands
            </span>
            <h1 className="display text-[clamp(42px,6vw,72px)] leading-[1.02] tracking-[-0.035em]">One stock count for every place you sell.</h1>
            <p className="max-w-[520px] text-xl leading-[1.55] text-muted">
              Your website, Amazon, Flipkart and shop counter — synced from one calm dashboard. Sell anywhere. Never oversell.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={startHref} className="pill-primary">
                {loggedIn ? "Open your dashboard" : "Create your free account"}
                <Svg size={18}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></Svg>
              </Link>
              <a href="#how" className="pill-ghost">See how it works</a>
            </div>
            <p className="text-sm text-subtle">Free to start · No card needed · Set up in minutes</p>
          </div>

          {/* Product preview */}
          <div className="flex min-w-0 flex-[1_1_440px] justify-center">
            <div
              role="img"
              aria-label="Example: one product with 46 units in stock, shown as available on Website, Amazon, Flipkart and the shop counter"
              className="w-full max-w-[500px] overflow-hidden rounded-3xl border border-line bg-white shadow-[0_30px_60px_-30px_rgba(16,26,20,0.25)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#eef0ec] px-6 py-5">
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] text-subtle">MOR-250</span>
                  <span className="text-[17px] font-semibold">Moringa Powder · 250 g</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[34px] font-medium tracking-[-0.02em]">46</div>
                  <div className="text-xs text-subtle">units in stock</div>
                </div>
              </div>
              <div className="px-3 pb-3.5 pt-2">
                {CHANNELS.map((c) => (
                  <div key={c.name} className="flex items-center justify-between rounded-xl px-3 py-3.5">
                    <span className="flex items-center gap-3 text-[15px]">
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: c.dot }} />
                      {c.name}
                    </span>
                    <span className="flex items-center gap-3.5">
                      <span className="font-mono text-[15px]">{c.qty}</span>
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs text-[#1f5a33]">Synced</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 bg-mist px-6 py-3.5 text-[13px] text-muted">
                <Svg size={16}><path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="9" /></Svg>
                A safety buffer of 2 is held back on marketplaces.
              </div>
            </div>
          </div>
        </section>

        {/* Works with */}
        <section aria-label="Works with" className="border-y border-[#eceeea]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 py-7">
            <span className="text-sm text-subtle">Works with</span>
            {["Amazon", "Flipkart", "Shopify", "WooCommerce", "Your shop counter"].map((n) => (
              <span key={n} className="font-display text-xl font-medium text-[#3d4a42]">{n}</span>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto flex max-w-[1200px] scroll-mt-6 flex-col gap-14 px-6 pb-24 pt-28">
          <div className="flex max-w-[640px] flex-col gap-4">
            <span className="eyebrow">How it works</span>
            <h2 className="display text-[clamp(32px,4vw,48px)] leading-[1.08]">Live in three steps. No spreadsheets.</h2>
          </div>
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col gap-3.5 rounded-[20px] bg-mist p-8">
                <span className="font-mono text-[15px] text-brand-600">{s.n}</span>
                <h3 className="text-[22px] font-semibold tracking-[-0.01em]">{s.title}</h3>
                <p className="text-base leading-relaxed text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sync band */}
        <section className="bg-ink text-white">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-6 py-24">
            <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
              <h2 className="font-display text-[clamp(32px,4vw,48px)] font-bold leading-[1.08] tracking-[-0.03em] text-white">A sale anywhere updates stock everywhere.</h2>
              <p className="text-lg leading-relaxed text-[#c4ccc6]">
                Sold a jar at the counter? Amazon, Flipkart and your website know within moments. Cancelled order? The stock comes straight back.
              </p>
            </div>
            <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-3">
              {[
                ["Flipkart order · 1 × Moringa 250 g", "46 → 45"],
                ["Amazon listing updated", "43"],
                ["Website stock updated", "45"],
              ].map(([what, qty]) => (
                <div key={what} className="flex items-center gap-4 rounded-2xl bg-ink-2 px-5 py-[18px]">
                  <span className="w-16 shrink-0 font-mono text-[13px] text-[#a9c9a4]">10:42</span>
                  <span className="flex-1 text-base">{what}</span>
                  <span className="font-mono text-[15px]">{qty}</span>
                </div>
              ))}
              <p className="mt-1 text-[13px] text-[#a3ada6]">Example timeline</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto flex max-w-[1200px] scroll-mt-6 flex-col gap-14 px-6 py-28">
          <div className="flex max-w-[640px] flex-col gap-4">
            <span className="eyebrow">Everything in one place</span>
            <h2 className="display text-[clamp(32px,4vw,48px)] leading-[1.08]">Simple on the surface. Serious underneath.</h2>
          </div>
          <div className="grid gap-x-8 gap-y-10 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-[#1f5a33]"><Svg>{f.icon}</Svg></span>
                <h3 className="text-[19px] font-semibold">{f.title}</h3>
                <p className="text-base leading-relaxed text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-6 bg-mist">
          <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-12 px-6 py-28">
            <div className="flex max-w-[640px] flex-col items-center gap-4 text-center">
              <span className="eyebrow">Pricing</span>
              <h2 className="display text-[clamp(32px,4vw,48px)] leading-[1.08]">Start free. Grow when you do.</h2>
            </div>
            <div className={`grid w-full gap-6 ${GROWTH_PLAN.price ? "max-w-[880px] [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]" : "max-w-[440px]"}`}>
              <div className="flex flex-col gap-5 rounded-3xl border border-line bg-white p-9">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-semibold">Starter</h3>
                  <div className="font-display text-[44px] font-bold tracking-[-0.03em]">Free</div>
                  <p className="text-[15px] text-muted">Everything you need to get organised.</p>
                </div>
                <ul className="flex flex-col gap-3 text-[15px]">
                  {["Products, batches & multi-location stock", "Amazon, Flipkart, Shopify & WooCommerce sync", "Counter billing & GST invoices", "Reports and team access"].map((x) => (
                    <li key={x} className="flex gap-2.5"><Svg size={18} className="mt-0.5 shrink-0 text-brand-600"><path d="M5 12l5 5L20 7" /></Svg>{x}</li>
                  ))}
                </ul>
                <Link href={startHref} className="mt-auto inline-flex min-h-12 items-center justify-center rounded-full bg-brand-600 px-5 text-base font-semibold text-white hover:bg-brand-700">
                  {loggedIn ? "Open dashboard" : "Start free"}
                </Link>
              </div>
              {GROWTH_PLAN.price && (
                <div className="flex flex-col gap-5 rounded-3xl border-2 border-brand-600 bg-white p-9">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-semibold">Growth</h3>
                    <div className="font-display text-[44px] font-bold tracking-[-0.03em]">
                      {GROWTH_PLAN.price}<span className="font-sans text-base font-normal text-muted"> / {GROWTH_PLAN.period}</span>
                    </div>
                    <p className="text-[15px] text-muted">For brands selling on every channel.</p>
                  </div>
                  <Link href={startHref} className="mt-auto inline-flex min-h-12 items-center justify-center rounded-full bg-brand-600 px-5 text-base font-semibold text-white hover:bg-brand-700">Start free trial</Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto flex max-w-[820px] scroll-mt-6 flex-col gap-10 px-6 py-28">
          <h2 className="display text-center text-[clamp(32px,4vw,44px)] leading-[1.1]">Questions, answered</h2>
          <div className="flex flex-col border-t border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b border-line px-1 py-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden="true" className="text-[26px] text-brand-600 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-base leading-[1.65] text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 pb-28">
          <div className="mx-auto flex max-w-[1152px] flex-col items-center gap-6 rounded-[32px] bg-brand-600 px-8 py-20 text-center text-white">
            <h2 className="max-w-[760px] font-display text-[clamp(32px,4.5vw,56px)] font-bold leading-[1.05] tracking-[-0.035em] text-white">Stop counting stock in five places.</h2>
            <p className="max-w-[520px] text-lg leading-relaxed text-[#e4f0e0]">Set up your products today and connect your first channel in minutes.</p>
            <Link href={startHref} className="inline-flex min-h-[52px] items-center rounded-full bg-white px-8 text-[17px] font-semibold text-ink hover:bg-brand-50">
              {loggedIn ? "Open your dashboard" : "Create your free account"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#eceeea]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-subtle">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <div className="flex flex-wrap gap-6">
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
