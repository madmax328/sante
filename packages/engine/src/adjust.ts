import {
  DAYS,
  balanceDays,
  fillSlots,
  key,
  mealRequirements,
  portionsFor,
  simulate,
  slotEaters,
  summarize,
  type PlanContext,
  type PlannedMeal,
  type PlanResult,
  type WeekPlan,
} from "./planner";
import { createRng, deepClone, hashString } from "./random";
import type { MealType, RecipeInfo } from "./types";
import { isCompatible } from "./catalog";

/**
 * Structured changes to a week. The AI coach only produces these actions; the
 * engine applies them, so every number stays computed by code.
 */
export type PlanAction =
  | { type: "replace_meal"; day: number; meal: MealType; recipeId?: string }
  | { type: "eat_out"; day: number; meal: MealType; label: string; kcal?: number; memberIds?: string[] }
  | { type: "missing_ingredient"; ingredientId: string; fromDay: number }
  | { type: "time_limit"; day: number; meal: MealType; minutes: number }
  | { type: "guests"; day: number; meal: MealType; total: number }
  | { type: "skip_meal"; day: number; meal: MealType }
  | { type: "regenerate"; fromDay: number };

/** Typical restaurant / take-away meal energy when the user gives no figure. */
export const DEFAULT_OUT_KCAL: Record<MealType, number> = {
  breakfast: 550,
  lunch: 900,
  dinner: 1000,
  snack: 350,
};

function clonePlan(plan: WeekPlan): WeekPlan {
  return deepClone(plan);
}

function find(plan: WeekPlan, day: number, meal: MealType): PlannedMeal {
  const m = plan.meals.find((x) => x.day === day && x.meal === meal);
  if (!m) throw new Error(`No meal ${meal} on day ${day}`);
  return m;
}

/** Meals that were planned as leftovers of `m`. */
function leftoverChildren(plan: WeekPlan, m: PlannedMeal): PlannedMeal[] {
  return plan.meals.filter((c) => c.leftoverOf?.day === m.day && c.leftoverOf.meal === m.meal);
}

function rngFor(plan: WeekPlan, action: PlanAction) {
  return createRng(plan.seed ^ hashString(JSON.stringify(action)));
}

