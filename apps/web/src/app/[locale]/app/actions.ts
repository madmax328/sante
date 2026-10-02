"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MEAL_TYPES, alternatives as engineAlternatives, type MealType, type PlanAction } from "@weeko/engine";
import { addDays, todayIn, weekStartOf } from "@/lib/dates";
import { FREE_LIMITS, can, isPremium } from "@/lib/premium";
import {
  addLogEntry,
  addRecipeEvent,
  addWater,
  getPantry,
  getPlan,
  getProfile,
  removePlannedEntry,
  savePantry,
  setPlanFields,
  updateProfile,
} from "@/lib/repo";
import { requireUserId } from "@/lib/session";
import { applyPlanAction, generateForUser, loadWeek } from "@/lib/week-service";

const meal = z.enum(MEAL_TYPES);
const day = z.number().int().min(0).max(6);
const weekStart = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

export type ActionResult = { ok: true } | { ok: false; error: "premium" | "quota" | "invalid" | "no_plan" | "server" };

function refresh() {
  revalidatePath("/[locale]/app", "layout");
}

async function bumpUsage(userId: string, field: "replacements" | "aiMessages"): Promise<number> {
  const profile = await getProfile(userId);
  const current = weekStartOf(todayIn(profile?.timeZone));
  const usage = profile?.usage?.weekStart === current ? profile.usage : { weekStart: current, replacements: 0, aiMessages: 0 };
  usage[field] += 1;
  await updateProfile(userId, { usage });
  return usage[field];
}

export async function generateWeekAction(input?: { weekStart?: string }): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = weekStart.safeParse(input?.weekStart);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    await generateForUser(userId, parsed.data, Math.floor(Math.random() * 2 ** 31));
  } catch (e) {
    console.error(e);
    return { ok: false, error: "server" };
  }
  refresh();
  return { ok: true };
}

export async function replaceMealAction(input: { day: number; meal: MealType; recipeId?: string; weekStart?: string }): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = z.object({ day, meal, recipeId: z.string().max(120).optional(), weekStart }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile(userId);
  if (!isPremium(profile)) {
    const used = await bumpUsage(userId, "replacements");
    if (used > FREE_LIMITS.replacementsPerWeek) return { ok: false, error: "quota" };
  }
  try {
    await applyPlanAction(userId, { type: "replace_meal", day: parsed.data.day, meal: parsed.data.meal, recipeId: parsed.data.recipeId }, parsed.data.weekStart);
  } catch (e) {
    console.error(e);
    return { ok: false, error: "no_plan" };
  }
  refresh();
  return { ok: true };
}

const planActionSchema: z.ZodType<PlanAction> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("replace_meal"), day, meal, recipeId: z.string().max(120).optional() }),
  z.object({ type: z.literal("eat_out"), day, meal, label: z.string().trim().min(1).max(80), kcal: z.number().min(50).max(3000).optional(), memberIds: z.array(z.string().max(20)).max(10).optional() }),
  z.object({ type: z.literal("missing_ingredient"), ingredientId: z.string().max(60), fromDay: day }),
  z.object({ type: z.literal("time_limit"), day, meal, minutes: z.number().int().min(5).max(180) }),
  z.object({ type: z.literal("guests"), day, meal, total: z.number().int().min(1).max(20) }),
  z.object({ type: z.literal("skip_meal"), day, meal }),
  z.object({ type: z.literal("regenerate"), fromDay: day }),
]);

/** Structured adjustments (restaurant, guests, time, missing ingredient…) are Premium. */
export async function planActionAction(input: { actions: PlanAction[]; weekStart?: string }): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = z.object({ actions: z.array(planActionSchema).min(1).max(8), weekStart }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile(userId);
  if (!can(profile, "ai_adjust")) return { ok: false, error: "premium" };
  try {
    for (const a of parsed.data.actions) await applyPlanAction(userId, a, parsed.data.weekStart);
  } catch (e) {
    console.error(e);
    return { ok: false, error: "no_plan" };
  }
  refresh();
  return { ok: true };
}

export interface AlternativeView {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  minutes: number;
  costDelta: number;
  reuse: number;
}

export async function getAlternativesAction(input: { day: number; meal: MealType; query?: string; weekStart?: string }): Promise<AlternativeView[]> {
  const userId = await requireUserId();
  const parsed = z.object({ day, meal, query: z.string().max(60).optional(), weekStart }).safeParse(input);
  if (!parsed.success) return [];
  const { uc, stored } = await loadWeek(userId, parsed.data.weekStart);
  if (!stored) return [];
  return engineAlternatives(uc.ctx, stored.plan, parsed.data.day, parsed.data.meal, { limit: 8, query: parsed.data.query }).map((a) => ({
    id: a.recipe.id,
    name: a.recipe.name.fr,
    kcal: a.recipe.nutrition.kcal,
    protein: a.recipe.nutrition.protein,
    minutes: a.recipe.totalMin,
    costDelta: a.costDelta,
    reuse: a.reuse,
  }));
}

