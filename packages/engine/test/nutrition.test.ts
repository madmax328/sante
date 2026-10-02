import { describe, expect, it } from "vitest";
import { assessSafety, computeTargets, mifflinStJeor, type Person } from "../src";

const base: Person = {
  id: "me",
  name: "Test",
  sex: "female",
  age: 35,
  heightCm: 165,
  weightKg: 70,
  activity: "light",
  goal: "lose_weight",
};

describe("energy", () => {
  it("computes Mifflin-St Jeor", () => {
    // 10*70 + 6.25*165 - 5*35 - 161 = 1395.25
    expect(mifflinStJeor(base)).toBeCloseTo(1395.25, 2);
    expect(mifflinStJeor({ ...base, sex: "male" })).toBeCloseTo(1561.25, 2);
  });

  it("creates a moderate deficit for weight loss", () => {
    const { targets, safety } = computeTargets(base);
    expect(safety.level).toBe("ok");
    expect(targets.tdee).toBe(Math.round(1395.25 * 1.375));
    expect(targets.kcal).toBeLessThan(targets.tdee);
    expect(targets.kcal).toBeGreaterThanOrEqual(1200);
    // macros add up to the energy target (±2 %)
    const kcalFromMacros = targets.protein * 4 + targets.carbs * 4 + targets.fat * 9;
    expect(Math.abs(kcalFromMacros - targets.kcal) / targets.kcal).toBeLessThan(0.02);
  });

  it("never goes below the floor", () => {
    const tiny = { ...base, heightCm: 150, weightKg: 52, age: 60, activity: "sedentary" as const, weeklyChangeKg: -1 };
    expect(computeTargets(tiny).targets.kcal).toBeGreaterThanOrEqual(1200);
  });

  it("adds a surplus for muscle gain", () => {
    const t = computeTargets({ ...base, goal: "gain_muscle" }).targets;
    expect(t.kcal).toBeGreaterThan(t.tdee);
  });

  it("gives children growth-appropriate targets", () => {
    const t = computeTargets({ ...base, age: 8, heightCm: 128, weightKg: 26, goal: "family_meals" }).targets;
    expect(t.kcal).toBeGreaterThan(1300);
  });
});

describe("safety", () => {
  it("blocks accounts under 15", () => {
    expect(assessSafety({ ...base, age: 14 }).level).toBe("blocked");
  });
  it("removes the deficit for minors", () => {
    const s = assessSafety({ ...base, age: 16 });
    expect(s.goal).toBe("eat_better");
    expect(s.notices.map((n) => n.code)).toContain("minor_no_deficit");
  });
  it("removes the deficit during pregnancy", () => {
    const s = assessSafety({ ...base, pregnancy: "pregnant_t2" });
    expect(s.weeklyChangeKg).toBe(0);
    const t = computeTargets({ ...base, pregnancy: "pregnant_t2" }).targets;
    expect(t.kcal).toBeGreaterThan(t.tdee - 1);
  });
  it("refuses weight loss when underweight", () => {
    const s = assessSafety({ ...base, weightKg: 48 });
    expect(s.goal).toBe("eat_better");
  });
  it("flags a target weight that is too low", () => {
    const s = assessSafety({ ...base, targetWeightKg: 45 });
    expect(s.notices.map((n) => n.code)).toContain("target_weight_too_low");
  });
  it("caps the pace at 1 % per week", () => {
    const s = assessSafety({ ...base, weeklyChangeKg: -2 });
    expect(s.weeklyChangeKg).toBeCloseTo(-0.7, 2);
  });
  it("hides numbers after an eating disorder history", () => {
    const s = assessSafety({ ...base, medical: ["eating_disorder_history"] });
    expect(s.numbersHidden).toBe(true);
    expect(s.weeklyChangeKg).toBe(0);
  });
});
