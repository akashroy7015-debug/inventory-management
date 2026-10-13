import { stateName } from "../india";
import { IntegrationError, chunk, num, requestJson } from "./http";
import type { Connector, ConnectorContext, ExternalOrder, ExternalStatus, Listing } from "./types";

function base(ctx: ConnectorContext) {
  const site = (ctx.creds.siteUrl ?? "").trim().replace(/\/+$/, "");
  if (!site) throw new IntegrationError("Enter your website address");
  return `${/^https?:\/\//.test(site) ? site : `https://${site}`}/wp-json/wc/v3`;
}

function headers(ctx: ConnectorContext) {
  const token = Buffer.from(`${ctx.creds.consumerKey ?? ""}:${ctx.creds.consumerSecret ?? ""}`).toString("base64");
  return { Authorization: `Basic ${token}`, "Content-Type": "application/json", Accept: "application/json" };
}

async function pages<T>(ctx: ConnectorContext, path: string, maxPages = 50): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const { data, headers: h } = await requestJson<T[]>(`${base(ctx)}/${path}${sep}per_page=100&page=${page}`, { headers: headers(ctx) });
    out.push(...data);
    const total = Number(h.get("x-wp-totalpages"));
    if (data.length < 100 || (total && page >= total)) break;
  }
  return out;
}

type WooOrder = {
  id: number; number: string; status: string; date_created_gmt: string; payment_method: string; date_paid_gmt: string | null;
  shipping_total: string; shipping_tax: string;
  billing: { first_name: string; last_name: string; email: string; phone: string; state: string };
  shipping: { first_name: string; last_name: string; address_1: string; city: string; state: string; postcode: string; phone?: string };
  line_items: { sku: string; quantity: number; total: string; total_tax: string; product_id: number; variation_id: number }[];
};

const STATUS: Record<string, ExternalStatus | null> = {
  processing: "CONFIRMED", "on-hold": "CONFIRMED", completed: "DELIVERED",
  cancelled: "CANCELLED", refunded: "CANCELLED", failed: "CANCELLED",
  pending: null, "checkout-draft": null, trash: "CANCELLED",
};

export function mapWooOrder(o: WooOrder): ExternalOrder | null {
  const status = o.status in STATUS ? STATUS[o.status] : "CONFIRMED";
  if (!status) return null; // awaiting payment — not a sale yet
  const s = o.shipping;
  const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || [o.billing.first_name, o.billing.last_name].filter(Boolean).join(" ");
  return {
    externalOrderId: String(o.number || o.id),
    orderDate: new Date(o.date_created_gmt + "Z"),
    status,
    paymentStatus: o.payment_method === "cod" ? "COD" : o.date_paid_gmt ? "PAID" : "UNPAID",
    customerName: name || null,
    customerPhone: s.phone || o.billing.phone || null,
    customerEmail: o.billing.email || null,
    customerState: stateName(s.state || o.billing.state),
    shippingAddress: [s.address_1, s.city, s.postcode].filter(Boolean).join(", ") || null,
    shippingFee: num(o.shipping_total) + num(o.shipping_tax),
    lines: o.line_items
      .filter((l) => l.quantity > 0)
      .map((l) => ({
        externalSku: l.sku ?? "",
        externalId: l.variation_id ? `${l.product_id}:${l.variation_id}` : String(l.product_id),
        quantity: l.quantity,
        // Line totals are after coupons, so no separate order discount.
        unitPrice: Math.round(((num(l.total) + num(l.total_tax)) / l.quantity) * 100) / 100,
      })),
  };
}

type WooProduct = { id: number; name: string; sku: string; type: string };

async function listings(ctx: ConnectorContext): Promise<Listing[]> {
  const products = await pages<WooProduct>(ctx, "products?status=any");
  const out: Listing[] = [];
  for (const p of products) {
    if (p.type === "variable") {
      const variations = await pages<{ id: number; sku: string; attributes: { option: string }[] }>(ctx, `products/${p.id}/variations`);
      for (const v of variations) {
        if (v.sku) out.push({ externalSku: v.sku, externalId: `${p.id}:${v.id}`, title: `${p.name} — ${v.attributes.map((a) => a.option).join(" / ")}` });
      }
    } else if (p.sku) {
      out.push({ externalSku: p.sku, externalId: String(p.id), title: p.name });
    }
  }
  return out;
}

export const woocommerce: Connector = {
  provider: "WOOCOMMERCE",
  name: "WooCommerce",
  setup: [
    "In WordPress open WooCommerce → Settings → Advanced → REST API → Add key.",
    "Choose your admin user and set Permissions to Read/Write, then Generate API key.",
    "Copy the Consumer key (ck_…) and Consumer secret (cs_…). Your site must use https.",
  ],
  fields: [
    { key: "siteUrl", label: "Website address", placeholder: "https://moriveda.in" },
    { key: "consumerKey", label: "Consumer key", placeholder: "ck_…" },
    { key: "consumerSecret", label: "Consumer secret", type: "password", placeholder: "cs_…" },
  ],
  async test(ctx) {
    await requestJson(`${base(ctx)}/products?per_page=1`, { headers: headers(ctx) });
    return { accountName: new URL(base(ctx)).host };
  },
  async fetchOrders(ctx, since) {
    const orders = await pages<WooOrder>(ctx, `orders?orderby=modified&order=asc&modified_after=${encodeURIComponent(since.toISOString())}`);
    return orders.map(mapWooOrder).filter((o): o is ExternalOrder => o !== null);
  },
  listListings: (ctx) => listings(ctx),
  async pushStock(ctx, items) {
    const errors: string[] = [];
    let updated = 0;
    let bySku: Map<string, string> | null = null;
    const simple: { id: number; sku: string; qty: number }[] = [];
    const variations = new Map<string, { id: number; sku: string; qty: number }[]>();
    for (const item of items) {
      let id = item.externalId;
      if (!id) {
        bySku ??= new Map((await listings(ctx)).map((l) => [l.externalSku.toLowerCase(), l.externalId!]));
        id = bySku.get(item.externalSku.toLowerCase()) ?? null;
      }
      if (!id) {
        errors.push(`${item.externalSku}: not found in WooCommerce`);
        continue;
      }
      const [parent, variation] = id.split(":");
      if (variation) {
        const list = variations.get(parent) ?? [];
        list.push({ id: Number(variation), sku: item.externalSku, qty: item.quantity });
        variations.set(parent, list);
      } else {
        simple.push({ id: Number(parent), sku: item.externalSku, qty: item.quantity });
      }
    }
    const send = async (path: string, rows: { id: number; sku: string; qty: number }[]) => {
      for (const group of chunk(rows, 100)) {
        try {
          const { data } = await requestJson<{ update?: { id: number; error?: { message: string } }[] }>(`${base(ctx)}/${path}`, {
            method: "POST",
            headers: headers(ctx),
            body: JSON.stringify({ update: group.map((r) => ({ id: r.id, manage_stock: true, stock_quantity: r.qty })) }),
          });
          for (const r of data.update ?? []) {
            if (r.error) errors.push(`#${r.id}: ${r.error.message}`);
            else updated++;
          }
        } catch (e) {
          errors.push(...group.map((r) => `${r.sku}: ${(e as Error).message}`));
        }
      }
    };
    await send("products/batch", simple);
    for (const [parent, rows] of variations) await send(`products/${parent}/variations/batch`, rows);
    return { updated, errors };
  },
};
