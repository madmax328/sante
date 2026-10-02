import { isCompatible, type Catalog } from "./catalog";
import { createRng, deepClone, type Rng } from "./random";
import { Stock, type PantryItem } from "./stock";
import type {
  FoodPreferences,
  FoodTag,
  Market,
  MealType,
  NutritionTargets,
  RecipeInfo,
} from "./types";
import { MARKET_CURRENCY } from "./types";

// ---------------------------------------------------------------- Types

export interface PlanMember {
  id: string;
  name: string;
  targets: NutritionTargets;
  /** Which meals this person eats at home */
  eats: Record<MealType, boolean>;
  /** Allergies, pregnancy restrictions... */
  avoid: FoodTag[];
  isChild?: boolean;
}

export interface Portion {
  memberId: string;
  /** Number of recipe servings for this person (1 = one standard serving) */
  servings: number;
}

export type PlannedMealKind = "recipe" | "leftover" | "external" | "skipped";

export interface PlannedMeal {
  day: number;
  meal: MealType;
  kind: PlannedMealKind;
  recipeId?: string;
  portions: Portion[];
  /** Extra standard adult servings (guests) */
  guests?: number;
  /** For leftovers: the meal that was cooked in double */
  leftoverOf?: { day: number; meal: MealType };
  /** Eaten outside (restaurant...). Without memberIds it applies to every eater. */
  external?: { label: string; kcal: number; memberIds?: string[] };
  /** Max active minutes requested for this meal */
  maxMinutes?: number;
  /** Do not change when regenerating */
  locked?: boolean;
}

export interface KcalAdjustment {
  memberId: string;
  day: number;
  kcal: number;
}

export interface WeekPlan {
  version: 1;
  startDate: string;
  seed: number;
  market: Market;
  currency: string;
  budget?: number;
  meals: PlannedMeal[];
  adjustments: KcalAdjustment[];
}

export interface PlanContext {
  catalog: Catalog;
  members: PlanMember[];
  prefs: FoodPreferences;
  budget?: number;
  pantry?: PantryItem[];
  /** Recipes served in the previous weeks (avoid repeating) */
  recentRecipes?: string[];
  /** Learned affinity per recipe: positive = liked */
  affinity?: Record<string, number>;
}

export interface DayTotals {
  day: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  target: number;
}

export type PlanNoteCode =
  | "budget_over"
  | "budget_tight"
  | "no_candidate"
  | "relaxed_time"
  | "repeated_recipe";

export interface PlanNote {
  code: PlanNoteCode;
  day?: number;
  meal?: MealType;
  value?: number;
}

export interface PlanSummary {
  /** Cash spent at the shop (whole packs) */
  cost: number;
  /** Value of what the week's meals actually use */
  consumedValue: number;
  /** Value of bought products left after the week (pantry for next week) */
  leftoverValue: number;
  budget?: number;
  budgetStatus: "none" | "ok" | "tight" | "over";
  /** Cheapest cost reached when the budget could not be met */
  minimumCost?: number;
  daily: Record<string, DayTotals[]>;
  notes: PlanNote[];
}

export interface PlanResult {
  plan: WeekPlan;
  summary: PlanSummary;
  stock: Stock;
}

// ---------------------------------------------------------------- Constants

export const DAYS = 7;

const SHARE_WITH_SNACK: Record<MealType, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
};
const SHARE_NO_SNACK: Record<MealType, number> = {
  breakfast: 0.27,
  lunch: 0.38,
  dinner: 0.35,
  snack: 0,
};
/** Rough share of the food budget per meal, used to pace spending. */
const COST_WEIGHT: Record<MealType, number> = { breakfast: 0.15, lunch: 0.35, dinner: 0.38, snack: 0.12 };

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

const MIN_SERVING = 0.5;
const MAX_SERVING = 2;

export function slotsFor(prefs: FoodPreferences): MealType[] {
  return prefs.snacks ? MEAL_ORDER : MEAL_ORDER.filter((m) => m !== "snack");
}

export function mealShare(meal: MealType, snacks: boolean): number {
  return (snacks ? SHARE_WITH_SNACK : SHARE_NO_SNACK)[meal];
}

function isWeekend(startDate: string, day: number): boolean {
  const d = new Date(startDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + day);
  const w = d.getUTCDay();
  return w === 0 || w === 6;
}