/** Marks a planned meal as eaten: it goes to the food journal with the planned portion. */
export async function toggleEatenAction(input: { day: number; meal: MealType; weekStart?: string }): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = z.object({ day, meal, weekStart }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { uc, stored } = await loadWeek(userId, parsed.data.weekStart);
  if (!stored) return { ok: false, error: "no_plan" };
  const k = `${parsed.data.day}:${parsed.data.meal}`;
  const m = stored.plan.meals.find((x) => x.day === parsed.data.day && x.meal === parsed.data.meal);
  const date = addDays(stored.weekStart, parsed.data.day);
  const refId = `${stored.weekStart}:${k}`;
  const eaten = stored.eaten ?? [];
  if (eaten.includes(k)) {
    await setPlanFields(userId, stored.weekStart, { eaten: eaten.filter((x) => x !== k) });
    await removePlannedEntry(userId, date, refId);
  } else {
    await setPlanFields(userId, stored.weekStart, { eaten: [...eaten, k] });
    const self = uc.self.member.id;
    if (m?.recipeId && (m.kind === "recipe" || m.kind === "leftover")) {
      const r = uc.ctx.catalog.recipe(m.recipeId);
      const servings = m.portions.find((p) => p.memberId === self)?.servings ?? 1;
      await addLogEntry(userId, date, {
        id: crypto.randomUUID(),
        meal: m.meal,
        kind: "planned",
        refId,
        name: r.name.fr,
        amount: servings,
        kcal: Math.round(r.nutrition.kcal * servings),
        protein: Math.round(r.nutrition.protein * servings),
        carbs: Math.round(r.nutrition.carbs * servings),
        fat: Math.round(r.nutrition.fat * servings),
        at: new Date(),
      });
      await addRecipeEvent(userId, r.id, "eaten");
    } else if (m?.external) {
      await addLogEntry(userId, date, {
        id: crypto.randomUUID(),
        meal: m.meal,
        kind: "planned",
        refId,
        name: m.external.label,
        amount: 1,
        kcal: m.external.kcal,
        protein: 0,
        carbs: 0,
        fat: 0,
        at: new Date(),
      });
    }
  }
  refresh();
  return { ok: true };
}

export async function toggleCheckedAction(input: { ingredientId: string; weekStart?: string }): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = z.object({ ingredientId: z.string().max(60), weekStart }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile(userId);
  const ws = parsed.data.weekStart ?? weekStartOf(todayIn(profile?.timeZone));
  const plan = await getPlan(userId, ws);
  if (!plan) return { ok: false, error: "no_plan" };
  const checked = plan.checked.includes(parsed.data.ingredientId)
    ? plan.checked.filter((x) => x !== parsed.data.ingredientId)
    : [...plan.checked, parsed.data.ingredientId];
  await setPlanFields(userId, ws, { checked });
  return { ok: true };
}

/**
 * Shopping done: remembers what was spent and, for Premium, moves what will be
 * left of long-life products into the pantry for next week.
 */
export async function markShoppedAction(input: { actualSpent?: number; weekStart?: string }): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = z.object({ actualSpent: z.number().min(0).max(5000).optional(), weekStart }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { uc, stored, result } = await loadWeek(userId, parsed.data.weekStart);
  if (!stored || !result) return { ok: false, error: "no_plan" };
  await setPlanFields(userId, stored.weekStart, { shoppedAt: new Date(), actualSpent: parsed.data.actualSpent });
  if (can(uc.profile, "pantry")) {
    const pantry = await getPantry(userId);
    const map = new Map(pantry.map((p) => [p.ingredientId, p.qty]));
    for (const [id, q] of result.stock.leftovers()) {
      if (uc.ctx.catalog.ingredient(id).shelfLifeDays >= 30) map.set(id, (map.get(id) ?? 0) + Math.round(q));
    }
    await savePantry(userId, [...map].map(([ingredientId, qty]) => ({ ingredientId, qty })));
  }
  refresh();
  return { ok: true };
}

export async function addWaterAction(input: { ml: number; date?: string }): Promise<{ ok: boolean; waterMl?: number }> {
  const userId = await requireUserId();
  const parsed = z.object({ ml: z.number().int().min(-2000).max(2000), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false };
  const profile = await getProfile(userId);
  const waterMl = await addWater(userId, parsed.data.date ?? todayIn(profile?.timeZone), parsed.data.ml);
  refresh();
  return { ok: true, waterMl };
}

export async function setBudgetAction(input: { enabled: boolean; weekly: number; regenerate?: boolean }): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = z.object({ enabled: z.boolean(), weekly: z.number().min(10).max(1000), regenerate: z.boolean().optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile(userId);
  if (!can(profile, "budget")) return { ok: false, error: "premium" };
  await updateProfile(userId, { budget: { enabled: parsed.data.enabled, weekly: parsed.data.weekly } });
  if (parsed.data.regenerate) await generateForUser(userId, undefined, Math.floor(Math.random() * 2 ** 31));
  refresh();
  return { ok: true };
}

export async function rateRecipeAction(input: { recipeId: string; rating: "liked" | "disliked" | "none" }): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = z.object({ recipeId: z.string().max(120), rating: z.enum(["liked", "disliked", "none"]) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile(userId);
  if (!profile) return { ok: false, error: "server" };
  const { recipeId, rating } = parsed.data;
  const liked = profile.prefs.likedRecipes.filter((x) => x !== recipeId);
  const disliked = profile.prefs.dislikedRecipes.filter((x) => x !== recipeId);
  if (rating === "liked") liked.push(recipeId);
  if (rating === "disliked") disliked.push(recipeId);
  await updateProfile(userId, { prefs: { ...profile.prefs, likedRecipes: liked, dislikedRecipes: disliked } });
  if (rating !== "none") await addRecipeEvent(userId, recipeId, rating);
  refresh();
  return { ok: true };
}
