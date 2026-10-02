import { buildShoppingList, computeTargets, formatQty, generateWeek, type PlanContext } from "@weeko/engine";
import { getCatalog } from "../src";
const catalog = getCatalog();
const p = { id: "me", name: "Moi", sex: "female" as const, age: 35, heightCm: 165, weightKg: 72, activity: "light" as const, goal: "lose_weight" as const };
const all = { breakfast: true, lunch: true, dinner: true, snack: true };
const ctx: PlanContext = {
  catalog,
  members: [{ id: "me", name: "Moi", targets: computeTargets(p).targets, eats: all, avoid: [] }],
  prefs: { diet: "omnivore", avoid: [], dislikedIngredients: [], likedRecipes: [], dislikedRecipes: [], maxMinutesWeekday: 30, maxMinutesWeekend: 60, equipment: ["oven", "blender"], leftovers: true, snacks: true },
  budget: Number(process.argv[2] ?? 50),
};
const t0 = Date.now();
const { plan, summary, stock } = generateWeek(ctx, { startDate: "2026-10-05", seed: Number(process.argv[3] ?? 1) });
console.log("ms", Date.now() - t0, "target", ctx.members[0]!.targets.kcal, "cost", summary.cost, summary.budgetStatus);
for (const m of plan.meals) console.log(m.day, m.meal.padEnd(9), m.kind.padEnd(8), (m.portions[0]?.servings ?? 0).toFixed(1), catalog.recipe(m.recipeId!).name.fr);
console.log(summary.daily.me!.map((d) => `${d.kcal}/${d.protein}g`).join(" "));
const list = buildShoppingList(catalog, stock);
for (const a of list.aisles) console.log(a.aisle, a.cost, a.items.map((i) => `${catalog.ingredient(i.ingredientId).name.fr} ${formatQty(catalog, i.ingredientId, i.toBuy)}`).join(", "));
console.log("leftover value", list.leftoverValue);
