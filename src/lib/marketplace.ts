// Parses order reports downloaded from Amazon Seller Central, Flipkart Seller Hub,
// Meesho, Shopify/WooCommerce exports or a plain spreadsheet into one shape.
import Papa from "papaparse";

export type ParsedLine = { externalSku: string; quantity: number; unitPrice: number | null };
export type ParsedOrder = {
  externalOrderId: string;
  orderDate: Date | null;
  status: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerState: string | null;
  shippingAddress: string | null;
  lines: ParsedLine[];
};
export type ParseResult = { orders: ParsedOrder[]; errors: string[]; columns: string[] };

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

// Header aliases, compared after normalisation (lower-case, no punctuation).
const ALIASES = {
  orderId: ["amazonorderid", "orderid", "orderno", "ordernumber", "suborderno", "name", "order"],
  orderDate: ["purchasedate", "orderdate", "orderdatetime", "createdat", "date", "orderedon"],
  status: ["orderstatus", "itemstatus", "status", "financialstatus"],
  sku: ["sku", "sellersku", "skuid", "skucode", "lineitemsku", "productsku"],
  quantity: ["quantity", "quantitypurchased", "qty", "lineitemquantity", "units"],
  unitPrice: ["unitprice", "sellingpriceperitem", "priceperitem", "lineitemprice", "sellingprice", "price"],
  lineTotal: ["itemprice", "invoiceamount", "totalprice", "linetotal", "amount", "total"],
  customerName: ["buyername", "customername", "recipientname", "shippingname", "billingname", "customer"],
  customerPhone: ["buyerphonenumber", "customerphone", "phone", "phonenumber", "shippingphone", "mobile"],
  state: ["shipstate", "state", "shippingprovince", "shippingstate", "customerstate", "deliverystate"],
  city: ["shipcity", "city", "shippingcity"],
  address: ["shipaddress1", "address", "shippingaddress1", "shippingaddress", "deliveryaddress"],
  postal: ["shippostalcode", "pincode", "zip", "shippingzip", "postalcode"],
} as const;

type Field = keyof typeof ALIASES;

function mapColumns(headers: string[]) {
  const normalized = headers.map(norm);
  const map: Partial<Record<Field, string>> = {};
  for (const field of Object.keys(ALIASES) as Field[]) {
    // Prefer the earliest alias (most specific) that matches any header.
    for (const alias of ALIASES[field]) {
      const idx = normalized.indexOf(alias);
      if (idx >= 0 && !Object.values(map).includes(headers[idx])) {
        map[field] = headers[idx];
        break;
      }
    }
  }
  return map;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[₹,\s]|INR|Rs\.?/gi, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  // dd/mm/yyyy or dd-mm-yyyy (Indian exports)
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(.*)$/);
  if (m) {
    const d = new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}${m[4] ? "T" + m[4].trim().replace(/^T/, "") : ""}`);
    if (!Number.isNaN(d.getTime())) return d;
    const d2 = new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
    return Number.isNaN(d2.getTime()) ? null : d2;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseOrderReport(text: string): ParseResult {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.split("\t").length > firstLine.split(",").length ? "\t" : ",";
  const parsed = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: "greedy",
    delimiter,
    transformHeader: (h) => h.trim(),
  });
  const headers = parsed.meta.fields ?? [];
  const col = mapColumns(headers);
  const errors: string[] = [];

  if (!col.orderId || !col.sku) {
    return {
      orders: [],
      columns: headers,
      errors: ["Could not find the order ID and SKU columns. Expected headers like 'order-id' and 'sku'."],
    };
  }

  const get = (row: Record<string, string>, f: Field) => (col[f] ? (row[col[f]!] ?? "").trim() : "");
  const orders = new Map<string, ParsedOrder>();

  parsed.data.forEach((row, i) => {
    const id = get(row, "orderId");
    const sku = get(row, "sku");
    if (!id && !sku) return;
    if (!id || !sku) {
      errors.push(`Row ${i + 2}: missing order ID or SKU`);
      return;
    }
    const quantity = Math.trunc(toNumber(get(row, "quantity")) ?? 1);
    if (quantity <= 0) return; // cancelled lines in Amazon reports have quantity 0
    let unitPrice = toNumber(get(row, "unitPrice"));
    if (unitPrice === null) {
      const lineTotal = toNumber(get(row, "lineTotal"));
      unitPrice = lineTotal === null ? null : Math.round((lineTotal / quantity) * 100) / 100;
    }
    let order = orders.get(id);
    if (!order) {
      const address = [get(row, "address"), get(row, "city"), get(row, "state"), get(row, "postal")].filter(Boolean).join(", ");
      order = {
        externalOrderId: id,
        orderDate: parseDate(get(row, "orderDate")),
        status: get(row, "status") || null,
        customerName: get(row, "customerName") || null,
        customerPhone: get(row, "customerPhone") || null,
        customerState: get(row, "state") || null,
        shippingAddress: address || null,
        lines: [],
      };
      orders.set(id, order);
    }
    const existing = order.lines.find((l) => l.externalSku === sku);
    if (existing) existing.quantity += quantity;
    else order.lines.push({ externalSku: sku, quantity, unitPrice });
  });

  for (const e of parsed.errors.slice(0, 5)) errors.push(`Row ${(e.row ?? 0) + 2}: ${e.message}`);
  return { orders: [...orders.values()], errors, columns: headers };
}

export function isCancelledStatus(status: string | null) {
  return !!status && /cancel|refund|void/i.test(status);
}

export function toCsv(rows: (string | number | null)[][], delimiter = ",") {
  const esc = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[",\n\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(delimiter)).join("\n") + "\n";
}
