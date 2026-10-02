import { assessSafety, bmi, type SafetyResult } from "./safety";
import type { ActivityLevel, Nutrients, NutritionTargets, Person } from "./types";
import { ZERO_NUTRIENTS } from "./types";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** 1 kg of body weight change ≈ 7 700 kcal. */
export const KCAL_PER_KG = 7700;

/** Mifflin-St Jeor resting energy expenditure. */
export function mifflinStJeor(p: Pick<Person, "sex" | "age" | "heightCm" | "weightKg">): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === "male" ? base + 5 : base - 161;
}

/** Extra energy for pregnancy / breastfeeding (EFSA reference values). */
export function pregnancyExtraKcal(p: Person): number {
  switch (p.pregnancy) {
    case "pregnant_t1":
      return 70;
    case "pregnant_t2":
      return 260;
    case "pregnant_t3":
      return 500;
    case "breastfeeding":
      return 500;
    default:
      return 0;
  }
}

/** Weight used for protein targets: capped at BMI 27 for people with obesity. */
export function referenceWeight(p: Person): number {
  if (bmi(p.weightKg, p.heightCm) <= 27) return p.weightKg;
  const h = p.heightCm / 100;
  return 27 * h * h;
}

export interface TargetsResult {
  targets: NutritionTargets;
  safety: SafetyResult;
}

/** Approximate daily energy needs of children (ANSES / EFSA orders of magnitude). */
const CHILD_KCAL: { maxAge: number; female: number; male: number }[] = [
  { maxAge: 3, female: 1000, male: 1050 },
  { maxAge: 5, female: 1300, male: 1350 },
  { maxAge: 8, female: 1550, male: 1650 },
  { maxAge: 11, female: 1800, male: 1950 },
  { maxAge: 14, female: 2100, male: 2400 },
];

export function computeTargets(p: Person): TargetsResult {
  const safety = assessSafety(p);
  if (p.age < 15) {
    // Household children: plan growth-appropriate portions, never a diet.
    const row = CHILD_KCAL.find((r) => p.age <= r.maxAge) ?? CHILD_KCAL[CHILD_KCAL.length - 1]!;
    const kcal = row[p.sex];
    const protein = Math.round(Math.max(p.weightKg * 1.0, (kcal * 0.12) / 4));
    const fat = Math.round((kcal * 0.33) / 9);
    return {
      targets: {
        kcal,
        protein,
        fat,
        carbs: Math.round((kcal - protein * 4 - fat * 9) / 4),
        fiber: Math.round(Math.max(12, p.age + 5)),
        waterMl: Math.round(Math.min(2000, 800 + p.age * 80) / 50) * 50,
        bmr: Math.round(kcal / 1.5),
        tdee: kcal,
      },
      safety,
    };
  }
  const bmr = mifflinStJeor(p);
  const tdee = bmr * ACTIVITY_FACTORS[p.activity] + pregnancyExtraKcal(p);

  let kcal = tdee + (safety.weeklyChangeKg * KCAL_PER_KG) / 7;
  if (safety.weeklyChangeKg < 0) {
    // Never below BMR × 1.1 nor the absolute floor.
    kcal = Math.max(kcal, bmr * 1.1, safety.kcalFloor);
  }
  if (p.age < 18) kcal = Math.max(kcal, tdee);
  kcal = Math.round(kcal / 10) * 10;

  const refW = referenceWeight(p);
  const proteinPerKg =
    safety.goal === "lose_weight" ? 1.8 : safety.goal === "gain_muscle" ? 1.8 : p.age >= 65 ? 1.2 : 1.0;
  let protein = refW * proteinPerKg;
  if (p.medical?.includes("kidney_disease")) protein = Math.min(protein, refW * 0.8);
  protein = Math.round(protein);

  const fatShare = 0.3;
  const fat = Math.round(Math.max((kcal * fatShare) / 9, p.weightKg * 0.6));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fiber = Math.round(Math.max(25, (kcal / 1000) * 14));
  const waterMl = Math.round(Math.min(3500, Math.max(1500, p.weightKg * 33)) / 50) * 50 +
    (p.pregnancy === "breastfeeding" ? 700 : p.pregnancy?.startsWith("pregnant") ? 300 : 0);

  return {
    targets: { kcal, protein, carbs, fat, fiber, waterMl, bmr: Math.round(bmr), tdee: Math.round(tdee) },
    safety,
  };
}

// ---------------------------------------------------------------- helpers

export function addNutrients(a: Nutrients, b: Nutrients, factor = 1): Nutrients {
  return {
    kcal: a.kcal + b.kcal * factor,
    protein: a.protein + b.protein * factor,
    carbs: a.carbs + b.carbs * factor,
    sugars: a.sugars + b.sugars * factor,
    fat: a.fat + b.fat * factor,
    satFat: a.satFat + b.satFat * factor,
    fiber: a.fiber + b.fiber * factor,
    salt: a.salt + b.salt * factor,
  };
}

export function scaleNutrients(a: Nutrients, factor: number): Nutrients {
  return addNutrients(ZERO_NUTRIENTS, a, factor);
}

export function roundNutrients(a: Nutrients): Nutrients {
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    kcal: Math.round(a.kcal),
    protein: r1(a.protein),
    carbs: r1(a.carbs),
    sugars: r1(a.sugars),
    fat: r1(a.fat),
    satFat: r1(a.satFat),
    fiber: r1(a.fiber),
    salt: Math.round(a.salt * 100) / 100,
  };
}

/** Atwater check: kcal declared should match macros within tolerance. */
export function atwaterKcal(n: Nutrients): number {
  return n.protein * 4 + n.carbs * 4 + n.fat * 9 + n.fiber * 2;
}

/** Expected weight change per week from an average daily balance. */
export function projectedWeeklyChange(avgDailyKcal: number, tdee: number): number {
  return ((avgDailyKcal - tdee) * 7) / KCAL_PER_KG;
}
