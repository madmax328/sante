import { MEAL_TYPES, type MealType } from "@weeko/engine";
import { isValidDate } from "@/lib/dates";
import { contextFor, mobileRoute } from "@/lib/mobile";
import { getLog } from "@/lib/repo";

export const dynamic = "force-dynamic";

function currentMeal(hour: number): MealType {
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 18) return "snack";
  return "dinner";
}

/** The food journal of one day (today by default; future days are not allowed). */
export const GET = mobileRoute(async (req, userId) => {
  const uc = await contextFor(userId);
  const asked = new URL(req.url).searchParams.get("date");
  const date = asked && isValidDate(asked) && asked <= uc.today ? asked : uc.today;
  const log = await getLog(userId, date);
  const hidden = !!uc.health.numbersHidden;
  const t = uc.self.targets;
  const totals = log.entries.reduce(
    (s, x) => ({ kcal: s.kcal + x.kcal, protein: s.protein + x.protein, carbs: s.carbs + x.carbs, fat: s.fat + x.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: uc.profile.timeZone }).format(new Date()));
  return {
    date,
    today: uc.today,
    hidden,
    defaultMeal: date === uc.today ? currentMeal(hour) : "dinner",
    totals: hidden ? null : totals,
    targets: hidden ? null : { kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat },
    meals: MEAL_TYPES.map((meal) => ({
      meal,
      entries: log.entries
        .filter((x) => x.meal === meal)
        .map((x) => ({ id: x.id, kind: x.kind, name: x.name, amount: x.amount, kcal: hidden ? null : x.kcal, protein: hidden ? null : x.protein })),
    })),
    water: { ml: log.waterMl ?? 0, target: t.waterMl },
  };
});
