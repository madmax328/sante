import "server-only";
import {
  applyAction,
  buildShoppingList,
  generateWeek,
  summarize,
  type PlanAction,
  type PlanResult,
  type WeekPlan,
} from "@weeko/engine";
import { addDays } from "./dates";
import { loadUserContext, workoutWeekFor, type UserContext } from "./planning";
import { addRecipeEvent, getPlan, getWorkoutWeek, savePlan, saveWorkoutWeek } from "./repo";
import type { StoredPlan } from "./types";

export class NoProfileError extends Error {
  constructor() {
    super("Profile not completed");
  }
}

async function context(userId: string): Promise<UserContext> {
  const uc = await loadUserContext(userId);
  if (!uc) throw new NoProfileError();
  return uc;
}

/** Creates (or recreates) the meal plan of a week and its workout plan. */
export async function generateForUser(userId: string, weekStart?: string, seed?: number): Promise<PlanResult> {
  const uc = await context(userId);
  const start = weekStart ?? uc.weekStart;
  const existing = await getPlan(userId, start);
  // Keep meals the user already declared (restaurant...) when regenerating.
  const fixed = existing?.plan.meals.filter((m) => m.kind === "external" || m.locked) ?? [];
  const result = generateWeek(uc.ctx, { startDate: start, seed, fixed, adjustments: existing?.plan.adjustments });
  await savePlan(userId, start, result.plan, true);
  if (uc.profile.sport.enabled && !(await getWorkoutWeek(userId, start))) {
    await saveWorkoutWeek(userId, start, workoutWeekFor(uc, start));
  }
  return result;
}

export interface LoadedWeek {
  uc: UserContext;
  stored: StoredPlan | null;
  result: PlanResult | null;
}

/** The stored plan with fresh costs and totals (prices or pantry may have changed). */
export async function loadWeek(userId: string, weekStart?: string): Promise<LoadedWeek> {
  const uc = await context(userId);
  const start = weekStart ?? uc.weekStart;
  const stored = await getPlan(userId, start);
  if (!stored) return { uc, stored: null, result: null };
  const ctx = { ...uc.ctx, budget: stored.plan.budget ?? uc.ctx.budget };
  const { summary, stock } = summarize(ctx, stored.plan);
  return { uc, stored, result: { plan: stored.plan, summary, stock } };
}

/** Applies a structured change (from a button or from the AI) and saves it. */
export async function applyPlanAction(userId: string, action: PlanAction, weekStart?: string): Promise<PlanResult> {
  const { uc, stored } = await loadWeek(userId, weekStart);
  if (!stored) throw new Error("No plan for this week");
  const before = stored.plan.meals.find(
    (m) => "day" in action && "meal" in action && m.day === action.day && m.meal === action.meal,
  );
  const result = applyAction(uc.ctx, stored.plan, action);
  await savePlan(userId, stored.weekStart, result.plan);
  if (action.type === "replace_meal" && before?.recipeId) await addRecipeEvent(userId, before.recipeId, "replaced");
  return result;
}

/** Same as applyPlanAction without saving: used to preview AI proposals. */
export async function previewPlanActions(userId: string, actions: PlanAction[], weekStart?: string) {
  const { uc, stored } = await loadWeek(userId, weekStart);
  if (!stored) throw new Error("No plan for this week");
  let plan: WeekPlan = stored.plan;
  let result: PlanResult | undefined;
  for (const a of actions) {
    result = applyAction(uc.ctx, plan, a);
    plan = result.plan;
  }
  return { before: stored.plan, after: result ?? null, uc };
}

export function shoppingFor(uc: UserContext, result: PlanResult) {
  return buildShoppingList(uc.ctx.catalog, result.stock);
}

export function dateOf(weekStart: string, day: number): string {
  return addDays(weekStart, day);
}