export function applyAction(ctx: PlanContext, input: WeekPlan, action: PlanAction): PlanResult {
  const plan = clonePlan(input);
  const rng = rngFor(plan, action);

  switch (action.type) {
    case "replace_meal": {
      const m = find(plan, action.day, action.meal);
      const children = leftoverChildren(plan, m);
      if (action.recipeId) {
        const r = ctx.catalog.recipe(action.recipeId);
        setMealRecipe(ctx, plan, m, r);
        for (const c of children) setMealRecipe(ctx, plan, c, r);
        balanceDays(ctx, plan, new Set([key(m.day, m.meal), ...children.map((c) => key(c.day, c.meal))]));
        return withSummary(ctx, plan);
      }
      const banned = m.recipeId;
      const open = new Set([key(m.day, m.meal), ...children.map((c) => key(c.day, c.meal))]);
      const ctx2 = banned ? withDisliked(ctx, banned) : ctx;
      for (const c of children) c.leftoverOf = undefined;
      return fillSlots(ctx2, plan, open, rng);
    }

    case "eat_out": {
      const m = find(plan, action.day, action.meal);
      const kcal = action.kcal ?? DEFAULT_OUT_KCAL[action.meal];
      const atHome = slotEaters(ctx.members, { meal: m.meal });
      const away = action.memberIds?.length ? action.memberIds : atHome.map((e) => e.id);
      const everyone = atHome.every((e) => away.includes(e.id));
      const orphans = new Set<string>();
      m.external = { label: action.label, kcal, memberIds: everyone ? undefined : away };
      if (everyone) {
        m.kind = "external";
        m.recipeId = undefined;
        m.portions = [];
        m.guests = undefined;
        m.leftoverOf = undefined;
        // Leftovers that depended on this meal need a new plan.
        for (const c of leftoverChildren(plan, m)) {
          c.leftoverOf = undefined;
          orphans.add(key(c.day, c.meal));
        }
      } else {
        m.portions = m.portions.filter((p) => !away.includes(p.memberId));
      }
      addGentleCompensation(ctx, plan, action.day, action.meal, kcal, away);
      const result = orphans.size > 0 ? fillSlots(ctx, plan, orphans, rng).plan : plan;
      // Portions of the following days absorb part of the extra energy.
      const later = new Set(result.meals.filter((x) => x.day > action.day).map((x) => key(x.day, x.meal)));
      balanceDays(ctx, result, later);
      return withSummary(ctx, result);
    }

    case "missing_ingredient": {
      const open = new Set<string>();
      for (const m of plan.meals) {
        if (m.day < action.fromDay || !m.recipeId || m.locked) continue;
        const r = ctx.catalog.recipe(m.recipeId);
        if (r.ingredients.some((i) => i.id === action.ingredientId)) {
          open.add(key(m.day, m.meal));
          m.leftoverOf = undefined;
          for (const c of leftoverChildren(plan, m)) {
            c.leftoverOf = undefined;
            open.add(key(c.day, c.meal));
          }
        }
      }
      if (open.size === 0) return withSummary(ctx, plan);
      return fillSlots(ctx, plan, open, rng, { excludeIngredients: [action.ingredientId] });
    }

    case "time_limit": {
      const m = find(plan, action.day, action.meal);
      m.maxMinutes = action.minutes;
      if (m.recipeId && ctx.catalog.recipe(m.recipeId).prepMin <= action.minutes && m.kind === "recipe") {
        return withSummary(ctx, plan);
      }
      const open = new Set([key(m.day, m.meal)]);
      for (const c of leftoverChildren(plan, m)) {
        c.leftoverOf = undefined;
        open.add(key(c.day, c.meal));
      }
      if (m.kind === "leftover") m.leftoverOf = undefined;
      return fillSlots(ctx, plan, open, rng);
    }

    case "guests": {
      const m = find(plan, action.day, action.meal);
      const household = m.portions.length;
      m.guests = Math.max(0, action.total - household);
      if (m.kind === "leftover") {
        // Leftovers were not cooked for guests: cook something for everybody.
        m.leftoverOf = undefined;
        return fillSlots(ctx, plan, new Set([key(m.day, m.meal)]), rng);
      }
      return withSummary(ctx, plan);
    }

    case "skip_meal": {
      const m = find(plan, action.day, action.meal);
      for (const c of leftoverChildren(plan, m)) c.leftoverOf = undefined;
      const children = leftoverChildren(input, m).map((c) => key(c.day, c.meal));
      Object.assign(m, { kind: "skipped", recipeId: undefined, portions: [], guests: undefined, leftoverOf: undefined });
      if (children.length) return fillSlots(ctx, plan, new Set(children), rng);
      return withSummary(ctx, plan);
    }

    case "regenerate": {
      const open = new Set<string>();
      for (const m of plan.meals) {
        if (m.day >= action.fromDay && !m.locked && m.kind !== "external") open.add(key(m.day, m.meal));
      }
      plan.seed = (plan.seed * 31 + 7) >>> 0;
      return fillSlots(ctx, plan, open, createRng(plan.seed));
    }
  }
}

/**
 * After a big meal, lighten the next two days a little (max 10 % per day)
 * instead of compensating everything at once. No punishment, no skipped meals.
 */
function addGentleCompensation(
  ctx: PlanContext,
  plan: WeekPlan,
  day: number,
  meal: MealType,
  kcal: number,
  memberIds: string[],
): void {
  for (const member of ctx.members) {
    if (!memberIds.includes(member.id) || member.isChild) continue;
    const share = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 }[meal];
    const surplus = kcal - member.targets.kcal * share;
    if (surplus < 150) continue;
    let rest = surplus * 0.5; // half is absorbed by normal day-to-day variation
    for (let d = day + 1; d < Math.min(DAYS, day + 3) && rest > 0; d++) {
      const cut = Math.min(rest, member.targets.kcal * 0.1);
      plan.adjustments.push({ memberId: member.id, day: d, kcal: -Math.round(cut) });
      rest -= cut;
    }
  }
}

