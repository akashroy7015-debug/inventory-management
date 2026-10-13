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
