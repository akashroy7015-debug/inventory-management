import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { requireOrg } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { Sidebar } from "@/components/sidebar";
import { logout, switchOrg } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, org, memberships } = await requireOrg();
  const footer = (
    <div className="space-y-2">
      <form action={switchOrg} className="flex gap-1">
        <select name="orgId" defaultValue={org.id} className="input py-1.5 text-xs" aria-label="Business">
          {memberships.map((m) => <option key={m.organizationId} value={m.organizationId}>{m.organization.name}</option>)}
        </select>
        <button className="btn btn-sm" type="submit">Go</button>
      </form>
      <Link href="/onboarding" className="flex items-center gap-1.5 px-1 text-xs text-slate-500 hover:text-brand-700"><Plus className="h-3 w-3" /> Add another business</Link>
      <div className="flex items-center justify-between px-1">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{user.name}</div>
          <div className="truncate text-xs text-slate-500">{user.email}</div>
        </div>
        <form action={logout}><button className="btn btn-sm" title="Log out" aria-label="Log out"><LogOut className="h-3.5 w-3.5" /></button></form>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen">
      <Sidebar appName={APP_NAME} footer={footer} />
      <main className="lg:pl-64 print:pl-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 print:p-0">{children}</div>
      </main>
    </div>
  );
}
