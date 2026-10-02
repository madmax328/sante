import type { Goal, Person } from "./types";

/**
 * Health safety rules. The app is a general wellness tool: whenever a situation
 * calls for medical follow-up, we stay conservative and say so.
 */

export const MIN_SIGNUP_AGE = 15;

export type SafetyLevel = "ok" | "adjusted" | "blocked";

export type SafetyCode =
  | "under_min_age"
  | "minor_no_deficit"
  | "pregnancy_no_deficit"
  | "breastfeeding_mild_deficit_only"
  | "underweight_no_loss"
  | "target_weight_too_low"
  | "pace_too_fast"
  | "medical_supervision"
  | "eating_disorder_history"
  | "gain_too_fast"
  | "kcal_floor";

export interface SafetyNotice {
  code: SafetyCode;
  level: SafetyLevel;
}

export interface SafetyResult {
  level: SafetyLevel;
  notices: SafetyNotice[];
  /** Goal after adjustments */
  goal: Goal;
  /** Weekly change actually allowed, kg (negative = loss) */
  weeklyChangeKg: number;
  /** Hide calories and weight figures in the interface */
  numbersHidden: boolean;
  /** Women / men absolute calorie floors */
  kcalFloor: number;
}

export function bmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

const WEIGHT_GOALS: Goal[] = ["lose_weight", "gain_muscle"];

export function assessSafety(p: Person): SafetyResult {
  const notices: SafetyNotice[] = [];
  let goal: Goal = p.goal;
  let weekly = p.weeklyChangeKg ?? defaultWeeklyChange(p.goal, p.weightKg);
  let numbersHidden = p.numbersHidden ?? false;
  const kcalFloor = p.sex === "female" ? 1200 : 1500;

  const push = (code: SafetyCode, level: SafetyLevel) => notices.push({ code, level });

  if (p.age < MIN_SIGNUP_AGE) {
    push("under_min_age", "blocked");
    return { level: "blocked", notices, goal: "eat_better", weeklyChangeKg: 0, numbersHidden: true, kcalFloor };
  }

  const currentBmi = bmi(p.weightKg, p.heightCm);
  const wantsLoss = goal === "lose_weight" || weekly < 0;

  if (p.age < 18 && (wantsLoss || goal === "gain_muscle")) {
    push("minor_no_deficit", "adjusted");
    goal = "eat_better";
    weekly = 0;
  }

  const preg = p.pregnancy ?? "none";
  if (preg.startsWith("pregnant") && (wantsLoss || goal === "gain_muscle")) {
    push("pregnancy_no_deficit", "adjusted");
    goal = "eat_better";
    weekly = 0;
  }
  if (preg === "breastfeeding" && weekly < -0.5) {
    push("breastfeeding_mild_deficit_only", "adjusted");
    weekly = -0.5;
  }

  if (goal === "lose_weight" && currentBmi < 18.5) {
    push("underweight_no_loss", "adjusted");
    goal = "eat_better";
    weekly = 0;
  }

  if (goal === "lose_weight" && p.targetWeightKg !== undefined && bmi(p.targetWeightKg, p.heightCm) < 18.5) {
    push("target_weight_too_low", "adjusted");
  }

  if (p.medical?.includes("eating_disorder_history")) {
    push("eating_disorder_history", "adjusted");
    if (WEIGHT_GOALS.includes(goal)) goal = "eat_better";
    weekly = 0;
    numbersHidden = true;
  }

  const supervised = (p.medical ?? []).filter((m) => m !== "eating_disorder_history" && m !== "other");
  if (supervised.length > 0 || p.medical?.includes("other")) {
    push("medical_supervision", "adjusted");
    // Keep the goal but stay gentle: max 0.5 kg / week.
    if (weekly < -0.5) weekly = -0.5;
  }

  // Max loss: 1 % of body weight per week, and at most 1 kg.
  const maxLoss = -Math.min(1, p.weightKg * 0.01);
  if (goal === "lose_weight" && weekly < maxLoss) {
    push("pace_too_fast", "adjusted");
    weekly = round2(maxLoss);
  }
  // Muscle gain: lean gain beyond ~0.5 % / week is mostly fat.
  const maxGain = Math.min(0.5, p.weightKg * 0.005);
  if (goal === "gain_muscle" && weekly > maxGain) {
    push("gain_too_fast", "adjusted");
    weekly = round2(maxGain);
  }
  if (goal !== "lose_weight" && goal !== "gain_muscle") weekly = 0;

  const level: SafetyLevel = notices.some((n) => n.level === "blocked")
    ? "blocked"
    : notices.length > 0
      ? "adjusted"
      : "ok";
  return { level, notices, goal, weeklyChangeKg: weekly, numbersHidden, kcalFloor };
}

export function defaultWeeklyChange(goal: Goal, weightKg: number): number {
  if (goal === "lose_weight") return -round2(Math.min(0.75, weightKg * 0.0075));
  if (goal === "gain_muscle") return round2(Math.min(0.25, weightKg * 0.0025));
  return 0;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
