import "server-only";
import {
  computeTargets,
  generateWorkoutWeek,
  learnAffinity,
  type FoodTag,
  type NutritionTargets,
  type PlanContext,
  type PlanMember,
  type SafetyResult,
  type WorkoutWeek,
} from "@weeko/engine";
import { exercises, getCatalog } from "@weeko/catalog";
import { ageFrom, daysBetween, todayIn, weekStartOf } from "./dates";
import { can } from "./premium";
import { getHealth, getPantry, getProfile, getRecipeEvents, recentPlans } from "./repo";
import type { HealthData, MemberHealth, Profile } from "./types";

export interface MemberTargets {
  member: MemberHealth;
  age: number;
  targets: NutritionTargets;
  safety: SafetyResult;
}

export function memberTargets(m: MemberHealth, today: string): MemberTargets {
  const age = ageFrom(m.birthDate, today);
  const { targets, safety } = computeTargets({
    id: m.id,
    name: m.name,
    sex: m.sex,
    age,
    heightCm: m.heightCm,
    weightKg: m.weightKg,
    activity: m.activity,
    goal: m.goal,
    weeklyChangeKg: m.weeklyChangeKg,
    targetWeightKg: m.targetWeightKg,
    pregnancy: m.pregnancy,
    medical: m.medical,
  });
  return { member: m, age, targets, safety };
}

/** Food restrictions that follow a person: allergies and pregnancy. */
function avoidFor(m: MemberHealth): FoodTag[] {
  const tags: FoodTag[] = [...m.allergies];
  if (m.pregnancy && m.pregnancy !== "none" && m.pregnancy !== "breastfeeding") tags.push("pregnancy_avoid", "alcohol");
  if (ageFrom(m.birthDate, new Date().toISOString().slice(0, 10)) < 1) tags.push("honey");
  return tags;
}

export interface UserContext {
  userId: string;
  profile: Profile;
  health: HealthData;
  today: string;
  weekStart: string;
  self: MemberTargets;
  members: MemberTargets[];
  ctx: PlanContext;
}

/**
 * Everything the engine needs for this user. Free accounts plan for the
 * account owner only, without budget nor pantry optimisation.
 */
export async function loadUserContext(userId: string): Promise<UserContext | null> {
  const [profile, health] = await Promise.all([getProfile(userId), getHealth(userId)]);
  if (!profile || !health || health.members.length === 0) return null;
  const today = todayIn(profile.timeZone);
  const weekStart = weekStartOf(today);
  const premium = can(profile, "family");
  const people = (premium ? health.members : health.members.filter((m) => m.self)).map((m) => memberTargets(m, today));
  const self = people.find((p) => p.member.self) ?? people[0]!;

  const [pantry, events, plans] = await Promise.all([
    can(profile, "pantry") ? getPantry(userId) : Promise.resolve([]),
    getRecipeEvents(userId),
    recentPlans(userId, 3),
  ]);
  const recentRecipes = plans
    .filter((p) => p.weekStart !== weekStart)
    .flatMap((p) => p.plan.meals.map((m) => m.recipeId))
    .filter((x): x is string => !!x);

  const members: PlanMember[] = people.map((p) => ({
    id: p.member.id,
    name: p.member.name,
    targets: p.targets,
    eats: p.member.eats,
    avoid: avoidFor(p.member),
    isChild: p.age < 15,
  }));

  const ctx: PlanContext = {
    // Seasonings the user doesn't eat are taken out of recipes; other dislikes exclude recipes.
    catalog: getCatalog(profile.market, profile.prefs.dislikedIngredients ?? []),
    members,
    prefs: profile.prefs,
    budget: profile.budget.enabled && can(profile, "budget") ? profile.budget.weekly : undefined,
    pantry,
    recentRecipes,
    affinity: learnAffinity(events),
  };
  return { userId, profile, health, today, weekStart, self, members: people, ctx };
}

export function workoutWeekFor(uc: UserContext, weekStart: string): WorkoutWeek {
  const s = uc.profile.sport;
  const week = Math.max(1, Math.floor(daysBetween(weekStartOf(s.startedAt), weekStart) / 7) + 1);
  return generateWorkoutWeek(
    {
      level: s.level,
      goal: uc.self.safety.goal,
      availableDays: s.availableDays,
      minutesPerSession: s.minutesPerSession,
      equipment: s.equipment,
      limitations: s.limitations,
      weightKg: uc.self.member.weightKg,
      week,
    },
    exercises,
  );
}

/** The pace chosen for a weight goal, read back from the stored weekly change. */
export function paceOf(m: Pick<MemberHealth, "goal" | "weeklyChangeKg" | "weightKg">): "gentle" | "moderate" {
  const weekly = m.weeklyChangeKg ?? 0;
  if (m.goal === "lose_weight") return Math.abs(weekly) <= m.weightKg * 0.005 ? "gentle" : "moderate";
  if (m.goal === "gain_muscle") return weekly <= 0.15 ? "gentle" : "moderate";
  return "gentle";
}
