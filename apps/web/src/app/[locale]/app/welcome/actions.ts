"use server";

import { ALLERGENS, MIN_SIGNUP_AGE, type FoodTag, type MealType } from "@weeko/engine";
import { z } from "zod";
import { ageFrom, todayIn } from "@/lib/dates";
import { memberTargets } from "@/lib/planning";
import { ensureProfile, saveHealth, updateProfile } from "@/lib/repo";
import { requireUserId } from "@/lib/session";
import { CONSENT_VERSION, type MemberHealth } from "@/lib/types";
import { generateForUser } from "@/lib/week-service";

const sex = z.enum(["female", "male"]);
const activity = z.enum(["sedentary", "light", "moderate", "active", "very_active"]);
const goal = z.enum(["lose_weight", "maintain", "gain_muscle", "eat_better", "save_money", "family_meals"]);
const allergen = z.enum(ALLERGENS);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const eats = z.object({ breakfast: z.boolean(), lunch: z.boolean(), dinner: z.boolean(), snack: z.boolean() });

const person = z.object({
  name: z.string().trim().min(1).max(40),
  sex,
  birthDate: date,
  heightCm: z.number().min(50).max(250),
  weightKg: z.number().min(10).max(350),
  activity,
  goal,
  allergies: z.array(allergen).max(14),
  eats,
});

const schema = z.object({
  self: person.extend({
    targetWeightKg: z.number().min(30).max(350).optional(),
    pace: z.enum(["gentle", "moderate"]),
    pregnancy: z.enum(["none", "pregnant_t1", "pregnant_t2", "pregnant_t3", "breastfeeding"]),
    medical: z.array(z.enum(["diabetes", "kidney_disease", "heart_disease", "eating_disorder_history", "bariatric_surgery", "other"])),
  }),
  members: z.array(person).max(8),
  prefs: z.object({
    diet: z.enum(["omnivore", "pescatarian", "vegetarian", "vegan"]),
    avoid: z.array(z.enum(["pork", "beef", "lamb", "alcohol", "seafood", "fish", "dairy", "egg", "gluten"])),
    dislikedIngredients: z.array(z.string().max(40)).max(50),
    maxMinutesWeekday: z.number().min(10).max(120),
    maxMinutesWeekend: z.number().min(10).max(180),
    equipment: z.array(z.enum(["oven", "microwave", "blender", "airfryer", "slowcooker"])),
    leftovers: z.boolean(),
    snacks: z.boolean(),
  }),
  budget: z.object({ enabled: z.boolean(), weekly: z.number().min(10).max(1000) }),
  sport: z.object({
    enabled: z.boolean(),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    availableDays: z.array(z.number().int().min(0).max(6)).max(7),
    minutesPerSession: z.number().min(10).max(90),
    equipment: z.array(z.enum(["dumbbells", "band", "kettlebell", "pullup_bar", "bike", "pool"])),
    limitations: z.array(z.enum(["knees", "back", "shoulders", "wrists"])),
  }),
  consentHealth: z.literal(true),
});

export type OnboardingInput = z.input<typeof schema>;

export type OnboardingResult = { ok: true } | { ok: false; error: "invalid" | "too_young" | "consent" | "server" };

function weeklyChange(goal: string, pace: "gentle" | "moderate", weightKg: number): number | undefined {
  if (goal === "lose_weight") return -Math.round(weightKg * (pace === "gentle" ? 0.004 : 0.0075) * 100) / 100;
  if (goal === "gain_muscle") return pace === "gentle" ? 0.15 : 0.25;
  return undefined;
}

export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const userId = await requireUserId();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: input.consentHealth ? "invalid" : "consent" };
  const data = parsed.data;
  const today = todayIn();
  if (ageFrom(data.self.birthDate, today) < MIN_SIGNUP_AGE) return { ok: false, error: "too_young" };

  const self: MemberHealth = {
    id: "self",
    name: data.self.name,
    self: true,
    sex: data.self.sex,
    birthDate: data.self.birthDate,
    heightCm: data.self.heightCm,
    weightKg: data.self.weightKg,
    activity: data.self.activity,
    goal: data.self.goal,
    weeklyChangeKg: weeklyChange(data.self.goal, data.self.pace, data.self.weightKg),
    targetWeightKg: data.self.targetWeightKg,
    pregnancy: data.self.sex === "female" ? data.self.pregnancy : "none",
    medical: data.self.medical,
    allergies: data.self.allergies,
    eats: data.self.eats,
  };
  const members: MemberHealth[] = data.members.map((m, i) => ({
    ...m,
    id: `m${i + 1}`,
    self: false,
    // Other household members never get a deficit: portions follow their needs.
    goal: m.goal === "lose_weight" || m.goal === "gain_muscle" ? m.goal : "maintain",
  }));

  const targets = memberTargets(self, today);
  const numbersHidden = targets.safety.numbersHidden;

  try {
    await ensureProfile(userId);
    await saveHealth(userId, { members: [self, ...members], numbersHidden });
    const avoid = [...new Set<FoodTag>([...data.prefs.avoid])];
    const consentAt = new Date();
    await updateProfile(userId, {
      onboarded: true,
      prefs: {
        ...data.prefs,
        avoid,
        likedRecipes: [],
        dislikedRecipes: [],
      },
      budget: data.budget,
      sport: { ...data.sport, startedAt: today },
      consents: {
        terms: { at: consentAt, version: CONSENT_VERSION },
        health: { at: consentAt, version: CONSENT_VERSION },
      },
    });
    await generateForUser(userId);
  } catch (e) {
    console.error("onboarding failed", e);
    return { ok: false, error: "server" };
  }
  return { ok: true };
}

export async function previewTargets(input: {
  sex: "female" | "male";
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activity: z.infer<typeof activity>;
  goal: z.infer<typeof goal>;
  pace: "gentle" | "moderate";
  targetWeightKg?: number;
  pregnancy: "none" | "pregnant_t1" | "pregnant_t2" | "pregnant_t3" | "breastfeeding";
  medical: MemberHealth["medical"];
}) {
  await requireUserId();
  const eatsAll: Record<MealType, boolean> = { breakfast: true, lunch: true, dinner: true, snack: true };
  const m: MemberHealth = {
    id: "self",
    name: "",
    self: true,
    ...input,
    weeklyChangeKg: weeklyChange(input.goal, input.pace, input.weightKg),
    allergies: [],
    eats: eatsAll,
  };
  const r = memberTargets(m, todayIn());
  return { targets: r.targets, safety: r.safety, age: r.age };
}
