import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { INDIAN_STATES } from "@/lib/india";
import { label } from "@/lib/format";
import { ActionForm, Submit } from "@/components/action-form";
import { Badge, Card, PageHeader } from "@/components/ui";
import { addMember, changePassword, removeMember, saveOrg } from "./actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { org, orgId, role } = await requireOrg();
  const members = await db.membership.findMany({ where: { organizationId: orgId }, include: { user: true }, orderBy: { createdAt: "asc" } });
  const canEdit = role !== "STAFF";
  return (
    <>
      <PageHeader title="Settings" subtitle={`Your role: ${label(role)}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Business details (shown on invoices)">
          <ActionForm action={saveOrg} className="space-y-3">
            <fieldset disabled={!canEdit} className="space-y-3">
              <div><label className="label">Business name</label><input className="input" name="name" defaultValue={org.name} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">GSTIN</label><input className="input" name="gstin" defaultValue={org.gstin ?? ""} /></div>
                <div>
                  <label className="label">State</label>
                  <select className="input" name="state" defaultValue={org.state ?? ""}><option value="">Select…</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select>
                </div>
                <div><label className="label">Phone</label><input className="input" name="phone" defaultValue={org.phone ?? ""} /></div>
                <div><label className="label">Email</label><input className="input" name="email" type="email" defaultValue={org.email ?? ""} /></div>
              </div>
              <div><label className="label">Address</label><textarea className="input" name="address" rows={3} defaultValue={org.address ?? ""} /></div>
              <div className="w-40"><label className="label">Invoice prefix</label><input className="input" name="invoicePrefix" defaultValue={org.invoicePrefix} /></div>
              {canEdit && <Submit>Save</Submit>}
            </fieldset>
          </ActionForm>
        </Card>
        <div className="space-y-6">
          <Card title="Team" pad={false}>
            <table className="table">
              <tbody>{members.map((m) => (
                <tr key={m.id}>
                  <td>{m.user.name}<div className="text-xs text-slate-500">{m.user.email}</div></td>
                  <td><Badge tone={m.role === "OWNER" ? "green" : m.role === "ADMIN" ? "blue" : "gray"}>{label(m.role)}</Badge></td>
                  <td className="text-right">{canEdit && m.role !== "OWNER" && (
                    <ActionForm action={removeMember}><input type="hidden" name="id" value={m.id} /><Submit className="btn btn-sm btn-danger" confirm="Remove this member?">Remove</Submit></ActionForm>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
            {canEdit && (
              <ActionForm action={addMember} reset className="space-y-3 border-t border-slate-100 p-5">
                <h3 className="text-sm font-semibold">Add team member</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input className="input" name="name" placeholder="Name" aria-label="Name" />
                  <input className="input" name="email" type="email" placeholder="Email" aria-label="Email" required />
                </div>
                <div className="flex gap-2">
                  <select className="input" name="role" defaultValue="STAFF" aria-label="Role"><option value="STAFF">Staff — orders, stock, POS</option><option value="ADMIN">Admin — everything except API key</option></select>
                  <Submit>Add</Submit>
                </div>
              </ActionForm>
            )}
          </Card>
          <Card title="Change password">
            <ActionForm action={changePassword} reset className="grid grid-cols-2 gap-3">
              <input className="input" name="current" type="password" placeholder="Current password" aria-label="Current password" required />
              <input className="input" name="next" type="password" placeholder="New password" aria-label="New password" minLength={8} required />
              <div className="col-span-2"><Submit className="btn">Change password</Submit></div>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
