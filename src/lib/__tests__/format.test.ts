import { describe, expect, it } from "vitest";
import { inclusiveTax, rupeesInWords } from "../format";

describe("format", () => {
  it("extracts GST from inclusive prices", () => {
    expect(inclusiveTax(105, 5)).toBe(5);
    expect(inclusiveTax(112, 12)).toBe(12);
    expect(inclusiveTax(100, 0)).toBe(0);
  });
  it("writes amounts in Indian words", () => {
    expect(rupeesInWords(125050.5)).toBe("One Lakh Twenty Five Thousand Fifty Rupees and Fifty Paise Only");
    expect(rupeesInWords(599)).toBe("Five Hundred Ninety Nine Rupees Only");
    expect(rupeesInWords(21000000)).toBe("Two Crore Ten Lakh Rupees Only");
  });
});

describe("business time zone", () => {
  it("groups instants by Indian calendar day", async () => {
    const { dayKey, startOfDay, endOfDay } = await import("../format");
    // 20:00 UTC on the 14th is 01:30 IST on the 15th.
    expect(dayKey(new Date("2026-10-14T20:00:00Z"), "Asia/Kolkata")).toBe("2026-10-15");
    expect(startOfDay("2026-10-15", "Asia/Kolkata").toISOString()).toBe("2026-10-14T18:30:00.000Z");
    expect(endOfDay("2026-10-15", "Asia/Kolkata").toISOString()).toBe("2026-10-15T18:29:59.999Z");
    expect(startOfDay("2026-10-15", "UTC").toISOString()).toBe("2026-10-15T00:00:00.000Z");
  });
});
