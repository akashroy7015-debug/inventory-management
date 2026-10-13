import type { ChannelType, IntegrationProvider } from "@prisma/client";
import { amazon } from "./amazon";
import { flipkart } from "./flipkart";
import { shopify } from "./shopify";
import { woocommerce } from "./woocommerce";
import type { Connector } from "./types";

export const CONNECTORS: Record<IntegrationProvider, Connector> = {
  SHOPIFY: shopify,
  WOOCOMMERCE: woocommerce,
  AMAZON: amazon,
  FLIPKART: flipkart,
};

/** Which platforms make sense for a channel type. */
export function providersFor(type: ChannelType): IntegrationProvider[] {
  switch (type) {
    case "AMAZON": return ["AMAZON"];
    case "FLIPKART": return ["FLIPKART"];
    case "WEBSITE": return ["SHOPIFY", "WOOCOMMERCE"];
    case "OTHER": return ["SHOPIFY", "WOOCOMMERCE", "AMAZON", "FLIPKART"];
    default: return [];
  }
}

export function connector(provider: IntegrationProvider) {
  return CONNECTORS[provider];
}
