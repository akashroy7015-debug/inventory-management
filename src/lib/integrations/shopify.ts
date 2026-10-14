import { IntegrationError, num, requestJson } from "./http";
import type { Connector, ConnectorContext, ExternalOrder, Listing } from "./types";

const VERSION = process.env.SHOPIFY_API_VERSION || "2025-10";

function shopBase(ctx: ConnectorContext) {
  let shop = (ctx.creds.shop ?? "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!shop) throw new IntegrationError("Enter your Shopify store address");
  if (!shop.includes(".")) shop = `${shop}.myshopify.com`;
  const scheme = process.env.ALLOW_PRIVATE_INTEGRATION_HOSTS === "1" && /^(localhost|127\.)/.test(shop) ? "http" : "https";
  return `${scheme}://${shop}/admin/api/${VERSION}`;
}

function headers(ctx: ConnectorContext) {
  return { "X-Shopify-Access-Token": ctx.creds.accessToken ?? "", "Content-Type": "application/json", Accept: "application/json" };
}

/** Follows Shopify's Link-header cursor pagination. */
async function getAll<T>(ctx: ConnectorContext, path: string, key: string, maxPages = 40): Promise<T[]> {
  const out: T[] = [];
  let url: string | null = `${shopBase(ctx)}/${path}`;
  for (let page = 0; url && page < maxPages; page++) {
    const res: { data: Record<string, T[]>; headers: Headers } = await requestJson<Record<string, T[]>>(url, { headers: headers(ctx) });
    out.push(...(res.data[key] ?? []));
    const link: string = res.headers.get("link") ?? "";
    url = link.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
  }
  return out;
}

type ShopifyOrder = {
  id: number; name: string; created_at: string; cancelled_at: string | null; email?: string;
  financial_status?: string; fulfillment_status?: string | null; taxes_included?: boolean;
  gateway?: string; payment_gateway_names?: string[]; total_discounts?: string;
  shipping_lines?: { price: string }[];
  line_items: { sku: string | null; variant_id: number | null; quantity: number; price: string; tax_lines?: { price: string }[] }[];
  shipping_address?: { name?: string; phone?: string; address1?: string; city?: string; province?: string; zip?: string } | null;
};

export function mapShopifyOrder(o: ShopifyOrder): ExternalOrder {
  const cod = [o.gateway, ...(o.payment_gateway_names ?? [])].some((g) => /cash on delivery|cod/i.test(g ?? ""));
  const a = o.shipping_address;
  return {
    externalOrderId: o.name,
    orderDate: new Date(o.created_at),
    status: o.cancelled_at || o.financial_status === "refunded" || o.financial_status === "voided"
      ? "CANCELLED"
      : o.fulfillment_status === "fulfilled" ? "SHIPPED" : "CONFIRMED",
    paymentStatus: o.financial_status === "paid" || o.financial_status === "partially_refunded" ? "PAID" : cod ? "COD" : "UNPAID",
    customerName: a?.name ?? null,
    customerPhone: a?.phone ?? null,
    customerEmail: o.email ?? null,
    customerState: a?.province ?? null,
    shippingAddress: [a?.address1, a?.city, a?.zip].filter(Boolean).join(", ") || null,
    discount: num(o.total_discounts),
    shippingFee: (o.shipping_lines ?? []).reduce((s, l) => s + num(l.price), 0),
    lines: o.line_items
      .filter((l) => l.quantity > 0)
      .map((l) => {
        const tax = o.taxes_included ? 0 : (l.tax_lines ?? []).reduce((s, t) => s + num(t.price), 0) / l.quantity;
        return { externalSku: l.sku ?? "", externalId: l.variant_id ? String(l.variant_id) : null, quantity: l.quantity, unitPrice: Math.round((num(l.price) + tax) * 100) / 100 };
      }),
  };
}

async function listings(ctx: ConnectorContext): Promise<Listing[]> {
  const products = await getAll<{ title: string; variants: { sku: string | null; inventory_item_id: number; title: string }[] }>(
    ctx, "products.json?limit=250&fields=id,title,variants", "products",
  );
  return products.flatMap((p) =>
    p.variants.filter((v) => v.sku).map((v) => ({
      externalSku: v.sku!,
      externalId: String(v.inventory_item_id),
      title: v.title && v.title !== "Default Title" ? `${p.title} — ${v.title}` : p.title,
    })),
  );
}

export const shopify: Connector = {
  provider: "SHOPIFY",
  name: "Shopify",
  setup: [
    "In Shopify admin open Settings → Apps and sales channels → Develop apps → Create an app.",
    "Configure Admin API scopes: read_orders, read_products, read_inventory, write_inventory, read_locations.",
    "Install the app and copy the Admin API access token (starts with shpat_).",
  ],
  fields: [
    { key: "shop", label: "Store address", placeholder: "yourstore.myshopify.com" },
    { key: "accessToken", label: "Admin API access token", type: "password", placeholder: "shpat_…" },
    { key: "locationId", label: "Shopify location ID", optional: true, help: "Leave blank to use your first active location." },
  ],
  async test(ctx) {
    const { data } = await requestJson<{ shop: { name: string; myshopify_domain: string } }>(`${shopBase(ctx)}/shop.json`, { headers: headers(ctx) });
    return { accountName: `${data.shop.name} (${data.shop.myshopify_domain})` };
  },
  async fetchOrders(ctx, since) {
    const orders = await getAll<ShopifyOrder>(ctx, `orders.json?status=any&limit=250&updated_at_min=${encodeURIComponent(since.toISOString())}`, "orders");
    return orders.map(mapShopifyOrder);
  },
  listListings: (ctx) => listings(ctx),
  async pushStock(ctx, items) {
    let locationId = ctx.creds.locationId?.trim();
    if (!locationId) {
      const { data } = await requestJson<{ locations: { id: number; active: boolean }[] }>(`${shopBase(ctx)}/locations.json`, { headers: headers(ctx) });
      const loc = data.locations.find((l) => l.active);
      if (!loc) throw new IntegrationError("No active Shopify location found");
      locationId = String(loc.id);
    }
    let bySku: Map<string, string> | null = null;
    const errors: string[] = [];
    let updated = 0;
    for (const item of items) {
      let inventoryItemId = item.externalId;
      if (!inventoryItemId) {
        bySku ??= new Map((await listings(ctx)).map((l) => [l.externalSku.toLowerCase(), l.externalId!]));
        inventoryItemId = bySku.get(item.externalSku.toLowerCase()) ?? null;
      }
      if (!inventoryItemId) {
        errors.push(`${item.externalSku}: not found in Shopify`);
        continue;
      }
      try {
        await requestJson(`${shopBase(ctx)}/inventory_levels/set.json`, {
          method: "POST",
          headers: headers(ctx),
          body: JSON.stringify({ location_id: Number(locationId), inventory_item_id: Number(inventoryItemId), available: item.quantity }),
        });
        updated++;
      } catch (e) {
        errors.push(`${item.externalSku}: ${(e as Error).message}`);
      }
    }
    return { updated, errors };
  },
};
