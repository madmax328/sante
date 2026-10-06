import { describe, expect, it } from "vitest";
import {
  applyAction,
  buildShoppingList,
  computeTargets,
  generateWeek,
  alternatives,
  type FoodPreferences,
  type PlanContext,
  type PlanMember,
} from "@weeko/engine";
import { getCatalog } from "../src";

const catalog = getCatalog();

const prefs: FoodPreferences = {
  diet: "omnivore",
  avoid: [],
  dislikedIngredients: [],
  likedRecipes: [],
  dislikedRecipes: [],
  maxMinutesWeekday: 30,
  maxMinutesWeekend: 60,
  equipment: ["oven", "microwave", "blender"],
  leftovers: true,
  snacks: true,
};

const allMeals = { breakfast: true, lunch: true, dinner: true, snack: true };

function member(id: string, over: Partial<Parameters<typeof computeTargets>[0]> = {}): PlanMember {
  const p = { id, name: id, sex: "female" as const, age: 35, heightCm: 165, weightKg: 72, activity: "light" as const, goal: "lose_weight" as const, ...over };
  return { id, name: id, targets: computeTargets(p).targets, eats: allMeals, avoid: [] };
}

const me = member("me");
const ctx: PlanContext = { catalog, members: [me], prefs };
const START = "2026-10-05"; // a Monday

describe("week generation", () => {
  const { plan, summary, stock } = generateWeek(ctx, { startDate: START, seed: 42 });

  it("fills 7 days × 4 meals", () => {
    expect(plan.meals).toHaveLength(28);
    expect(plan.meals.every((m) => m.kind === "recipe" || m.kind === "leftover")).toBe(true);
  });

  it("is deterministic for a seed", () => {
    const again = generateWeek(ctx, { startDate: START, seed: 42 });
    expect(again.plan.meals.map((m) => m.recipeId)).toEqual(plan.meals.map((m) => m.recipeId));
  });

  it("lands close to the daily energy target", () => {
    for (const d of summary.daily.me!) {
      expect(Math.abs(d.kcal - d.target) / d.target, `day ${d.day}`).toBeLessThan(0.12);
    }
  });

  it("plans leftovers of dinners for the next lunch", () => {
    const leftovers = plan.meals.filter((m) => m.kind === "leftover");
    expect(leftovers.length).toBe(3);
    for (const l of leftovers) {
      const src = plan.meals.find((m) => m.day === l.leftoverOf!.day && m.meal === l.leftoverOf!.meal)!;
      expect(src.recipeId).toBe(l.recipeId);
    }
  });

  it("does not repeat main dishes", () => {
    const mains = plan.meals.filter((m) => m.kind === "recipe" && (m.meal === "lunch" || m.meal === "dinner")).map((m) => m.recipeId);
    expect(new Set(mains).size).toBe(mains.length);
  });

  it("builds a shopping list by aisle", () => {
    const list = buildShoppingList(catalog, stock);
    expect(list.aisles.length).toBeGreaterThan(3);
    expect(list.total).toBeCloseTo(summary.cost, 1);
  });

  it("respects allergies and diets", () => {
    const veg = generateWeek(
      { ...ctx, prefs: { ...prefs, diet: "vegetarian" }, members: [{ ...me, avoid: ["peanut", "nuts"] }] },
      { startDate: START, seed: 1 },
    );
    for (const m of veg.plan.meals) {
      const r = catalog.recipe(m.recipeId!);
      expect(r.diets).toContain("vegetarian");
      expect(r.tagsAvoid.includes("peanut") || r.tagsAvoid.includes("nuts")).toBe(false);
    }
  });
});

describe("budget", () => {
  it("fits a 45 € week for one person", () => {
    const res = generateWeek({ ...ctx, budget: 45 }, { startDate: START, seed: 7 });
    expect(res.summary.cost).toBeLessThanOrEqual(45);
    expect(res.summary.budgetStatus).not.toBe("over");
  });

  it("is cheaper than an unconstrained week", () => {
    const free = generateWeek(ctx, { startDate: START, seed: 7 }).summary.cost;
    const tight = generateWeek({ ...ctx, budget: free * 0.7 }, { startDate: START, seed: 7 }).summary.cost;
    expect(tight).toBeLessThan(free);
  });

  it("reports an impossible budget honestly", () => {
    const res = generateWeek({ ...ctx, budget: 8 }, { startDate: START, seed: 7 });
    expect(res.summary.budgetStatus).toBe("over");
    expect(res.summary.notes.some((n) => n.code === "budget_over")).toBe(true);
  });
});

describe("family", () => {
  it("shares dinner with adapted portions", () => {
    const kid = { ...member("kid", { age: 8, heightCm: 128, weightKg: 26, goal: "family_meals" }), isChild: true };
    const partner = member("partner", { sex: "male", weightKg: 82, heightCm: 180, goal: "maintain" });
    const res = generateWeek({ ...ctx, members: [me, partner, kid] }, { startDate: START, seed: 3 });
    const dinner = res.plan.meals.find((m) => m.meal === "dinner" && m.kind === "recipe")!;
    expect(dinner.portions).toHaveLength(3);
    const byId = Object.fromEntries(dinner.portions.map((p) => [p.memberId, p.servings]));
    expect(byId.partner!).toBeGreaterThan(byId.kid!);
  });
});

