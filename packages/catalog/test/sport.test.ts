import { describe, expect, it } from "vitest";
import { generateWorkoutWeek, weeklyReview, learnAffinity, type SportProfile } from "@weeko/engine";
import { exercises } from "../src";

const base: SportProfile = {
  level: "beginner",
  goal: "lose_weight",
  availableDays: [0, 1, 2, 3, 4],
  minutesPerSession: 30,
  equipment: [],
  limitations: [],
  weightKg: 75,
  week: 1,
};

describe("exercise library", () => {
  it("references valid easier variants", () => {
    const ids = new Set(exercises.map((e) => e.id));
    for (const e of exercises) if (e.easier) expect(ids.has(e.easier), e.id).toBe(true);
  });
});

describe("workout week", () => {
  it("plans sessions only on available days", () => {
    const w = generateWorkoutWeek(base, exercises);
    for (const s of w.sessions) if (s.type !== "rest") expect(base.availableDays).toContain(s.day);
    expect(w.sessions.filter((s) => s.type !== "rest").length).toBeLessThanOrEqual(4);
    expect(w.sessions.some((s) => s.type === "strength")).toBe(true);
  });

  it("respects time, equipment and limitations", () => {
    const w = generateWorkoutWeek({ ...base, level: "advanced", limitations: ["knees"], availableDays: [0, 1, 2, 3, 4, 5, 6] }, exercises);
    for (const s of w.sessions) {
      expect(s.minutes).toBeLessThanOrEqual(30);
      for (const b of s.blocks) {
        const e = exercises.find((x) => x.id === b.exerciseId)!;
        expect(e.stresses.includes("knees"), e.id).toBe(false);
        expect(e.equipment.every((q) => q === "none" || q === "mat"), e.id).toBe(true);
      }
    }
  });

  it("progresses week after week", () => {
    const w1 = generateWorkoutWeek(base, exercises);
    const w3 = generateWorkoutWeek({ ...base, week: 3 }, exercises);
    const reps = (w: typeof w1) => w.sessions.find((s) => s.type === "strength")!.blocks[0]!.amount;
    expect(reps(w3)).toBeGreaterThan(reps(w1));
    expect(w3.stepsGoal).toBeGreaterThan(w1.stepsGoal);
  });
});

describe("weekly review", () => {
  const targets = { kcal: 1800, protein: 120, carbs: 200, fat: 60, fiber: 30, waterMl: 2300, bmr: 1400, tdee: 2200 };
  it("suggests protein and lighter training when needed", () => {
    const r = weeklyReview({
      goal: "lose_weight",
      targets,
      weights: [],
      days: [0, 1, 2, 3].map((day) => ({ day, kcal: 1800, protein: 70, plannedEaten: 3, planned: 4 })),
      sessionsPlanned: 4,
      sessionsDone: 1,
      weekStart: "2026-10-05",
    });
    const codes = r.recommendations.map((x) => x.code);
    expect(codes).toContain("more_protein");
    expect(codes).toContain("lighter_training");
    expect(r.adherence).toBe(0.75);
  });

  it("detects too fast weight loss", () => {
    const weights = Array.from({ length: 21 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 8, 21 + i)).toISOString().slice(0, 10),
      kg: 90 - i * 0.3,
    }));
    const r = weeklyReview({ goal: "lose_weight", targets, weights, days: [], sessionsPlanned: 0, sessionsDone: 0, weekStart: "2026-10-05" });
    expect(r.recommendations.map((x) => x.code)).toContain("slow_down_loss");
  });

  it("learns affinities", () => {
    const a = learnAffinity([
      { recipeId: "a", type: "liked" },
      { recipeId: "b", type: "disliked" },
      { recipeId: "b", type: "replaced" },
    ]);
    expect(a.a).toBe(1);
    expect(a.b).toBe(-2);
  });
});
