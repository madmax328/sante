import { addNutrients, roundNutrients } from "./nutrition";
import type {
  Diet,
  FoodPreferences,
  FoodTag,
  Ingredient,
  Market,
  MealType,
  Recipe,
  RecipeInfo,
} from "./types";
import { ZERO_NUTRIENTS } from "./types";

const ANIMAL_FLESH: FoodTag[] = ["meat", "poultry", "pork", "beef", "lamb"];

/** Indexed ingredients and recipes with derived nutrition, cost and diets. */
export class Catalog {
  readonly ingredients = new Map<string, Ingredient>();
  readonly recipes = new Map<string, RecipeInfo>();

  constructor(
    ingredients: Ingredient[],
    recipes: (Recipe & { omitted?: string[] })[],
    readonly market: Market = "FR",
  ) {
    for (const i of ingredients) {
      if (this.ingredients.has(i.id)) throw new Error(`Duplicate ingredient ${i.id}`);
      this.ingredients.set(i.id, i);
    }
    for (const r of recipes) {
      if (this.recipes.has(r.id)) throw new Error(`Duplicate recipe ${r.id}`);
      this.recipes.set(r.id, this.enrich(r));
    }
  }

  ingredient(id: string): Ingredient {
    const i = this.ingredients.get(id);
    if (!i) throw new Error(`Unknown ingredient ${id}`);
    return i;
  }

  recipe(id: string): RecipeInfo {
    const r = this.recipes.get(id);
    if (!r) throw new Error(`Unknown recipe ${id}`);
    return r;
  }

  /**
   * The same catalog with some seasonings or garnishes taken out of every
   * recipe (nutrition and cost recomputed). Non-omittable ingredients are
   * ignored here: recipes containing them are excluded by the planner.
   */
  withoutIngredients(ids: string[]): Catalog {
    const omit = new Map(ids.flatMap((id) => {
      const words = this.ingredients.get(id)?.omittable;
      return words ? [[id, words.map(normalizeWord)] as const] : [];
    }));
    if (omit.size === 0) return this;
    const recipes = [...this.recipes.values()].map((r) => {
      const title = ` ${normalizeWord(r.name.fr)} ${normalizeWord(r.name.en ?? "")} `;
      // Named after the ingredient: keep it, so the planner excludes the recipe.
      const removable = (id: string) => omit.get(id)?.every((w) => !new RegExp(`[^a-z]${w}[^a-z]`).test(title));
      const dropped = r.ingredients.filter((i) => removable(i.id));
      if (dropped.length === 0) return r;
      return { ...r, ingredients: r.ingredients.filter((i) => !removable(i.id)), omitted: dropped.map((i) => i.id) };
    });
    return new Catalog([...this.ingredients.values()], recipes, this.market);
  }

  allRecipes(): RecipeInfo[] {
    return [...this.recipes.values()];
  }

  /** Grams for a quantity expressed in the ingredient base unit. */
  grams(ingredientId: string, qty: number): number {
    const i = this.ingredient(ingredientId);
    if (i.unit === "pc") return qty * (i.pieceWeight ?? 100);
    if (i.unit === "ml") return qty * (i.density ?? 1);
    return qty;
  }

  /** Price of a quantity (base unit) in market currency. */
  price(ingredientId: string, qty: number): number {
    const i = this.ingredient(ingredientId);
    const p = i.price[this.market] ?? 0;
    if (i.unit === "pc") return qty * p;
    return (qty / 1000) * p;
  }

  private enrich(r: Recipe): RecipeInfo {
    let total = { ...ZERO_NUTRIENTS };
    let cost = 0;
    let veg = 0;
    const tags = new Set<FoodTag>();
    for (const ri of r.ingredients) {
      const ing = this.ingredient(ri.id);
      const g = this.grams(ri.id, ri.qty);
      total = addNutrients(total, ing.nutrition, g / 100);
      if (!ing.staple) cost += this.price(ri.id, ri.qty);
      if (ing.vegetable) veg += g;
      ing.tags.forEach((tag) => tags.add(tag));
    }
    const per = roundNutrients({
      kcal: total.kcal / r.servings,
      protein: total.protein / r.servings,
      carbs: total.carbs / r.servings,
      sugars: total.sugars / r.servings,
      fat: total.fat / r.servings,
      satFat: total.satFat / r.servings,
      fiber: total.fiber / r.servings,
      salt: total.salt / r.servings,
    });
    const tagsAvoid = [...tags];
    return {
      ...r,
      nutrition: per,
      cost: Math.round((cost / r.servings) * 100) / 100,
      vegGrams: Math.round(veg / r.servings),
      hasMeat: tagsAvoid.some((t) => ANIMAL_FLESH.includes(t)),
      totalMin: r.prepMin + r.cookMin,
      tagsAvoid,
      diets: dietsFor(tagsAvoid),
    };
  }
}

export function dietsFor(tags: FoodTag[]): Diet[] {
  const flesh = tags.some((t) => ANIMAL_FLESH.includes(t));
  const sea = tags.includes("fish") || tags.includes("seafood");
  const animalProducts = tags.includes("dairy") || tags.includes("egg") || tags.includes("honey");
  const diets: Diet[] = ["omnivore", "flexitarian"];
  if (!flesh) diets.push("pescatarian");
  if (!flesh && !sea) diets.push("vegetarian");
  if (!flesh && !sea && !animalProducts) diets.push("vegan");
  return diets;
}

export interface CompatibilityOptions {
  prefs: FoodPreferences;
  /** Tags any eater must avoid (allergies, pregnancy...). */
  avoid: FoodTag[];
  meal?: MealType;
  maxMinutes?: number;
}

export function isCompatible(r: RecipeInfo, o: CompatibilityOptions): boolean {
  if (!r.diets.includes(o.prefs.diet)) return false;
  if (o.meal && !r.meals.includes(o.meal)) return false;
  if (r.tagsAvoid.some((t) => o.avoid.includes(t) || o.prefs.avoid.includes(t))) return false;
  if (r.ingredients.some((i) => o.prefs.dislikedIngredients.includes(i.id))) return false;
  if (o.prefs.dislikedRecipes.includes(r.id)) return false;
  if (o.maxMinutes !== undefined && r.prepMin + Math.min(r.cookMin, 15) > o.maxMinutes) {
    // Passive cooking time (oven, simmering) counts only partially.
    return false;
  }
  if (r.equipment.some((e) => !o.prefs.equipment.includes(e))) return false;
  return true;
}

/** Lowercase, accents removed, punctuation as spaces: "Poulet à l'ail" → "poulet a l ail". */
function normalizeWord(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]+/g, " ")
    .trim();
}