export function key(day: number, meal: MealType): string {
  return `${day}:${meal}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clampServing(n: number): number {
  return Math.min(MAX_SERVING, Math.max(MIN_SERVING, round1(n)));
}

// ---------------------------------------------------------------- Simulation

/** Quantities of each ingredient required by a meal, base units. */
export function mealRequirements(catalog: Catalog, m: PlannedMeal): Map<string, number> {
  const req = new Map<string, number>();
  if ((m.kind !== "recipe" && m.kind !== "leftover") || !m.recipeId) return req;
  // Leftovers are cooked with the original meal: they still need ingredients,
  // but we count them here so the shopping list and costs stay simple.
  const r = catalog.recipe(m.recipeId);
  const servings = totalServings(m);
  for (const ri of r.ingredients) {
    req.set(ri.id, (req.get(ri.id) ?? 0) + (ri.qty * servings) / r.servings);
  }
  return req;
}

export function totalServings(m: PlannedMeal): number {
  return m.portions.reduce((s, p) => s + p.servings, 0) + (m.guests ?? 0);
}

function sortMeals(meals: PlannedMeal[]): PlannedMeal[] {
  return [...meals].sort((a, b) => a.day - b.day || MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal));
}

/** Replays a plan meal by meal to know purchases, pantry use and leftovers. */
export function simulate(catalog: Catalog, meals: PlannedMeal[], pantry: PantryItem[] = []): Stock {
  const stock = new Stock(catalog, pantry);
  for (const m of sortMeals(meals)) {
    for (const [id, q] of mealRequirements(catalog, m)) stock.consume(id, q);
  }
  return stock;
}

// ---------------------------------------------------------------- Targets per slot

function memberSlotKcal(
  member: PlanMember,
  meal: MealType,
  day: number,
  prefs: FoodPreferences,
  adjustments: KcalAdjustment[],
): number {
  const adj = adjustments
    .filter((a) => a.memberId === member.id && a.day === day)
    .reduce((s, a) => s + a.kcal, 0);
  return (member.targets.kcal + adj) * mealShare(meal, prefs.snacks);
}

function eatersFor(members: PlanMember[], meal: MealType): PlanMember[] {
  return members.filter((m) => m.eats[meal]);
}

/** People eating this meal at home (excluding those eating out). */
export function slotEaters(members: PlanMember[], m: Pick<PlannedMeal, "meal" | "external">): PlanMember[] {
  const away = m.external?.memberIds;
  if (m.external && !away) return [];
  return eatersFor(members, m.meal).filter((e) => !away?.includes(e.id));
}

export function portionsFor(
  r: RecipeInfo,
  eaters: PlanMember[],
  meal: MealType,
  day: number,
  prefs: FoodPreferences,
  adjustments: KcalAdjustment[],
): Portion[] {
  return eaters.map((e) => ({
    memberId: e.id,
    servings: clampServing(memberSlotKcal(e, meal, day, prefs, adjustments) / Math.max(50, r.nutrition.kcal)),
  }));
}

// ---------------------------------------------------------------- Scoring

interface ScoreState {
  stock: Stock;
  used: Map<string, number>;
  /** Uses this week per recipe family and per main ingredient */
  families: Map<string, number>;
  mains: Map<string, number>;
  spent: number;
  remainingWeight: number;
  dayMains: Map<number, Set<string>>;
  /** 1 = full variety rules; lower values let the budget win */
  varietyScale: number;
}

interface SlotRequest {
  day: number;
  meal: MealType;
  eaters: PlanMember[];
  /** Additional servings cooked for tomorrow's lunch */
  leftoverEaters?: PlanMember[];
  maxMinutes?: number;
  guests?: number;
  excludeIngredients?: string[];
}

/** Main protein-ish ingredient, to avoid chicken twice a day. */
function mainIngredient(catalog: Catalog, r: RecipeInfo): string | undefined {
  let best: { id: string; p: number } | undefined;
  for (const ri of r.ingredients) {
    const ing = catalog.ingredient(ri.id);
    const p = (catalog.grams(ri.id, ri.qty) * ing.nutrition.protein) / 100;
    if (!best || p > best.p) best = { id: ri.id, p };
  }
  return best?.id;
}

function scoreRecipe(
  ctx: PlanContext,
  plan: WeekPlan,
  r: RecipeInfo,
  req: SlotRequest,
  state: ScoreState,
): { score: number; cost: number } {
  const { catalog, prefs } = ctx;
  const allEaters = [...req.eaters, ...(req.leftoverEaters ?? [])];

  // 1. Portion fit: the recipe should be eatable in sensible amounts.
  let portionPenalty = 0;
  let servings = req.guests ?? 0;
  for (const e of allEaters) {
    const raw = memberSlotKcal(e, req.meal, req.day, prefs, plan.adjustments) / Math.max(50, r.nutrition.kcal);
    if (raw < 0.6) portionPenalty += (0.6 - raw) * 3;
    if (raw > 1.7) portionPenalty += (raw - 1.7) * 2;
    servings += clampServing(raw);
  }
  portionPenalty /= Math.max(1, allEaters.length);

  // 2. Protein: main meals should carry their share of protein.
  const t = req.eaters[0]?.targets;
  let proteinPenalty = 0;
  if (t && r.nutrition.kcal > 0) {
    const targetShare = (t.protein * 4) / t.kcal;
    const share = (r.nutrition.protein * 4) / r.nutrition.kcal;
    const w = req.meal === "lunch" || req.meal === "dinner" ? 4 : 1.5;
    proteinPenalty = Math.max(0, targetShare - share) * w;
  }

  // 3. Marginal cost given what is already in the kitchen.
  let cost = 0;
  let massTotal = 0;
  let massFromStock = 0;
  let newIngredients = 0;
  for (const ri of r.ingredients) {
    const ing = catalog.ingredient(ri.id);
    if (ing.staple) continue;
    const q = (ri.qty * servings) / r.servings;
    const quote = state.stock.quote(ri.id, q);
    cost += quote.cost;
    const g = catalog.grams(ri.id, q);
    massTotal += g;
    // Perishables in stock are worth more to use quickly.
    const perishable = ing.shelfLifeDays <= 7 ? 1.5 : 1;
    massFromStock += catalog.grams(ri.id, quote.fromStock) * perishable;
    if (quote.fromStock <= 1e-9) newIngredients++;
  }
  const reuse = massTotal > 0 ? Math.min(1, massFromStock / massTotal) : 0;

  let costPenalty: number;
  if (ctx.budget !== undefined) {
    const remaining = Math.max(0, ctx.budget - state.spent);
    const slotBudget = (remaining * COST_WEIGHT[req.meal]) / Math.max(0.01, state.remainingWeight);
    const ratio = cost / Math.max(0.3, slotBudget);
    costPenalty = ratio <= 1 ? ratio * 0.4 : 0.4 + (ratio - 1) * 2.5;
  } else {
    costPenalty = (r.cost / 3) * 0.15;
  }

  // 4. Variety and preferences.
  const usedCount = state.used.get(r.id) ?? 0;
  const light = req.meal === "breakfast" || req.meal === "snack";
  let variety = usedCount * (light ? 0.6 : 2);
  if (ctx.recentRecipes?.includes(r.id)) variety += 0.4;
  variety += (state.families.get(familyOf(r)) ?? 0) * (light ? 0.6 : 2);
  const main = mainIngredient(catalog, r);
  if (main) {
    variety += (state.mains.get(main) ?? 0) * (light ? 0.1 : 0.3);
    if (state.dayMains.get(req.day)?.has(main) && !light) variety += 0.6;
  }
  const affinity = ctx.affinity?.[r.id] ?? 0;
  const liked = prefs.likedRecipes.includes(r.id) ? 0.5 : 0;
  const fiberBonus = req.meal === "lunch" || req.meal === "dinner" ? Math.min(1, r.nutrition.fiber / 8) * 0.2 : 0;
  const kids = allEaters.some((e) => e.isChild) && r.tags.includes("kid-friendly") ? 0.25 : 0;
  const cuisine = prefs.cuisines?.includes(r.cuisine) ? 0.15 : 0;

  const score =
    portionPenalty +
    proteinPenalty +
    costPenalty +
    newIngredients * 0.04 -
    reuse * 0.45 +
    variety * state.varietyScale -
    affinity * 0.3 -
    liked -
    fiberBonus -
    kids -
    cuisine;
  return { score, cost };
}

export function familyOf(r: RecipeInfo): string {
  return r.family ?? r.id.split("-")[0]!;
}

/** Hard caps per week: a breakfast or snack at most 3 times, a main dish once. */
const MAX_USES: Record<MealType, number> = { breakfast: 3, snack: 3, lunch: 1, dinner: 1 };

/** Breakfasts and snacks: at most 3 variations of the same dish per week. */
const MAX_FAMILY_LIGHT = 3;

function candidatesFor(
  ctx: PlanContext,
  plan: WeekPlan,
  req: SlotRequest,
  relaxTime = false,
  used?: { recipes: Map<string, number>; families: Map<string, number> },
): RecipeInfo[] {
  const avoid = [...new Set([...req.eaters, ...(req.leftoverEaters ?? [])].flatMap((e) => e.avoid))];
  const weekend = isWeekend(plan.startDate, req.day);
  const defaultMax = weekend ? ctx.prefs.maxMinutesWeekend : ctx.prefs.maxMinutesWeekday;
  const maxMinutes = relaxTime ? undefined : (req.maxMinutes ?? defaultMax);
  return ctx.catalog.allRecipes().filter((r) => {
    if (!isCompatible(r, { prefs: ctx.prefs, avoid, meal: req.meal, maxMinutes })) return false;
    if (req.excludeIngredients && r.ingredients.some((i) => req.excludeIngredients!.includes(i.id))) return false;
    if (req.leftoverEaters && req.leftoverEaters.length > 0 && r.keepsDays < 1) return false;
    if (used && (used.recipes.get(r.id) ?? 0) >= MAX_USES[req.meal]) return false;
    if (used && (req.meal === "breakfast" || req.meal === "snack") && (used.families.get(familyOf(r)) ?? 0) >= MAX_FAMILY_LIGHT) {
      return false;
    }
    return true;
  });
}

function pick(
  ctx: PlanContext,
  plan: WeekPlan,
  req: SlotRequest,
  state: ScoreState,
  rng: Rng,
  notes: PlanNote[],
): RecipeInfo | undefined {
  let cands = candidatesFor(ctx, plan, req, false, { recipes: state.used, families: state.families });
  if (cands.length === 0) cands = candidatesFor(ctx, plan, req, false);
  if (cands.length === 0) {
    cands = candidatesFor(ctx, plan, req, true);
    if (cands.length > 0) notes.push({ code: "relaxed_time", day: req.day, meal: req.meal });
  }
  if (cands.length === 0) {
    notes.push({ code: "no_candidate", day: req.day, meal: req.meal });
    return undefined;
  }
  const scored = cands
    .map((r) => ({ r, ...scoreRecipe(ctx, plan, r, req, state) }))
    .sort((a, b) => a.score - b.score);
  const top = scored.slice(0, 5);
  const best = top[0]!.score;
  const idx = rng.weighted(top.map((s) => Math.exp(-(s.score - best) * 4)));
  return top[idx]!.r;
}

// ---------------------------------------------------------------- Generation

export interface GenerateOptions {
  startDate: string;
  seed?: number;
  /** Meals to keep as they are (eating out, locked recipes...) */
  fixed?: PlannedMeal[];
  adjustments?: KcalAdjustment[];
}

export function generateWeek(ctx: PlanContext, opts: GenerateOptions): PlanResult {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const plan: WeekPlan = {
    version: 1,
    startDate: opts.startDate,
    seed,
    market: ctx.catalog.market,
    currency: MARKET_CURRENCY[ctx.catalog.market],
    budget: ctx.budget,
    meals: [],
    adjustments: opts.adjustments ?? [],
  };
  const fixed = new Map((opts.fixed ?? []).map((m) => [key(m.day, m.meal), m]));
  const slots = slotsFor(ctx.prefs);

  // Skeleton: every slot for 7 days.
  for (let day = 0; day < DAYS; day++) {
    for (const meal of slots) {
      const f = fixed.get(key(day, meal));
      plan.meals.push(f ? { ...f } : { day, meal, kind: "skipped", portions: [] });
    }
  }
  const open = new Set(plan.meals.filter((m) => !fixed.has(key(m.day, m.meal))).map((m) => key(m.day, m.meal)));
  if (ctx.budget === undefined) return fillSlots(ctx, plan, open, createRng(seed));

  // With a budget: try full variety first, then let the budget weigh more.
  let best: PlanResult | undefined;
  // Each attempt paces spending on a slightly lower budget to keep headroom.
  const attempts: [variety: number, pacing: number][] = [
    [1, 1],
    [0.5, 0.9],
    [0.2, 0.8],
    [0.05, 0.7],
  ];
  for (const [varietyScale, pacing] of attempts) {
    const paced = { ...ctx, budget: ctx.budget * pacing };
    const res = fillSlots(paced, deepClone(plan), open, createRng(seed), { varietyScale, repairBudget: ctx.budget });
    const { summary, stock } = summarize(ctx, res.plan, res.summary.notes.filter((n) => n.code !== "budget_over"));
    const final: PlanResult = { plan: { ...res.plan, budget: ctx.budget }, summary, stock };
    if (summary.cost <= ctx.budget) return final;
    if (!best || summary.cost < best.summary.cost) best = final;
  }
  best!.summary.notes.push({ code: "budget_over", value: best!.summary.cost });
  return best!;
}

/**
 * Chooses recipes for the `open` slots, keeping the others. Used both for a
 * full week and to re-plan a few meals after a change.
 */
export function fillSlots(
  ctx: PlanContext,
  plan: WeekPlan,
  open: Set<string>,
  rng: Rng,
  constraints: { excludeIngredients?: string[]; varietyScale?: number; repairBudget?: number } = {},
): PlanResult {
  const varietyScale = constraints.varietyScale ?? 1;
  const notes: PlanNote[] = [];
  const byKey = new Map(plan.meals.map((m) => [key(m.day, m.meal), m]));

  // Leftover pairing: dinner on Mon/Wed/Fri also feeds the next lunch.
  const leftoverTarget = new Map<string, string>();
  if (ctx.prefs.leftovers) {
    for (const day of [0, 2, 4]) {
      const dk = key(day, "dinner");
      const lk = key(day + 1, "lunch");
      if (open.has(dk) && open.has(lk)) leftoverTarget.set(dk, lk);
    }
  }

  // State from the meals we keep.
  const kept = plan.meals.filter((m) => !open.has(key(m.day, m.meal)));
  const stock = simulate(ctx.catalog, kept, ctx.pantry);
  const used = new Map<string, number>();
  const families = new Map<string, number>();
  const mains = new Map<string, number>();
  const dayMains = new Map<number, Set<string>>();
  const markUsed = (m: PlannedMeal) => {
    if (!m.recipeId || m.kind !== "recipe") return;
    used.set(m.recipeId, (used.get(m.recipeId) ?? 0) + 1);
    const r = ctx.catalog.recipe(m.recipeId);
    families.set(familyOf(r), (families.get(familyOf(r)) ?? 0) + 1);
    const main = mainIngredient(ctx.catalog, r);
    if (main) mains.set(main, (mains.get(main) ?? 0) + 1);
    if (main) {
      if (!dayMains.has(m.day)) dayMains.set(m.day, new Set());
      dayMains.get(m.day)!.add(main);
    }
  };
  kept.forEach(markUsed);

  let remainingWeight = 0;
  for (const k of open) remainingWeight += COST_WEIGHT[byKey.get(k)!.meal];

  const state: ScoreState = { stock, used, families, mains, spent: stock.totalCost, remainingWeight, dayMains, varietyScale };

  for (const m of sortMeals(plan.meals)) {
    const k = key(m.day, m.meal);
    if (!open.has(k)) continue;
    state.remainingWeight -= COST_WEIGHT[m.meal];
    const eaters = slotEaters(ctx.members, m);
    if (eaters.length === 0 && !m.guests) {
      Object.assign(m, { kind: "skipped", recipeId: undefined, portions: [], leftoverOf: undefined });
      continue;
    }
    // Lunch filled by yesterday's leftovers
    const source = [...leftoverTarget.entries()].find(([, l]) => l === k)?.[0];
    if (source) {
      const src = byKey.get(source)!;
      if (src.kind === "recipe" && src.recipeId) {
        const r = ctx.catalog.recipe(src.recipeId);
        Object.assign(m, {
          kind: "leftover",
          recipeId: r.id,
          portions: portionsFor(r, eaters, m.meal, m.day, ctx.prefs, plan.adjustments),
          leftoverOf: { day: src.day, meal: src.meal },
        });
        for (const [id, q] of mealRequirements(ctx.catalog, m)) stock.consume(id, q);
        state.spent = stock.totalCost;
        continue;
      }
    }
    const lunchKey = leftoverTarget.get(k);
    const lunchEaters = lunchKey ? eatersFor(ctx.members, "lunch") : undefined;
    const req: SlotRequest = {
      day: m.day,
      meal: m.meal,
      eaters,
      leftoverEaters: lunchEaters,
      maxMinutes: m.maxMinutes,
      guests: m.guests,
      excludeIngredients: constraints.excludeIngredients,
    };
    const r = pick(ctx, plan, req, state, rng, notes);
    if (!r) {
      Object.assign(m, { kind: "skipped", recipeId: undefined, portions: [] });
      if (lunchKey) leftoverTarget.delete(k);
      continue;
    }
    Object.assign(m, {
      kind: "recipe",
      recipeId: r.id,
      portions: portionsFor(r, eaters, m.meal, m.day, ctx.prefs, plan.adjustments),
      leftoverOf: undefined,
    });
    for (const [id, q] of mealRequirements(ctx.catalog, m)) stock.consume(id, q);
    state.spent = stock.totalCost;
    markUsed(m);
  }

  balanceDays(ctx, plan, open);
  if (ctx.budget !== undefined) {
    repairBudget({ ...ctx, budget: constraints.repairBudget ?? ctx.budget }, plan, open, notes, varietyScale);
  }
  return finalize(ctx, plan, notes);
}

// ---------------------------------------------------------------- Balancing

/** Per member per day: tune snack (or main meal) servings to land on target. */
export function balanceDays(ctx: PlanContext, plan: WeekPlan, open?: Set<string>): void {
  for (const member of ctx.members) {
    for (let day = 0; day < DAYS; day++) {
      const target =
        member.targets.kcal +
        plan.adjustments.filter((a) => a.memberId === member.id && a.day === day).reduce((s, a) => s + a.kcal, 0);
      const dayMeals = plan.meals.filter((m) => m.day === day);
      const total = dayKcal(ctx.catalog, dayMeals, member.id);
      let gap = target - total;
      if (Math.abs(gap) < target * 0.04) continue;
      const adjustable = dayMeals
        .filter((m) => (m.kind === "recipe" || m.kind === "leftover") && (!open || open.has(key(m.day, m.meal))))
        .sort((a, b) => (a.meal === "snack" ? -1 : b.meal === "snack" ? 1 : 0));
      for (const m of adjustable) {
        const portion = m.portions.find((p) => p.memberId === member.id);
        if (!portion || !m.recipeId) continue;
        const kcal = ctx.catalog.recipe(m.recipeId).nutrition.kcal;
        if (kcal <= 0) continue;
        const limit = m.meal === "snack" ? 1 : 0.25;
        const delta = Math.max(-limit, Math.min(limit, gap / kcal));
        const next = clampServing(portion.servings + delta);
        gap -= (next - portion.servings) * kcal;
        portion.servings = next;
        if (Math.abs(gap) < target * 0.04) break;
      }
    }
  }
}

export function externalKcal(m: PlannedMeal, memberId: string): number {
  if (!m.external) return 0;
  if (m.external.memberIds && !m.external.memberIds.includes(memberId)) return 0;
  return m.external.kcal;
}

export function dayKcal(catalog: Catalog, meals: PlannedMeal[], memberId: string): number {
  let total = 0;
  for (const m of meals) {
    total += externalKcal(m, memberId);
    if (!m.recipeId || (m.kind !== "recipe" && m.kind !== "leftover")) continue;
    const p = m.portions.find((x) => x.memberId === memberId);
    if (p) total += catalog.recipe(m.recipeId).nutrition.kcal * p.servings;
  }
  return total;
}

// ---------------------------------------------------------------- Budget repair

/** Recipe, family and main-ingredient counts of a plan, ignoring one meal. */
function varietyCounts(ctx: PlanContext, plan: WeekPlan, except: PlannedMeal) {
  const recipes = new Map<string, number>();
  const families = new Map<string, number>();
  const mains = new Map<string, number>();
  for (const x of plan.meals) {
    if (x === except || x.kind !== "recipe" || !x.recipeId) continue;
    const r = ctx.catalog.recipe(x.recipeId);
    recipes.set(r.id, (recipes.get(r.id) ?? 0) + 1);
    families.set(familyOf(r), (families.get(familyOf(r)) ?? 0) + 1);
    const main = mainIngredient(ctx.catalog, r);
    if (main) mains.set(main, (mains.get(main) ?? 0) + 1);
  }
  return { recipes, families, mains };
}

function nutritionPenalty(ctx: PlanContext, plan: WeekPlan, m: PlannedMeal, r: RecipeInfo): number {
  const eaters = slotEaters(ctx.members, m);
  let p = 0;
  for (const e of eaters) {
    const raw = memberSlotKcal(e, m.meal, m.day, ctx.prefs, plan.adjustments) / Math.max(50, r.nutrition.kcal);
    if (raw < 0.6) p += (0.6 - raw) * 3;
    if (raw > 1.7) p += (raw - 1.7) * 2;
    const share = r.nutrition.kcal > 0 ? (r.nutrition.protein * 4) / r.nutrition.kcal : 0;
    const target = (e.targets.protein * 4) / e.targets.kcal;
    p += Math.max(0, target - share) * (m.meal === "lunch" || m.meal === "dinner" ? 4 : 1.5);
  }
  return p / Math.max(1, eaters.length);
}

function setRecipe(ctx: PlanContext, plan: WeekPlan, m: PlannedMeal, r: RecipeInfo): void {
  m.recipeId = r.id;
  m.kind = "recipe";
  m.portions = portionsFor(r, slotEaters(ctx.members, m), m.meal, m.day, ctx.prefs, plan.adjustments);
  for (const child of plan.meals) {
    if (child.leftoverOf && child.leftoverOf.day === m.day && child.leftoverOf.meal === m.meal) {
      child.recipeId = r.id;
      child.portions = portionsFor(r, slotEaters(ctx.members, child), child.meal, child.day, ctx.prefs, plan.adjustments);
    }
  }
}

/**
 * Greedy improvement: swap the meal whose replacement saves the most money for
 * the least nutritional damage, until the plan fits the budget.
 */
function repairBudget(ctx: PlanContext, plan: WeekPlan, open: Set<string>, notes: PlanNote[], varietyScale = 1): void {
  const budget = ctx.budget!;
  let cost = simulate(ctx.catalog, plan.meals, ctx.pantry).totalCost;
  for (let iter = 0; iter < 40 && cost > budget; iter++) {
    let best: { m: PlannedMeal; r: RecipeInfo; newCost: number; value: number } | undefined;
    for (const m of plan.meals) {
      if (m.kind !== "recipe" || !m.recipeId || !open.has(key(m.day, m.meal))) continue;
      const current = ctx.catalog.recipe(m.recipeId);
      const hasLeftover = plan.meals.some((c) => c.leftoverOf?.day === m.day && c.leftoverOf.meal === m.meal);
      const req: SlotRequest = {
        day: m.day,
        meal: m.meal,
        eaters: slotEaters(ctx.members, m),
        leftoverEaters: hasLeftover ? eatersFor(ctx.members, "lunch") : undefined,
        maxMinutes: m.maxMinutes,
      };
      const counts = varietyCounts(ctx, plan, m);
      const light = m.meal === "breakfast" || m.meal === "snack";
      // Rank by marginal cost given everything else already planned, so that
      // recipes using leftovers of opened packs come first.
      const others = plan.meals.filter((x) => x !== m && !(x.leftoverOf?.day === m.day && x.leftoverOf.meal === m.meal));
      const stockWithout = simulate(ctx.catalog, others, ctx.pantry);
      const servings = totalServings(m) + (hasLeftover ? eatersFor(ctx.members, "lunch").length : 0);
      const marginal = (r: RecipeInfo) => {
        let c = 0;
        for (const ri of r.ingredients) c += stockWithout.quote(ri.id, (ri.qty * servings) / r.servings).cost;
        return c;
      };
      const currentMarginal = marginal(current);
      const cheaper = candidatesFor(ctx, plan, req)
        .filter(
          (r) =>
            r.id !== current.id &&
            (counts.recipes.get(r.id) ?? 0) < MAX_USES[m.meal] &&
            (!light || (counts.families.get(familyOf(r)) ?? 0) < MAX_FAMILY_LIGHT),
        )
        .map((r) => ({ r, c: marginal(r) }))
        .filter((x) => x.c < currentMarginal - 0.05)
        .sort((a, b) => a.c - b.c)
        .slice(0, 12)
        .map((x) => x.r);
      const repeatPenalty = (r: RecipeInfo) => {
        const main = mainIngredient(ctx.catalog, r);
        return (
          ((counts.families.get(familyOf(r)) ?? 0) * (light ? 0.6 : 2) +
            (main ? (counts.mains.get(main) ?? 0) * (light ? 0.1 : 0.3) : 0)) *
          varietyScale
        );
      };
      const basePenalty = nutritionPenalty(ctx, plan, m, current) + repeatPenalty(current);
      for (const r of cheaper) {
        const trial: WeekPlan = { ...plan, meals: deepClone(plan.meals) };
        const tm = trial.meals.find((x) => x.day === m.day && x.meal === m.meal)!;
        setRecipe(ctx, trial, tm, r);
        const newCost = simulate(ctx.catalog, trial.meals, ctx.pantry).totalCost;
        const saved = cost - newCost;
        if (saved <= 0.05) continue;
        const damage = Math.max(0, nutritionPenalty(ctx, plan, m, r) + repeatPenalty(r) - basePenalty);
        const value = saved / (0.5 + damage * 3);
        if (!best || value > best.value) best = { m, r, newCost, value };
      }
    }
    if (!best) break;
    setRecipe(ctx, plan, best.m, best.r);
    cost = best.newCost;
  }
  balanceDays(ctx, plan, open);
  cost = simulate(ctx.catalog, plan.meals, ctx.pantry).totalCost;
  if (cost > budget) notes.push({ code: "budget_over", value: Math.round(cost * 100) / 100 });
}

// ---------------------------------------------------------------- Summary

export function summarize(ctx: PlanContext, plan: WeekPlan, notes: PlanNote[] = []): { summary: PlanSummary; stock: Stock } {
  const stock = simulate(ctx.catalog, plan.meals, ctx.pantry);
  const cost = Math.round(stock.totalCost * 100) / 100;
  let leftoverValue = 0;
  for (const [id, q] of stock.leftovers()) leftoverValue += ctx.catalog.price(id, q);
  leftoverValue = Math.round(leftoverValue * 100) / 100;
  const daily: Record<string, DayTotals[]> = {};
  for (const member of ctx.members) {
    daily[member.id] = [];
    for (let day = 0; day < DAYS; day++) {
      const totals: DayTotals = {
        day,
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        target:
          member.targets.kcal +
          plan.adjustments.filter((a) => a.memberId === member.id && a.day === day).reduce((s, a) => s + a.kcal, 0),
      };
      for (const m of plan.meals.filter((x) => x.day === day)) {
        totals.kcal += externalKcal(m, member.id);
        if (!m.recipeId || (m.kind !== "recipe" && m.kind !== "leftover")) continue;
        const p = m.portions.find((x) => x.memberId === member.id);
        if (!p) continue;
        const n = ctx.catalog.recipe(m.recipeId).nutrition;
        totals.kcal += n.kcal * p.servings;
        totals.protein += n.protein * p.servings;
        totals.carbs += n.carbs * p.servings;
        totals.fat += n.fat * p.servings;
        totals.fiber += n.fiber * p.servings;
      }
      totals.kcal = Math.round(totals.kcal);
      totals.protein = Math.round(totals.protein);
      totals.carbs = Math.round(totals.carbs);
      totals.fat = Math.round(totals.fat);
      totals.fiber = Math.round(totals.fiber);
      daily[member.id]!.push(totals);
    }
  }
  let budgetStatus: PlanSummary["budgetStatus"] = "none";
  if (ctx.budget !== undefined) {
    budgetStatus = cost > ctx.budget ? "over" : cost > ctx.budget * 0.95 ? "tight" : "ok";
  }
  const repeated = new Map<string, number>();
  for (const m of plan.meals) {
    if (m.kind === "recipe" && m.recipeId && (m.meal === "lunch" || m.meal === "dinner")) {
      repeated.set(m.recipeId, (repeated.get(m.recipeId) ?? 0) + 1);
    }
  }
  const allNotes = [...notes];
  if ([...repeated.values()].some((n) => n > 1)) allNotes.push({ code: "repeated_recipe" });
  return {
    summary: {
      cost,
      consumedValue: Math.round((cost - leftoverValue) * 100) / 100,
      leftoverValue,
      budget: ctx.budget,
      budgetStatus,
      minimumCost: budgetStatus === "over" ? cost : undefined,
      daily,
      notes: dedupeNotes(allNotes),
    },
    stock,
  };
}

function dedupeNotes(notes: PlanNote[]): PlanNote[] {
  const seen = new Set<string>();
  return notes.filter((n) => {
    const k = `${n.code}:${n.day}:${n.meal}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function finalize(ctx: PlanContext, plan: WeekPlan, notes: PlanNote[]): PlanResult {
  plan.budget = ctx.budget;
  const { summary, stock } = summarize(ctx, plan, notes);
  return { plan, summary, stock };
}
