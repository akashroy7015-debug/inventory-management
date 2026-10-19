"use client";

/** Business picker that switches as soon as a different business is chosen. */
export function OrgSwitcher({ action, current, orgs }: {
  action: (formData: FormData) => void | Promise<void>;
  current: string;
  orgs: { id: string; name: string }[];
}) {
  if (orgs.length < 2) return null;
  return (
    <form action={action}>
      <label htmlFor="org-switch" className="sr-only">Switch business</label>
      <select
        id="org-switch"
        name="orgId"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="block w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-500 [&>option]:text-ink"
      >
        {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </form>
  );
}
