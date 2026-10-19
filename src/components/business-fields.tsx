import { INDIAN_STATES } from "@/lib/india";

export function BusinessFields() {
  return (
    <>
      <div>
        <label className="label" htmlFor="company">Business / brand name</label>
        <input className="input" id="company" name="company" required placeholder="e.g. Moriveda" autoComplete="organization" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="gstin">GSTIN (optional)</label>
          <input className="input" id="gstin" name="gstin" placeholder="22AAAAA0000A1Z5" />
        </div>
        <div>
          <label className="label" htmlFor="state">State</label>
          <select className="input" id="state" name="state" defaultValue="">
            <option value="">Select…</option>
            {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </>
  );
}