describe("adjustments", () => {
  const { plan } = generateWeek(ctx, { startDate: START, seed: 11 });

  it("replaces a meal with another compatible recipe", () => {
    const before = plan.meals.find((m) => m.day === 2 && m.meal === "dinner")!;
    const res = applyAction(ctx, plan, { type: "replace_meal", day: 2, meal: "dinner" });
    const after = res.plan.meals.find((m) => m.day === 2 && m.meal === "dinner")!;
    expect(after.recipeId).not.toBe(before.recipeId);
  });

  it("handles eating out without punishing the next days", () => {
    const res = applyAction(ctx, plan, { type: "eat_out", day: 1, meal: "dinner", label: "Pizza", kcal: 1100 });
    const m = res.plan.meals.find((x) => x.day === 1 && x.meal === "dinner")!;
    expect(m.kind).toBe("external");
    const cuts = res.plan.adjustments.filter((a) => a.kcal < 0);
    expect(cuts.length).toBeGreaterThan(0);
    for (const c of cuts) expect(-c.kcal).toBeLessThanOrEqual(me.targets.kcal * 0.1 + 1);
  });

  it("removes a missing ingredient from the rest of the week", () => {
    const withChicken = plan.meals.find((m) => m.recipeId && catalog.recipe(m.recipeId).ingredients.some((i) => i.id === "chicken_breast"));
    const res = applyAction(ctx, plan, { type: "missing_ingredient", ingredientId: "chicken_breast", fromDay: 0 });
    for (const m of res.plan.meals) {
      if (!m.recipeId) continue;
      expect(catalog.recipe(m.recipeId).ingredients.some((i) => i.id === "chicken_breast")).toBe(false);
    }
    expect(withChicken === undefined || res.plan !== plan).toBe(true);
  });

  it("respects a time limit", () => {
    const res = applyAction(ctx, plan, { type: "time_limit", day: 3, meal: "dinner", minutes: 15 });
    const m = res.plan.meals.find((x) => x.day === 3 && x.meal === "dinner")!;
    expect(catalog.recipe(m.recipeId!).prepMin).toBeLessThanOrEqual(15);
  });

  it("adds guests", () => {
    const before = generateWeek(ctx, { startDate: START, seed: 11 }).summary.cost;
    const res = applyAction(ctx, plan, { type: "guests", day: 5, meal: "dinner", total: 5 });
    expect(res.summary.cost).toBeGreaterThan(before);
  });

  it("lists alternatives", () => {
    const alts = alternatives(ctx, plan, 0, "dinner", { limit: 5 });
    expect(alts).toHaveLength(5);
  });
});

describe("foods the user doesn't eat", () => {
  const disliked = ["onion", "red_onion", "shallot", "spring_onion", "tomato", "cherry_tomato", "canned_tomato", "passata", "tomato_paste", "mushroom", "garlic", "coriander"];
  const c = getCatalog("FR", disliked);
  const week = generateWeek({ catalog: c, members: [me], prefs: { ...prefs, dislikedIngredients: disliked } }, { startDate: START, seed: 7 });

  it("still fills the week", () => {
    expect(week.plan.meals).toHaveLength(28);
  });

  it("never plans or buys them", () => {
    for (const m of week.plan.meals) {
      if (!m.recipeId) continue;
      const ids = c.recipe(m.recipeId).ingredients.map((i) => i.id);
      expect(ids.filter((id) => disliked.includes(id)), m.recipeId).toEqual([]);
    }
    const list = buildShoppingList(c, week.stock);
    const bought = list.aisles.flatMap((a) => a.items.map((i) => i.ingredientId));
    expect(bought.filter((id) => disliked.includes(id))).toEqual([]);
  });
});

describe("diet nuances", () => {
  const mains = (p: ReturnType<typeof generateWeek>["plan"]) =>
    p.meals.filter((m) => (m.meal === "lunch" || m.meal === "dinner") && m.recipeId).map((m) => catalog.recipe(m.recipeId!));

  it("flexitarian: meat at most 3 meals a week", () => {
    for (const seed of [1, 2, 3]) {
      const week = generateWeek({ ...ctx, prefs: { ...prefs, diet: "flexitarian" } }, { startDate: START, seed });
      expect(mains(week.plan).filter((r) => r.hasMeat).length, `seed ${seed}`).toBeLessThanOrEqual(3);
      expect(week.plan.meals).toHaveLength(28);
    }
  });

  it("'not too many vegetables' plans lighter vegetable dishes, without removing them", () => {
    const avg = (veggies: "less" | "normal") => {
      let total = 0;
      let n = 0;
      for (const seed of [1, 2, 3]) {
        for (const r of mains(generateWeek({ ...ctx, prefs: { ...prefs, veggies } }, { startDate: START, seed }).plan)) {
          total += r.vegGrams;
          n++;
        }
      }
      return total / n;
    };
    const less = avg("less");
    const normal = avg("normal");
    expect(less).toBeLessThan(normal * 0.8);
    expect(less).toBeGreaterThan(30);
  });
});
