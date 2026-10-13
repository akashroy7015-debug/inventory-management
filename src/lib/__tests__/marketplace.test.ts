import { describe, expect, it } from "vitest";
import { parseOrderReport, parseDate, isCancelledStatus, toCsv } from "../marketplace";

describe("parseOrderReport", () => {
  it("parses an Amazon tab-separated orders report", () => {
    const tsv = [
      "amazon-order-id\tmerchant-order-id\tpurchase-date\torder-status\tsku\tasin\tquantity\titem-price\tship-city\tship-state\tship-postal-code",
      "402-111\t\t2026-10-01T10:00:00+00:00\tShipped\tMOR-250\tB0X\t2\t598.00\tPune\tMAHARASHTRA\t411001",
      "402-111\t\t2026-10-01T10:00:00+00:00\tShipped\tMOR-100\tB0Y\t1\t199.00\tPune\tMAHARASHTRA\t411001",
      "402-222\t\t2026-10-02T10:00:00+00:00\tCancelled\tMOR-250\tB0X\t0\t0\tDelhi\tDELHI\t110001",
    ].join("\n");
    const r = parseOrderReport(tsv);
    expect(r.errors).toEqual([]);
    expect(r.orders).toHaveLength(1);
    expect(r.orders[0].externalOrderId).toBe("402-111");
    expect(r.orders[0].customerState).toBe("MAHARASHTRA");
    expect(r.orders[0].lines).toEqual([
      { externalSku: "MOR-250", quantity: 2, unitPrice: 299 },
      { externalSku: "MOR-100", quantity: 1, unitPrice: 199 },
    ]);
  });

  it("parses a Flipkart style CSV with per-item price and Indian dates", () => {
    const csv = [
      "Order Id,Order Date,SKU,Quantity,Selling Price Per Item,Order Status",
      "OD123,05/10/2026,MOR-500,3,\"₹1,049\",APPROVED",
    ].join("\n");
    const r = parseOrderReport(csv);
    expect(r.orders[0].lines[0]).toEqual({ externalSku: "MOR-500", quantity: 3, unitPrice: 1049 });
    expect(r.orders[0].orderDate?.getMonth()).toBe(9);
    expect(r.orders[0].orderDate?.getDate()).toBe(5);
  });

  it("merges duplicate SKU lines and reports missing columns", () => {
    const r = parseOrderReport("order_id,sku,qty\nA,X,1\nA,X,2\n");
    expect(r.orders[0].lines).toEqual([{ externalSku: "X", quantity: 3, unitPrice: null }]);
    expect(parseOrderReport("foo,bar\n1,2").errors[0]).toMatch(/order ID and SKU/);
  });
});

describe("helpers", () => {
  it("detects cancellations", () => {
    expect(isCancelledStatus("Cancelled")).toBe(true);
    expect(isCancelledStatus("Shipped")).toBe(false);
  });
  it("parses ISO dates and escapes CSV", () => {
    expect(parseDate("2026-01-02")?.getFullYear()).toBe(2026);
    expect(toCsv([["a,b", 1, null]])).toBe('"a,b",1,\n');
  });
});
