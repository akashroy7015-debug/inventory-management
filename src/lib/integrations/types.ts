import type { IntegrationProvider } from "@prisma/client";

export type ExternalStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export type ExternalOrderLine = { externalSku: string; externalId?: string | null; quantity: number; unitPrice: number | null };

export type ExternalOrder = {
  externalOrderId: string;
  orderDate: Date | null;
  status: ExternalStatus;
  paymentStatus?: "PAID" | "UNPAID" | "COD";
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerState?: string | null;
  shippingAddress?: string | null;
  discount?: number;
  shippingFee?: number;
  /** Shipped from the marketplace's own warehouse (Amazon FBA, Flipkart Smart Fulfilment). */
  fulfilledByMarketplace?: boolean;
  lines: ExternalOrderLine[];
};

export type Listing = { externalSku: string; externalId: string | null; title?: string };
export type StockUpdate = { externalSku: string; externalId: string | null; quantity: number };
export type PushResult = { updated: number; errors: string[] };

export type CredentialField = {
  key: string;
  label: string;
  type?: "text" | "password" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  optional?: boolean;
};

export type ConnectorContext = { creds: Record<string, string> };

export interface Connector {
  provider: IntegrationProvider;
  name: string;
  /** What the user must do in the marketplace to get these credentials. */
  setup: string[];
  fields: CredentialField[];
  /** Validates credentials; returns a display name for the account. */
  test(ctx: ConnectorContext): Promise<{ accountName: string }>;
  /** Orders created or updated since the given time. */
  fetchOrders(ctx: ConnectorContext, since: Date): Promise<ExternalOrder[]>;
  /** Listings on the marketplace. `skuHints` are our SKU codes (some APIs can only look up by SKU). */
  listListings(ctx: ConnectorContext, skuHints: string[]): Promise<Listing[]>;
  pushStock(ctx: ConnectorContext, items: StockUpdate[]): Promise<PushResult>;
}
