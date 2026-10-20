import { describe, expect, it } from "vitest";
import { MARKETS, MARKET_CURRENCY } from "@weeko/engine";
import { getCatalog, MARKET_INFO } from "../src";

describe("markets", () => {
  it("knows every market", () => {
    for (const m of MARKETS) {
      expect(MARKET_INFO[m].currency).toBe(MARKET_CURRENCY[m]);
      expect(getCatalog(m).market).toBe(m);
    }
  });

  it("prices follow the country's price level", () => {
    const fr = getCatalog("FR").price("pasta", 1000);
    expect(getCatalog("ES").price("pasta", 1000)).toBeLessThan(fr);
    expect(getCatalog("CH").price("pasta", 1000)).toBeGreaterThan(fr);
    expect(getCatalog("FR").price("pasta", 1000)).toBe(fr);
  });

  it("recipes cost more where food is dearer", () => {
    const id = getCatalog("FR").allRecipes().find((r) => r.cost > 1)!.id;
    expect(getCatalog("LU").recipe(id).cost).toBeGreaterThan(getCatalog("FR").recipe(id).cost);
    expect(getCatalog("PT").recipe(id).cost).toBeLessThan(getCatalog("FR").recipe(id).cost);
  });
});
