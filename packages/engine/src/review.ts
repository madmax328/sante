import type { Goal, NutritionTargets } from "./types";

export interface WeightEntry {
  /** ISO date YYYY-MM-DD */
  date: string;
  kg: number;
}

export interface DayLog {
  day: number;
  kcal: number;
  protein: number;
  /** Planned meals marked as eaten */
  plannedEaten: number;
  /** Planned meals that day (at home) */
  planned: number;
  waterMl?: number;
}

export interface ReviewInput {
  goal: Goal;
  targets: NutritionTargets;
  weights: WeightEntry[];
  days: DayLog[];
  sessionsPlanned: number;
  sessionsDone: number;
  budgetPlanned?: number;
  budgetActual?: number;
  weekStart: string;
}

export type RecommendationCode =
  | "keep_going"
  | "simplify_meals"
  | "plateau_adjust"
  | "slow_down_loss"
  | "more_protein"
  | "lighter_training"
  | "more_training"
  | "budget_check"
  | "log_more"
  | "hydrate";

export interface Recommendation {
  code: RecommendationCode;
  value?: number;
}

export interface WeeklyReview {
  weekStart: string;
  /** Smoothed weight at end of week and change vs previous week (kg) */
  trendKg?: number;
  trendChangeKg?: number;
  avgKcal?: number;
  avgProtein?: number;
  /** Share of planned meals actually followed, 0-1 */
  adherence?: number;
  sessionsDone: number;
  sessionsPlanned: number;
  budgetPlanned?: number;
  budgetActual?: number;
  daysLogged: number;
  recommendations: Recommendation[];
}

/** Exponentially smoothed weight (α = 0.25) evaluated day by day. */
export function weightTrend(entries: WeightEntry[]): { date: string; kg: number }[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const out: { date: string; kg: number }[] = [];
  let ema: number | undefined;
  for (const e of sorted) {
    ema = ema === undefined ? e.kg : ema + 0.25 * (e.kg - ema);
    out.push({ date: e.date, kg: Math.round(ema * 100) / 100 });
  }
  return out;
}

function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function trendAt(trend: { date: string; kg: number }[], date: string): number | undefined {
  let v: number | undefined;
  for (const p of trend) if (p.date <= date) v = p.kg;
  return v;
}

export function weeklyReview(input: ReviewInput): WeeklyReview {
  const recs: Recommendation[] = [];
  const end = addDays(input.weekStart, 6);
  const trend = weightTrend(input.weights);
  const trendKg = trendAt(trend, end);
  const prev = trendAt(trend, addDays(input.weekStart, -1));
  const trendChangeKg = trendKg !== undefined && prev !== undefined ? Math.round((trendKg - prev) * 100) / 100 : undefined;

  const logged = input.days.filter((d) => d.kcal > 0);
  const avgKcal = logged.length ? Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length) : undefined;
  const avgProtein = logged.length ? Math.round(logged.reduce((s, d) => s + d.protein, 0) / logged.length) : undefined;
  const planned = input.days.reduce((s, d) => s + d.planned, 0);
  const eaten = input.days.reduce((s, d) => s + d.plannedEaten, 0);
  const adherence = planned > 0 ? Math.round((eaten / planned) * 100) / 100 : undefined;

  if (logged.length < 3) recs.push({ code: "log_more" });
  if (adherence !== undefined && adherence < 0.5) recs.push({ code: "simplify_meals" });

  // Weight: two consecutive weeks of trend are compared to the goal.
  const twoWeeksAgo = trendAt(trend, addDays(input.weekStart, -8));
  if (input.goal === "lose_weight" && trendKg !== undefined) {
    const weekly = trendChangeKg ?? 0;
    const maxLoss = trendKg * 0.01;
    if (-weekly > maxLoss) recs.push({ code: "slow_down_loss", value: 150 });
    else if (twoWeeksAgo !== undefined && trendKg - twoWeeksAgo > -0.1 && (adherence ?? 0) >= 0.7) {
      recs.push({ code: "plateau_adjust", value: -100 });
    }
  }
  if (avgProtein !== undefined && avgProtein < input.targets.protein * 0.8) {
    recs.push({ code: "more_protein", value: Math.round(input.targets.protein - avgProtein) });
  }
  if (input.sessionsPlanned > 0) {
    const ratio = input.sessionsDone / input.sessionsPlanned;
    if (ratio < 0.5) recs.push({ code: "lighter_training" });
    else if (ratio >= 1 && input.sessionsPlanned < 5) recs.push({ code: "more_training" });
  }
  if (input.budgetPlanned !== undefined && input.budgetActual !== undefined && input.budgetActual > input.budgetPlanned * 1.1) {
    recs.push({ code: "budget_check", value: Math.round((input.budgetActual - input.budgetPlanned) * 100) / 100 });
  }
  const water = input.days.filter((d) => d.waterMl !== undefined);
  if (water.length >= 3 && water.reduce((s, d) => s + (d.waterMl ?? 0), 0) / water.length < input.targets.waterMl * 0.6) {
    recs.push({ code: "hydrate" });
  }
  if (recs.length === 0) recs.push({ code: "keep_going" });

  return {
    weekStart: input.weekStart,
    trendKg,
    trendChangeKg,
    avgKcal,
    avgProtein,
    adherence,
    sessionsDone: input.sessionsDone,
    sessionsPlanned: input.sessionsPlanned,
    budgetPlanned: input.budgetPlanned,
    budgetActual: input.budgetActual,
    daysLogged: logged.length,
    recommendations: recs,
  };
}

/**
 * Learned affinity per recipe from user signals: likes, dislikes, replaced
 * meals and meals marked as eaten. Feeds the next week's generation.
 */
export function learnAffinity(
  events: { recipeId: string; type: "liked" | "disliked" | "replaced" | "eaten" | "skipped" }[],
): Record<string, number> {
  const weights = { liked: 1, disliked: -2, replaced: -0.5, eaten: 0.15, skipped: -0.2 };
  const out: Record<string, number> = {};
  for (const e of events) out[e.recipeId] = (out[e.recipeId] ?? 0) + weights[e.type];
  for (const k of Object.keys(out)) out[k] = Math.max(-2, Math.min(2, out[k]!));
  return out;
}
