export function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  return typeof v === "number" ? v : Number(String(v));
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function money(v: unknown, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(num(v));
}

export function int(v: unknown) {
  return new Intl.NumberFormat("en-IN").format(num(v));
}

export function date(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function dateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function daysUntil(d: Date | string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

/** GST included in a tax-inclusive amount. */
export function inclusiveTax(amount: number, rate: number) {
  return rate > 0 ? round2((amount * rate) / (100 + rate)) : 0;
}

export function label(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => (w === "fba" || w === "fc" ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}

/** Indian-system amount in words, e.g. 1,25,050.50 → "One Lakh Twenty Five Thousand Fifty Rupees and Fifty Paise Only". */
export function rupeesInWords(amount: number) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const parts: string[] = [];
  let n = rupees;
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  const hundred = Math.floor(n / 100); n %= 100;
  if (crore) parts.push(`${rupeesInWords(crore).replace(/ Rupees.*$/, "")} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (n) parts.push(twoDigits(n));
  const words = parts.join(" ") || "Zero";
  return `${words} Rupees${paise ? ` and ${twoDigits(paise)} Paise` : ""} Only`;
}

/** yyyy-mm-dd in the server's local time zone (set TZ=Asia/Kolkata in production). */
export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
