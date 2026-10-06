import { MEAL_ORDER } from "@weeko/engine";
import { dayIndex } from "@/lib/dates";
import { mobileRoute } from "@/lib/mobile";
import { getPhotoMap } from "@/lib/photos";
import { can, isPremium } from "@/lib/premium";
import { getLog, getWorkoutWeek } from "@/lib/repo";
import { loadWeek } from "@/lib/week-service";

export const dynamic = "force-dynamic";

/** The "Aujourd'hui" screen: meals, energy, water, workout and budget. */
export const GET = mobileRoute(async (_req, userId) => {
  const { uc, stored, result } = await loadWeek(userId);
  const day = dayIndex(uc.today);
  const [log, workouts] = await Promise.all([
    getLog(userId, uc.today),
    uc.profile.sport.enabled && can(uc.profile, "sport") ? getWorkoutWeek(userId, uc.weekStart) : Promise.resolve(null),
  ]);
  const hidden = !!uc.health.numbersHidden;
  const selfId = uc.self.member.id;
  const meals = (stored?.plan.meals ?? []).filter((m) => m.day === day).sort((a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal));
  const photos = await getPhotoMap(meals.map((m) => m.recipeId).filter((x): x is string => !!x));
  const session = workouts?.week.sessions.find((s) => s.day === day);
  return {
    date: uc.today,
    day,
    name: uc.self.member.name,
    premium: isPremium(uc.profile),
    hasPlan: !!stored,
    notices: uc.self.safety.notices.filter((n) => n.code !== "kcal_floor").map((n) => n.code),
    meals: meals.map((m) => {
      const recipe = m.recipeId ? uc.ctx.catalog.recipe(m.recipeId) : undefined;
      const servings = m.portions.find((p) => p.memberId === selfId)?.servings ?? 0;
      return {
        meal: m.meal,
        kind: m.kind,
        recipeId: recipe?.id ?? null,
        name: recipe?.name.fr ?? m.external?.label ?? null,
        kcal: recipe && !hidden ? Math.round(recipe.nutrition.kcal * servings) : null,
        minutes: recipe?.totalMin ?? null,
        servings,
        photo: recipe ? (photos.get(recipe.id)?.thumb ?? null) : null,
        eaten: stored?.eaten?.includes(`${m.day}:${m.meal}`) ?? false,
      };
    }),
    energy: hidden
      ? null
      : {
          kcal: Math.round(log.entries.reduce((s, x) => s + x.kcal, 0)),
          target: uc.self.targets.kcal,
          protein: Math.round(log.entries.reduce((s, x) => s + x.protein, 0)),
          proteinTarget: uc.self.targets.protein,
        },
    water: { ml: log.waterMl ?? 0, target: uc.self.targets.waterMl },
    workout: !uc.profile.sport.enabled
      ? null
      : session
        ? { type: session.type, title: session.title.fr, minutes: session.minutes, done: workouts?.done.includes(day) ?? false }
        : { type: "none" as const },
    budget: result
      ? {
          cost: result.summary.cost,
          eaten: result.summary.consumedValue,
          kept: result.summary.leftoverValue,
          budget: result.summary.budget ?? null,
          actualSpent: stored?.actualSpent ?? null,
        }
      : null,
  };
});
