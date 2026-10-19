import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-brand-600">{eyebrow}</div>}
        <h1 className="display text-[28px] leading-tight sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "", pad = true }: {
  title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex min-h-12 items-center justify-between gap-2 border-b border-line px-5 py-3">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      <div className={pad ? "card-pad" : "overflow-x-auto"}>{children}</div>
    </section>
  );
}

const tones = {
  gray: "bg-slate-100 text-slate-700",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-800",
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

const statTones = {
  default: { chip: "bg-brand-50 text-brand-700", value: "text-ink" },
  amber: { chip: "bg-amber-50 text-amber-700", value: "text-amber-700" },
  red: { chip: "bg-red-50 text-red-700", value: "text-red-700" },
} as const;

export function Stat({ label, value, hint, tone, icon: Icon, href }: {
  label: string; value: ReactNode; hint?: ReactNode; tone?: "red" | "amber"; icon?: LucideIcon; href?: string;
}) {
  const t = statTones[tone ?? "default"];
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[13px] font-medium text-muted">{label}</div>
        {Icon && <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.chip}`}><Icon className="h-4 w-4" /></span>}
      </div>
      <div className={`mt-2 font-display text-[26px] font-bold leading-none tracking-[-0.02em] sm:text-[30px] ${t.value}`}>{value}</div>
      {hint && <div className="mt-2 flex items-center gap-1 text-xs text-subtle">{hint}{href && <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="card card-pad group block transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">{body}</Link>
  ) : <div className="card card-pad">{body}</div>;
}

export function Empty({ children, action }: { children: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="px-5 py-10 text-center text-sm text-subtle">
      {children}
      {action && (
        <div className="mt-3">
          <Link href={action.href} className="btn btn-primary">{action.label}</Link>
        </div>
      )}
    </div>
  );
}

export const statusTone: Record<string, Tone> = {
  PENDING: "amber",
  CONFIRMED: "blue",
  SHIPPED: "purple",
  DELIVERED: "green",
  CANCELLED: "gray",
  RETURNED: "red",
  PAID: "green",
  UNPAID: "amber",
  COD: "blue",
  REFUNDED: "gray",
};

export const channelTone: Record<string, Tone> = {
  WEBSITE: "blue",
  AMAZON: "amber",
  FLIPKART: "purple",
  OFFLINE: "green",
  MEESHO: "red",
  OTHER: "gray",
};
