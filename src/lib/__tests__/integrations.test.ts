import { afterEach, describe, expect, it, vi } from "vitest";
import { mapShopifyOrder } from "../integrations/shopify";
import { mapWooOrder } from "../integrations/woocommerce";
import { mapAmazonOrder } from "../integrations/amazon";
import { mapFlipkartItems } from "../integrations/flipkart";
import { decryptJson, encryptJson } from "../integrations/crypto";
import { assertPublicUrl } from "../integrations/http";
import { normalizeStatus } from "../import";

describe("order mappers", () => {
  it("maps Shopify orders, adding tax when prices exclude it", () => {
    const o = mapShopifyOrder({
      id: 1, name: "#1001", created_at: "2026-10-01T10:00:00Z", cancelled_at: null, financial_status: "paid",
      fulfillment_status: null, taxes_included: false, total_discounts: "50.00", shipping_lines: [{ price: "40.00" }],
      line_items: [{ sku: "MOR-250", variant_id: 9, quantity: 2, price: "300.00", tax_lines: [{ price: "30.00" }] }],
      shipping_address: { name: "Asha", province: "Karnataka", city: "Bengaluru" },
    });
    expect(o).toMatchObject({ externalOrderId: "#1001", status: "CONFIRMED", paymentStatus: "PAID", discount: 50, shippingFee: 40, customerState: "Karnataka" });
    expect(o.lines).toEqual([{ externalSku: "MOR-250", externalId: "9", quantity: 2, unitPrice: 315 }]);
    expect(mapShopifyOrder({ ...baseShopify, cancelled_at: "2026-10-02T00:00:00Z" }).status).toBe("CANCELLED");
  });

  it("maps WooCommerce orders and skips unpaid ones", () => {
    const woo = {
      id: 7, number: "1007", status: "processing", date_created_gmt: "2026-10-01T10:00:00", payment_method: "cod", date_paid_gmt: null,
      shipping_total: "40", shipping_tax: "0",
      billing: { first_name: "Ravi", last_name: "K", email: "r@x.in", phone: "98", state: "MH" },
      shipping: { first_name: "", last_name: "", address_1: "1 Road", city: "Pune", state: "MH", postcode: "411001" },
      line_items: [{ sku: "MOR-100", quantity: 3, total: "570", total_tax: "28.5", product_id: 5, variation_id: 0 }],
    };
    const o = mapWooOrder(woo)!;
    expect(o).toMatchObject({ externalOrderId: "1007", status: "CONFIRMED", paymentStatus: "COD", customerState: "Maharashtra", customerName: "Ravi K", shippingFee: 40 });
    expect(o.lines[0]).toEqual({ externalSku: "MOR-100", externalId: "5", quantity: 3, unitPrice: 199.5 });
    expect(mapWooOrder({ ...woo, status: "pending" })).toBeNull();
    expect(mapWooOrder({ ...woo, status: "refunded" })!.status).toBe("CANCELLED");
    expect(mapWooOrder({ ...woo, status: "completed" })!.status).toBe("DELIVERED");
  });

  it("maps Amazon orders including FBA and pending orders without prices", () => {
    const o = mapAmazonOrder(
      { AmazonOrderId: "402-1", PurchaseDate: "2026-10-01T10:00:00Z", OrderStatus: "Unshipped", FulfillmentChannel: "AFN", PaymentMethod: "Other", ShippingAddress: { StateOrRegion: "DELHI" } },
      [{ SellerSKU: "AMZ-1", ASIN: "B0X", QuantityOrdered: 2, ItemPrice: { Amount: "630.00" }, PromotionDiscount: { Amount: "30" } }],
    );
    expect(o).toMatchObject({ status: "CONFIRMED", fulfilledByMarketplace: true, discount: 30, customerState: "DELHI" });
    expect(o.lines).toEqual([{ externalSku: "AMZ-1", externalId: "B0X", quantity: 2, unitPrice: 315 }]);
    const pending = mapAmazonOrder({ AmazonOrderId: "402-2", PurchaseDate: "2026-10-01T10:00:00Z", OrderStatus: "Pending" }, [{ SellerSKU: "AMZ-1", ASIN: "B0X", QuantityOrdered: 1 }]);
    expect(pending.status).toBe("PENDING");
    expect(pending.lines[0].unitPrice).toBeNull();
    expect(mapAmazonOrder({ AmazonOrderId: "x", PurchaseDate: "2026-10-01", OrderStatus: "Canceled" }, []).status).toBe("CANCELLED");
  });

  it("groups Flipkart order items into orders", () => {
    const orders = mapFlipkartItems(
      [
        { orderItemId: "1", orderId: "OD1", orderDate: "2026-10-01T10:00:00+05:30", sku: "FK-250", fsn: "FSN1", quantity: 2, priceComponents: { sellingPrice: 700, shippingCharge: 40 } },
        { orderItemId: "2", orderId: "OD1", sku: "FK-100", fsn: "FSN2", quantity: 1, priceComponents: { sellingPrice: 199 } },
      ],
      "CONFIRMED",
    );
    expect(orders).toHaveLength(1);
    expect(orders[0].shippingFee).toBe(40);
    expect(orders[0].lines).toEqual([
      { externalSku: "FK-250", externalId: "FSN1", quantity: 2, unitPrice: 350 },
      { externalSku: "FK-100", externalId: "FSN2", quantity: 1, unitPrice: 199 },
    ]);
  });

  it("normalizes free-text statuses from report files", () => {
    expect(normalizeStatus("Cancelled")).toBe("CANCELLED");
    expect(normalizeStatus("Shipped")).toBe("SHIPPED");
    expect(normalizeStatus("completed")).toBe("DELIVERED");
    expect(normalizeStatus("APPROVED")).toBe("CONFIRMED");
    expect(normalizeStatus(null)).toBe("CONFIRMED");
  });
});

const baseShopify = {
  id: 2, name: "#1002", created_at: "2026-10-01T10:00:00Z", cancelled_at: null,
  line_items: [{ sku: "A", variant_id: null, quantity: 1, price: "10" }],
};

describe("security helpers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("encrypts credentials and detects tampering", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-test-secret");
    const enc = encryptJson({ token: "shpat_123" });
    expect(enc).not.toContain("shpat_123");
    expect(decryptJson(enc)).toEqual({ token: "shpat_123" });
    const parts = enc.split(":");
    parts[3] = Buffer.from("tampered").toString("base64");
    expect(() => decryptJson(parts.join(":"))).toThrow();
  });

  it("refuses private and non-https store URLs", async () => {
    vi.stubEnv("ALLOW_PRIVATE_INTEGRATION_HOSTS", "");
    await expect(assertPublicUrl("http://example.com")).rejects.toThrow(/https/);
    await expect(assertPublicUrl("https://127.0.0.1/wp-json")).rejects.toThrow(/not allowed/);
    await expect(assertPublicUrl("https://169.254.169.254/latest")).rejects.toThrow(/not allowed/);
    await expect(assertPublicUrl("https://10.0.0.5")).rejects.toThrow(/not allowed/);
  });
});
