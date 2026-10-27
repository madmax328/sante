import { describe, expect, it } from "vitest";
import { cleanIban, formatIban, isValidIban, maskIban } from "../src/lib/iban";

describe("IBAN", () => {
  it("accepts real IBANs, with or without spaces", () => {
    expect(isValidIban("FR76 3000 6000 0112 3456 7890 189")).toBe(true);
    expect(isValidIban("de89370400440532013000")).toBe(true);
    expect(isValidIban("BE68 5390 0754 7034")).toBe(true);
    expect(isValidIban("GB29 NWBK 6016 1331 9268 19")).toBe(true);
  });
  it("refuses typos and wrong lengths", () => {
    expect(isValidIban("FR76 3000 6000 0112 3456 7890 188")).toBe(false);
    expect(isValidIban("FR76 3000 6000 0112 3456 7890")).toBe(false);
    expect(isValidIban("XX00 1234")).toBe(false);
  });
  it("shows only what is needed to recognise the account", () => {
    expect(maskIban("FR76 3000 6000 0112 3456 7890 189")).toBe("FR76 •••• •••• 0189");
    expect(formatIban(cleanIban("fr7630006000011234567890189"))).toBe("FR76 3000 6000 0112 3456 7890 189");
  });
});
