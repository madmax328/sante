import { describe, expect, it } from "vitest";
import { Catalog, Stock, choosePacks, type Ingredient } from "../src";

const ing = (id: string, over: Partial<Ingredient> = {}): Ingredient => ({
  id,
  name: { fr: id },
  aisle: "grocery",
  unit: "g",
  nutrition: { kcal: 100, protein: 10, carbs: 10, sugars: 1, fat: 1, satFat: 0, fiber: 1, salt: 0 },
  tags: [],
  price: { FR: 10 },
  packs: [500],
  shelfLifeDays: 3,
  ...over,
});

describe("packs", () => {
  it("chooses the smallest covering combination", () => {
    expect(choosePacks([500], 300)).toEqual([500]);
    expect(choosePacks([250, 500], 600)).toEqual([500, 250]);
    expect(choosePacks([6, 12], 7)).toEqual([12]);
  });
});

describe("stock", () => {
  it("reuses leftovers of a pack before buying again", () => {
    const c = new Catalog([ing("chicken")], []);
    const s = new Stock(c);
    s.consume("chicken", 300);
    expect(s.totalCost).toBeCloseTo(5);
    expect(s.quote("chicken", 200).cost).toBe(0);
    s.consume("chicken", 200);
    expect(s.totalCost).toBeCloseTo(5);
    s.consume("chicken", 100);
    expect(s.totalCost).toBeCloseTo(10);
  });

  it("uses the pantry first", () => {
    const c = new Catalog([ing("rice", { price: { FR: 2 }, packs: [1000] })], []);
    const s = new Stock(c, [{ ingredientId: "rice", qty: 400 }]);
    s.consume("rice", 300);
    expect(s.totalCost).toBe(0);
    expect(s.pantryUsed("rice")).toBe(300);
  });

  it("never buys staples", () => {
    const c = new Catalog([ing("salt", { staple: true })], []);
    const s = new Stock(c);
    s.consume("salt", 5);
    expect(s.totalCost).toBe(0);
    expect(s.staples.get("salt")).toBe(5);
  });
});
