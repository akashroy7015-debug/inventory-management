export function parseRange(sp: { from?: string; to?: string }) {
  const now = new Date();
  const from = sp.from ? new Date(sp.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = sp.to ? new Date(`${sp.to}T23:59:59.999`) : now;
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from, to, fromStr: iso(from), toStr: iso(to) };
}
