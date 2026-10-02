import { getCatalog } from "../src/index";
const c = getCatalog();
const all = c.allRecipes();
console.log("recipes", all.length, "ingredients", c.ingredients.size);
const by = (m: string) => all.filter((r) => r.meals.includes(m as never));
for (const m of ["breakfast", "lunch", "dinner", "snack"]) {
  const rs = by(m);
  const k = rs.map((r) => r.nutrition.kcal).sort((a, b) => a - b);
  const cost = rs.map((r) => r.cost).sort((a, b) => a - b);
  console.log(m, rs.length, "kcal min/med/max", k[0], k[Math.floor(k.length / 2)], k[k.length - 1], "cost med", cost[Math.floor(cost.length / 2)]);
}
const diets = ["vegetarian", "vegan", "pescatarian"] as const;
for (const d of diets) console.log(d, all.filter((r) => r.diets.includes(d)).length);
const outliers = all.filter((r) => (r.meals.includes("lunch") || r.meals.includes("dinner")) && (r.nutrition.kcal < 350 || r.nutrition.kcal > 950));
console.log("main outliers", outliers.length);
for (const r of outliers.slice(0, 40)) console.log("  ", r.id, r.nutrition.kcal, r.nutrition.protein);
const bo = all.filter((r) => r.meals.includes("breakfast") && (r.nutrition.kcal < 250 || r.nutrition.kcal > 700));
for (const r of bo) console.log("  B", r.id, r.nutrition.kcal);
const so = all.filter((r) => r.meals.length === 1 && r.meals[0] === "snack" && (r.nutrition.kcal < 70 || r.nutrition.kcal > 350));
for (const r of so) console.log("  S", r.id, r.nutrition.kcal);
