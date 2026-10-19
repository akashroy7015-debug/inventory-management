import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { requireOrg } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { Sidebar } from "@/components/sidebar";
import { OrgSwitcher } from "@/components/org-switcher";
import { logout, switchOrg } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, org, memberships } = await requireOrg();
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
  const footer = (
    <div className="space-y-2">
      <OrgSwitcher action={switchOrg} current={org.id} orgs={memberships.map((m) => ({ id: m.organizationId, name: m.organization.name }))} />
      <Link href="/onboarding" className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white"><Plus className="h-3.5 w-3.5" /> Add another business</Link>
      <div className="flex items-center gap-2.5 rounded-xl bg-white/5 p-2">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold">{initials}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{user.name}</div>
          <div className="truncate text-xs text-white/55">{memberships.length > 1 ? org.name : user.email}</div>
        </div>
        <form action={logout}>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" title="Log out" aria-label="Log out"><LogOut className="h-4 w-4" /></button>
        </form>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen">
      <Sidebar appName={APP_NAME} footer={footer} />
      <main className="lg:pl-64 print:pl-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9 print:p-0">{children}</div>
      </main>
    </div>
  );
}
