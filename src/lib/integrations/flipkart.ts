import { IntegrationError, chunk, num, requestJson } from "./http";
import type { Connector, ConnectorContext, ExternalOrder, ExternalStatus, Listing } from "./types";

// Flipkart Marketplace Seller API v3.
function base(ctx: ConnectorContext) {
  if (process.env.FLIPKART_API_BASE) return process.env.FLIPKART_API_BASE;
  return ctx.creds.environment === "sandbox" ? "https://sandbox-api.flipkart.net" : "https://api.flipkart.net";
}

const tokens = new Map<string, { token: string; expires: number }>();

async function accessToken(ctx: ConnectorContext) {
  const { appId, appSecret } = ctx.creds;
  if (!appId || !appSecret) throw new IntegrationError("Application ID and secret are required");
  const cacheKey = `${base(ctx)}:${appId}`;
  const cached = tokens.get(cacheKey);
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const { data } = await requestJson<{ access_token: string; expires_in: number }>(
    `${base(ctx)}/oauth-service/oauth/token?grant_type=client_credentials&scope=Seller_Api`,
    { headers: { Authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}` } },
  );
  tokens.set(cacheKey, { token: data.access_token, expires: Date.now() + (data.expires_in || 3600) * 1000 });
  return data.access_token;
}

async function call<T>(ctx: ConnectorContext, path: string, init: RequestInit = {}) {
  const token = await accessToken(ctx);
  const { data } = await requestJson<T>(`${base(ctx)}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
  });
  return data;
}

type FkItem = {
  orderItemId: string; orderId: string; orderDate?: string; status?: string; sku: string; fsn?: string; quantity: number;
  priceComponents?: { sellingPrice?: number; totalPrice?: number; shippingCharge?: number };
};
type FkPage = { hasMore?: boolean; nextPageUrl?: string; shipments?: { orderItems: FkItem[] }[] };

export function mapFlipkartItems(items: FkItem[], status: ExternalStatus): ExternalOrder[] {
  const orders = new Map<string, ExternalOrder>();
  for (const i of items) {
    if (i.quantity <= 0) continue;
    let o = orders.get(i.orderId);
    if (!o) {
      o = { externalOrderId: i.orderId, orderDate: i.orderDate ? new Date(i.orderDate) : null, status, paymentStatus: "PAID", shippingFee: 0, lines: [] };
      orders.set(i.orderId, o);
    }
    o.shippingFee = (o.shippingFee ?? 0) + num(i.priceComponents?.shippingCharge);
    // sellingPrice is the order item's total after discounts, tax inclusive.
    const total = i.priceComponents?.sellingPrice;
    o.lines.push({
      externalSku: i.sku,
      externalId: i.fsn ?? null,
      quantity: i.quantity,
      unitPrice: total === undefined ? null : Math.round((num(total) / i.quantity) * 100) / 100,
    });
  }
  return [...orders.values()];
}

async function filterShipments(ctx: ConnectorContext, filter: Record<string, unknown>) {
  const items: FkItem[] = [];
  let page = await call<FkPage>(ctx, "/sellers/v3/shipments/filter/", {
    method: "POST",
    body: JSON.stringify({ filter, pagination: { pageSize: 20 } }),
  });
  for (let n = 0; n < 50; n++) {
    for (const s of page.shipments ?? []) items.push(...s.orderItems);
    if (!page.hasMore || !page.nextPageUrl) break;
    const next = page.nextPageUrl.startsWith("/sellers") ? page.nextPageUrl : `/sellers${page.nextPageUrl}`;
    page = await call<FkPage>(ctx, next);
  }
  return items;
}

export const flipkart: Connector = {
  provider: "FLIPKART",
  name: "Flipkart Seller Hub",
  setup: [
    "Log in to the Flipkart Seller API portal (seller.flipkart.com/api-docs) with your Seller Hub account.",
    "Create a self-access application to get an Application ID and Application Secret.",
    "Find your Location ID in Seller Hub → Manage Profile → Pickup Address (needed to update stock).",
  ],
  fields: [
    { key: "appId", label: "Application ID" },
    { key: "appSecret", label: "Application secret", type: "password" },
    { key: "locationId", label: "Flipkart location ID", placeholder: "LOC…", help: "The pickup location whose stock we update." },
    { key: "environment", label: "Environment", type: "select", options: [{ value: "production", label: "Production" }, { value: "sandbox", label: "Sandbox (testing)" }] },
  ],
  async test(ctx) {
    await accessToken(ctx);
    const to = new Date();
    await call(ctx, "/sellers/v3/shipments/filter/", {
      method: "POST",
      body: JSON.stringify({ filter: { type: "preDispatch", states: ["APPROVED"], orderDate: { from: new Date(to.getTime() - 86_400_000).toISOString(), to: to.toISOString() } }, pagination: { pageSize: 1 } }),
    });
    return { accountName: `Flipkart seller · app ${ctx.creds.appId.slice(0, 8)}…` };
  },
  async fetchOrders(ctx, since) {
    const range = { from: since.toISOString(), to: new Date().toISOString() };
    const open = await filterShipments(ctx, {
      type: "preDispatch",
      states: ["APPROVED", "PACKING_IN_PROGRESS", "PACKED", "FORM_FAILED", "READY_TO_DISPATCH"],
      orderDate: range,
    });
    let cancelled: FkItem[] = [];
    try {
      cancelled = await filterShipments(ctx, { type: "cancelled", states: ["CANCELLED"], cancellationDate: range });
    } catch {
      // Cancellation lookup is best-effort; open orders still sync.
    }
    return [...mapFlipkartItems(open, "CONFIRMED"), ...mapFlipkartItems(cancelled, "CANCELLED")];
  },
  async listListings(ctx, skuHints) {
    const out: Listing[] = [];
    for (const group of chunk(skuHints, 10)) {
      try {
        const data = await call<{ available?: Record<string, { product_id?: string }> }>(ctx, `/sellers/listings/v3/${group.map(encodeURIComponent).join(",")}`);
        for (const [sku, l] of Object.entries(data.available ?? {})) out.push({ externalSku: sku, externalId: l.product_id ?? null });
      } catch (e) {
        if ((e as IntegrationError).status !== 404) throw e;
      }
    }
    return out;
  },
  async pushStock(ctx, items) {
    const locationId = ctx.creds.locationId?.trim();
    if (!locationId) throw new IntegrationError("Add your Flipkart location ID to update stock");
    const errors: string[] = [];
    let updated = 0;
    const ready = items.filter((i) => {
      if (!i.externalId) errors.push(`${i.externalSku}: FSN unknown — click “Match listings”`);
      return !!i.externalId;
    });
    for (const group of chunk(ready, 10)) {
      const body = Object.fromEntries(group.map((i) => [i.externalSku, { product_id: i.externalId, locations: [{ id: locationId, inventory: i.quantity }] }]));
      try {
        const res = await call<Record<string, { status?: string; errors?: { description?: string }[] }>>(ctx, "/sellers/listings/v3/update/inventory", {
          method: "POST",
          body: JSON.stringify(body),
        });
        for (const i of group) {
          const r = res?.[i.externalSku];
          if (!r || r.status === "SUCCESS") updated++;
          else errors.push(`${i.externalSku}: ${r.errors?.map((e) => e.description).join("; ") || r.status}`);
        }
      } catch (e) {
        errors.push(...group.map((i) => `${i.externalSku}: ${(e as Error).message}`));
      }
    }
    return { updated, errors };
  },
};
