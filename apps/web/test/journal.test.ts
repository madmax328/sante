import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../src/lib/db", () => ({ db: { collection: () => ({}) } }));

const { buildLogEntry, inputFromLog, keyOf } = await import("../src/lib/journal");

describe("journal entries", () => {
  it("adds back an ingredient, a recipe and a barcode product with the same nutrition", async () => {
    const { getCatalog } = await import("@weeko/catalog");
    const recipe = getCatalog().allRecipes()[0]!;
    const inputs = [
      { kind: "ingredient" as const, id: "apple", amount: 150 },
      { kind: "recipe" as const, id: recipe.id, amount: 1.5 },
      { kind: "barcode" as const, code: "3017620422003", name: "Pâte à tartiner", grams: 30, per100: { kcal: 539, protein: 6.3, carbs: 57.5, fat: 30.9 } },
      { kind: "custom" as const, name: "Sandwich", kcal: 450, protein: 20, carbs: 50, fat: 15 },
    ];
    for (const input of inputs) {
      const line = buildLogEntry(input, "lunch")!;
      const again = buildLogEntry(inputFromLog(line)!, "dinner")!;
      expect(again.kcal).toBe(line.kcal);
      expect(again.name).toBe(line.name);
      expect(keyOf(inputFromLog(line)!)).toBe(keyOf(input));
    }
  });

  it("keeps a planned meal as a free entry and ignores unknown foods", () => {
    const planned = { id: "x", meal: "dinner" as const, kind: "planned" as const, refId: "2026-10-05:0:dinner", name: "Lasagnes", amount: 1, kcal: 620, protein: 30, carbs: 60, fat: 25, at: new Date() };
    expect(inputFromLog(planned)).toEqual({ kind: "custom", name: "Lasagnes", kcal: 620, protein: 30, carbs: 60, fat: 25 });
    expect(buildLogEntry({ kind: "ingredient", id: "unicorn", amount: 10 }, "lunch")).toBeNull();
  });

  it("identifies the same food whatever the quantity", () => {
    expect(keyOf({ kind: "ingredient", id: "apple", amount: 100 })).toBe(keyOf({ kind: "ingredient", id: "apple", amount: 250 }));
    expect(keyOf({ kind: "custom", name: " Sandwich ", kcal: 1 })).toBe(keyOf({ kind: "custom", name: "sandwich", kcal: 2 }));
  });
});
