import { Logo } from "./logo";

const POINTS = [
  "Website, Amazon, Flipkart and your counter in sync",
  "Batch and expiry tracking built in",
  "GST-ready invoices from day one",
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap bg-white text-ink">
      <aside className="flex min-w-0 flex-[1_1_420px] flex-col justify-between gap-12 bg-ink p-8 text-white sm:p-12">
        <Logo tone="light" />
        <div className="flex max-w-[440px] flex-col gap-7">
          <p className="font-display text-[clamp(30px,4vw,48px)] font-bold leading-[1.05] tracking-[-0.035em]">
            Your whole inventory, finally in one place.
          </p>
          <ul className="flex flex-col gap-4 text-base text-[#d6ddd8]">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a9c9a4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                  <path d="M5 12l5 5L20 7" />
                </svg>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-[#a3ada6]">Free to start · No card needed</p>
      </aside>
      <main className="flex min-w-0 flex-[1_1_520px] items-center justify-center px-6 py-12">
        <div className="auth-form flex w-full max-w-[440px] flex-col gap-7">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[32px] font-bold tracking-[-0.03em]">{title}</h1>
            <p className="text-base text-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
