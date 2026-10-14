import { IntegrationError, num, requestJson } from "./http";
import type { Connector, ConnectorContext, ExternalOrder, ExternalStatus, Listing } from "./types";

// Amazon Selling Partner API. India (A21TJRUUN4KGV) is served from the EU endpoint.
const REGIONS: Record<string, string> = {
  eu: "https://sellingpartnerapi-eu.amazon.com",
  na: "https://sellingpartnerapi-na.amazon.com",
  fe: "https://sellingpartnerapi-fe.amazon.com",
};
const endpoint = (ctx: ConnectorContext) => process.env.AMAZON_SPAPI_ENDPOINT || REGIONS[ctx.creds.region || "eu"] || REGIONS.eu;
const lwaUrl = () => process.env.AMAZON_LWA_ENDPOINT || "https://api.amazon.com/auth/o2/token";
const marketplace = (ctx: ConnectorContext) => ctx.creds.marketplaceId?.trim() || "A21TJRUUN4KGV";

const tokens = new Map<string, { token: string; expires: number }>();

async function accessToken(ctx: ConnectorContext) {
  const { clientId, clientSecret, refreshToken } = ctx.creds;
  if (!clientId || !clientSecret || !refreshToken) throw new IntegrationError("Client ID, client secret and refresh token are required");
  const cacheKey = `${clientId}:${refreshToken.slice(-12)}`;
  const cached = tokens.get(cacheKey);
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const { data } = await requestJson<{ access_token: string; expires_in: number }>(lwaUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret }).toString(),
  });
  tokens.set(cacheKey, { token: data.access_token, expires: Date.now() + data.expires_in * 1000 });
  return data.access_token;
}

async function call<T>(ctx: ConnectorContext, path: string, init: RequestInit = {}) {
  const token = await accessToken(ctx);
  const { data } = await requestJson<T>(`${endpoint(ctx)}${path}`, {
    ...init,
    headers: { "x-amz-access-token": token, "Content-Type": "application/json", Accept: "application/json", ...(init.headers ?? {}) },
    retries: 5, // SP-API rate limits are tight (orderItems: 0.5 req/s)
  });
  return data;
}

const STATUS: Record<string, ExternalStatus> = {
  Pending: "PENDING", PendingAvailability: "PENDING", Unshipped: "CONFIRMED", PartiallyShipped: "CONFIRMED",
  InvoiceUnconfirmed: "CONFIRMED", Shipped: "SHIPPED", Canceled: "CANCELLED", Unfulfillable: "CANCELLED",
};

type AmzOrder = {
  AmazonOrderId: string; PurchaseDate: string; OrderStatus: string; FulfillmentChannel?: string; PaymentMethod?: string;
  ShippingAddress?: { StateOrRegion?: string; City?: string; PostalCode?: string };
};
type AmzItem = {
  SellerSKU: string; ASIN: string; QuantityOrdered: number;
  ItemPrice?: { Amount: string }; ShippingPrice?: { Amount: string }; PromotionDiscount?: { Amount: string };
};

export function mapAmazonOrder(o: AmzOrder, items: AmzItem[]): ExternalOrder {
  const a = o.ShippingAddress;
  return {
    externalOrderId: o.AmazonOrderId,
    orderDate: new Date(o.PurchaseDate),
    status: STATUS[o.OrderStatus] ?? "CONFIRMED",
    paymentStatus: o.PaymentMethod === "COD" ? "COD" : "PAID",
    customerState: a?.StateOrRegion ?? null,
    shippingAddress: [a?.City, a?.StateOrRegion, a?.PostalCode].filter(Boolean).join(", ") || null,
    fulfilledByMarketplace: o.FulfillmentChannel === "AFN",
    discount: items.reduce((s, i) => s + num(i.PromotionDiscount?.Amount), 0),
    shippingFee: items.reduce((s, i) => s + num(i.ShippingPrice?.Amount), 0),
    lines: items
      .filter((i) => i.QuantityOrdered > 0)
      .map((i) => ({
        externalSku: i.SellerSKU,
        externalId: i.ASIN,
        quantity: i.QuantityOrdered,
        // ItemPrice is the line total (tax inclusive in India); absent while an order is Pending.
        unitPrice: i.ItemPrice ? Math.round((num(i.ItemPrice.Amount) / i.QuantityOrdered) * 100) / 100 : null,
      })),
  };
}

