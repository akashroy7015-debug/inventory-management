import Link from "next/link";
import { Boxes } from "lucide-react";
import { APP_NAME } from "@/lib/brand";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold text-brand-900">
          <Boxes className="h-6 w-6 text-brand-600" /> {APP_NAME}
        </Link>
        <div className="card p-8">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  );
}
