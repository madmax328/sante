import { MEAL_ORDER } from "@weeko/engine";
import { addDays, dayIndex, weekStartOf } from "@/lib/dates";
import { mobileRoute } from "@/lib/mobile";
import { getPhotoMap } from "@/lib/photos";
import { loadWeek } from "@/lib/week-service";

export const dynamic = "force-dynamic";

/** The week plan: 7 days × meals, with daily totals and the shopping estimate. */
export const GET = mobileRoute(async (req, userId) => {
  const start = new URL(req.url).searchParams.get("start");
  const weekStart = start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? weekStartOf(start) : undefined;
  const { uc, stored, result } = await loadWeek(userId, weekStart);
  const requested = weekStart ?? uc.weekStart;
  if (!stored || !result) return { weekStart: requested, hasPlan: false, days: [] };
  const hidden = !!uc.health.numbersHidden;
  const c = uc.ctx.catalog;
  const photos = await getPhotoMap(stored.plan.meals.map((m) => m.recipeId).filter((x): x is string => !!x));
  const selfDaily = result.summary.daily[uc.self.member.id] ?? [];
  return {
    weekStart: requested,
    hasPlan: true,
    today: requested === uc.weekStart ? dayIndex(uc.today) : -1,
    summary: {
      cost: result.summary.cost,
      eaten: result.summary.consumedValue,
      kept: result.summary.leftoverValue,
      budget: result.summary.budget ?? null,
      avgKcal: hidden ? null : Math.round(selfDaily.reduce((s, d) => s + d.kcal, 0) / Math.max(1, selfDaily.length)),
      targetKcal: hidden ? null : uc.self.targets.kcal,
    },
    days: Array.from({ length: 7 }, (_, day) => ({
      day,
      date: addDays(requested, day),
      kcal: hidden ? null : (selfDaily[day]?.kcal ?? null),
      meals: stored.plan.meals
        .filter((m) => m.day === day)
        .sort((a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal))
        .map((m) => {
          const r = m.recipeId ? c.recipe(m.recipeId) : undefined;
          return {
            meal: m.meal,
            kind: m.kind,
            recipeId: r?.id ?? null,
            name: r?.name.fr ?? m.external?.label ?? null,
            minutes: r?.totalMin ?? null,
            kcal: r && !hidden ? r.nutrition.kcal : null,
            cost: r?.cost ?? null,
            photo: r ? (photos.get(r.id)?.thumb ?? null) : null,
            leftoverOf: m.leftoverOf?.day ?? null,
            cookDouble: stored.plan.meals.some((x) => x.leftoverOf?.day === m.day && x.leftoverOf.meal === m.meal),
            guests: m.guests ?? 0,
          };
        }),
    })),
  };
});