export const amazon: Connector = {
  provider: "AMAZON",
  name: "Amazon Seller Central",
  setup: [
    "In Seller Central open Apps & Services → Develop Apps and register as a developer (private app for your own account).",
    "Create an app client with the Selling Partner API roles: Inventory and Order Tracking, Product Listing, Pricing.",
    "Authorise the app for your store to get a Refresh token, and copy the LWA Client ID and Client secret.",
    "Your Seller ID (Merchant Token) is under Settings → Account Info → Merchant Token.",
  ],
  fields: [
    { key: "sellerId", label: "Seller ID (Merchant Token)", placeholder: "A1B2C3D4E5F6G7" },
    { key: "clientId", label: "LWA Client ID", placeholder: "amzn1.application-oa2-client.…" },
    { key: "clientSecret", label: "LWA Client secret", type: "password" },
    { key: "refreshToken", label: "Refresh token", type: "password", placeholder: "Atzr|…" },
    {
      key: "region", label: "Region", type: "select",
      options: [{ value: "eu", label: "India / Europe / Middle East" }, { value: "na", label: "North America" }, { value: "fe", label: "Far East" }],
    },
    { key: "marketplaceId", label: "Marketplace ID", optional: true, placeholder: "A21TJRUUN4KGV", help: "Leave blank for Amazon.in." },
  ],
  async test(ctx) {
    const data = await call<{ payload: { marketplace: { id: string; name: string }; storeName?: string; participation: { isParticipating: boolean } }[] }>(
      ctx, "/sellers/v1/marketplaceParticipations",
    );
    const m = data.payload.find((p) => p.marketplace.id === marketplace(ctx));
    if (!m) throw new IntegrationError(`This seller account is not registered on marketplace ${marketplace(ctx)}`);
    return { accountName: `${m.storeName ?? ctx.creds.sellerId} · ${m.marketplace.name}` };
  },
  async fetchOrders(ctx, since) {
    // LastUpdatedAfter must be at least 2 minutes in the past.
    const after = new Date(Math.min(since.getTime(), Date.now() - 3 * 60_000)).toISOString();
    const orders: AmzOrder[] = [];
    let next: string | undefined;
    for (let page = 0; page < 30; page++) {
      const q = new URLSearchParams({ MarketplaceIds: marketplace(ctx), MaxResultsPerPage: "100" });
      if (next) q.set("NextToken", next);
      else q.set("LastUpdatedAfter", after);
      const data = await call<{ payload: { Orders: AmzOrder[]; NextToken?: string } }>(ctx, `/orders/v0/orders?${q}`);
      orders.push(...data.payload.Orders);
      next = data.payload.NextToken;
      if (!next) break;
    }
    const out: ExternalOrder[] = [];
    for (const o of orders) {
      const items: AmzItem[] = [];
      let token: string | undefined;
      do {
        const q = token ? `?NextToken=${encodeURIComponent(token)}` : "";
        const data = await call<{ payload: { OrderItems: AmzItem[]; NextToken?: string } }>(ctx, `/orders/v0/orders/${encodeURIComponent(o.AmazonOrderId)}/orderItems${q}`);
        items.push(...data.payload.OrderItems);
        token = data.payload.NextToken;
      } while (token);
      out.push(mapAmazonOrder(o, items));
    }
    return out;
  },
  async listListings(ctx) {
    const out: Listing[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < 100; page++) {
      const q = new URLSearchParams({ marketplaceIds: marketplace(ctx), includedData: "summaries", pageSize: "20" });
      if (pageToken) q.set("pageToken", pageToken);
      const data = await call<{ items: { sku: string; summaries?: { asin?: string; itemName?: string }[] }[]; pagination?: { nextToken?: string } }>(
        ctx, `/listings/2021-08-01/items/${encodeURIComponent(ctx.creds.sellerId)}?${q}`,
      );
      for (const i of data.items) out.push({ externalSku: i.sku, externalId: i.summaries?.[0]?.asin ?? null, title: i.summaries?.[0]?.itemName });
      pageToken = data.pagination?.nextToken;
      if (!pageToken) break;
    }
    return out;
  },
  async pushStock(ctx, items) {
    const errors: string[] = [];
    let updated = 0;
    for (const item of items) {
      const path = `/listings/2021-08-01/items/${encodeURIComponent(ctx.creds.sellerId)}/${encodeURIComponent(item.externalSku)}?marketplaceIds=${marketplace(ctx)}`;
      try {
        const current = await call<{ summaries?: { productType?: string }[] }>(ctx, `${path}&includedData=summaries`);
        const productType = current.summaries?.[0]?.productType;
        if (!productType) throw new IntegrationError("listing not found");
        const res = await call<{ status: string; issues?: { message: string; severity: string }[] }>(ctx, path, {
          method: "PATCH",
          body: JSON.stringify({
            productType,
            patches: [{ op: "replace", path: "/attributes/fulfillment_availability", value: [{ fulfillment_channel_code: "DEFAULT", quantity: item.quantity }] }],
          }),
        });
        const blocking = (res.issues ?? []).filter((i) => i.severity === "ERROR");
        if (res.status === "INVALID" || blocking.length) errors.push(`${item.externalSku}: ${blocking.map((i) => i.message).join("; ") || res.status}`);
        else updated++;
      } catch (e) {
        errors.push(`${item.externalSku}: ${(e as Error).message}`);
      }
    }
    return { updated, errors };
  },
};
