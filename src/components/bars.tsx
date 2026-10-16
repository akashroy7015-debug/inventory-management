import type { Tone } from "./ui";
import { dayKey } from "@/lib/format";

const fill: Record<Tone, string> = {
  gray: "bg-slate-400", green: "bg-green-500", red: "bg-red-500", amber: "bg-amber-500", blue: "bg-blue-500", purple: "bg-purple-500",
};

/** Simple horizontal bar list — label, bar, value. */
export function Bars({ rows }: { rows: { label: string; value: number; display: string; tone?: Tone }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{r.label}</span><span className="text-slate-600">{r.display}</span></div>
          <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${fill[r.tone ?? "green"]}`} style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

/** Daily column chart for the last N days. */
export function DailyColumns({ days, values, format }: { days: string[]; values: number[]; format: (n: number) => string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-40 items-end gap-1">
      {days.map((d, i) => (
        <div key={d} className="group relative flex h-full flex-1 items-end">
          <div className="w-full rounded-t bg-brand-500/80 transition group-hover:bg-brand-600" style={{ height: `${Math.max(values[i] > 0 ? 3 : 0, (values[i] / max) * 100)}%` }} />
          <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">
            {new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}: {format(values[i])}
          </div>
        </div>
      ))}
    </div>
  );
}

export function lastNDays(n: number) {
  const out: string[] = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(new Date(now - i * 86_400_000)));
  return out;
}