function setMealRecipe(ctx: PlanContext, plan: WeekPlan, m: PlannedMeal, r: RecipeInfo): void {
  m.recipeId = r.id;
  if (m.kind !== "leftover") m.kind = "recipe";
  m.portions = portionsFor(r, slotEaters(ctx.members, m), m.meal, m.day, ctx.prefs, plan.adjustments);
}

function withDisliked(ctx: PlanContext, recipeId: string): PlanContext {
  // A replaced recipe is not offered again for this slot.
  return { ...ctx, prefs: { ...ctx.prefs, dislikedRecipes: [...ctx.prefs.dislikedRecipes, recipeId] } };
}

function withSummary(ctx: PlanContext, plan: WeekPlan): PlanResult {
  const { summary, stock } = summarize(ctx, plan);
  return { plan, summary, stock };
}

// ---------------------------------------------------------------- Alternatives

export interface Alternative {
  recipe: RecipeInfo;
  /** Change in weekly cost if chosen */
  costDelta: number;
  /** Change of energy for the slot, per person (kcal of one serving) */
  kcal: number;
  /** Share of ingredients already in the kitchen */
  reuse: number;
}

/**
 * Recipes that could replace a meal: compatible with everybody at the table,
 * ranked by fit, cost and use of what is already bought.
 */
export function alternatives(
  ctx: PlanContext,
  plan: WeekPlan,
  day: number,
  meal: MealType,
  opts: { limit?: number; maxMinutes?: number; query?: string } = {},
): Alternative[] {
  const m = find(plan, day, meal);
  const eaters = slotEaters(ctx.members, m);
  const avoid = [...new Set(eaters.flatMap((e) => e.avoid))];
  const others = plan.meals.filter((x) => !(x.day === day && x.meal === meal));
  const base = simulate(ctx.catalog, plan.meals, ctx.pantry).totalCost;
  const stockWithout = simulate(ctx.catalog, others, ctx.pantry);
  const used = new Set(plan.meals.map((x) => x.recipeId));
  const q = opts.query?.toLowerCase();

  const cands = ctx.catalog.allRecipes().filter(
    (r) =>
      r.id !== m.recipeId &&
      isCompatible(r, { prefs: ctx.prefs, avoid, meal, maxMinutes: opts.maxMinutes ?? m.maxMinutes }) &&
      (!q || r.name.fr.toLowerCase().includes(q)),
  );

  const scored = cands.map((r) => {
    const trial: PlannedMeal = {
      ...m,
      kind: "recipe",
      recipeId: r.id,
      portions: portionsFor(r, eaters, meal, day, ctx.prefs, plan.adjustments),
    };
    let mass = 0;
    let fromStock = 0;
    for (const [id, qty] of mealRequirements(ctx.catalog, trial)) {
      if (ctx.catalog.ingredient(id).staple) continue;
      const g = ctx.catalog.grams(id, qty);
      mass += g;
      fromStock += ctx.catalog.grams(id, Math.min(qty, stockWithout.onHand(id)));
    }
    const newCost = simulate(ctx.catalog, [...others, trial], ctx.pantry).totalCost;
    const reuse = mass > 0 ? fromStock / mass : 0;
    const costDelta = Math.round((newCost - base) * 100) / 100;
    const target = eaters[0] ? eaters[0].targets : undefined;
    const proteinGap = target
      ? Math.max(0, (target.protein * 4) / target.kcal - (r.nutrition.protein * 4) / Math.max(1, r.nutrition.kcal))
      : 0;
    const score = costDelta * 0.3 - reuse * 1.2 + proteinGap * 4 + (used.has(r.id) ? 1 : 0) - (ctx.affinity?.[r.id] ?? 0) * 0.3;
    return { recipe: r, costDelta, kcal: r.nutrition.kcal, reuse: Math.round(reuse * 100) / 100, score };
  });
  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, opts.limit ?? 6)
    .map(({ score: _s, ...rest }) => rest);
}
