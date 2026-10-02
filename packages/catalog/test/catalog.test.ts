import { describe, expect, it } from "vitest";
import { atwaterKcal } from "@weeko/engine";
import { getCatalog, ingredients, recipes } from "../src";

const catalog = getCatalog();

describe("ingredients", () => {
  it("have consistent energy (Atwater)", () => {
    for (const i of ingredients) {
      if (i.nutrition.kcal < 40) continue;
      const diff = Math.abs(atwaterKcal(i.nutrition) - i.nutrition.kcal) / i.nutrition.kcal;
      expect(diff, i.id).toBeLessThan(0.2);
    }
  });
  it("have a price and packs unless staple", () => {
    for (const i of ingredients) {
      if (i.staple) continue;
      expect(i.price.FR, i.id).toBeGreaterThan(0);
      expect(i.packs.length, i.id).toBeGreaterThan(0);
    }
  });
});

describe("recipes", () => {
  it("contains a large base", () => {
    expect(recipes.length).toBeGreaterThanOrEqual(1500);
  });
  it("has unique ids and names", () => {
    expect(new Set(recipes.map((r) => r.id)).size).toBe(recipes.length);
    const names = recipes.map((r) => r.name.fr);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes).toEqual([]);
  });
  it("has plausible energy per serving", () => {
    for (const r of catalog.allRecipes()) {
      const k = r.nutrition.kcal;
      if (r.meals.includes("lunch") || r.meals.includes("dinner")) expect(k, r.id).toBeGreaterThan(300);
      if (r.meals.includes("lunch") || r.meals.includes("dinner")) expect(k, r.id).toBeLessThan(950);
      if (r.meals.includes("breakfast")) expect(k, r.id).toBeGreaterThan(200);
      if (r.meals.includes("breakfast")) expect(k, r.id).toBeLessThan(750);
      if (r.meals.length === 1 && r.meals[0] === "snack") expect(k, r.id).toBeLessThan(450);
    }
  });
  it("has steps and positive quantities", () => {
    for (const r of recipes) {
      expect(r.steps.length, r.id).toBeGreaterThanOrEqual(1);
      for (const i of r.ingredients) expect(i.qty, `${r.id}/${i.id}`).toBeGreaterThan(0);
      expect(r.steps.every((s) => s.fr.trim().length > 5), r.id).toBe(true);
      expect(r.name.fr, r.id).not.toMatch(/\s{2,}|undefined|NaN/);
    }
  });
  it("classifies diets from ingredients", () => {
    for (const r of catalog.allRecipes()) {
      if (r.diets.includes("vegan")) {
        expect(r.tagsAvoid.some((t) => ["meat", "fish", "seafood", "dairy", "egg", "honey"].includes(t)), r.id).toBe(false);
      }
    }
    expect(catalog.allRecipes().filter((r) => r.diets.includes("vegan")).length).toBeGreaterThan(150);
  });
  it("offers enough options for every meal and diet", () => {
    for (const diet of ["omnivore", "vegetarian", "vegan", "pescatarian"] as const)
      for (const meal of ["breakfast", "lunch", "dinner", "snack"] as const) {
        const n = catalog.allRecipes().filter((r) => r.diets.includes(diet) && r.meals.includes(meal)).length;
        expect(n, `${diet}/${meal}`).toBeGreaterThan(10);
      }
  });
});
