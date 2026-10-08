import { getTranslations } from "next-intl/server";
import type { WeeklyReview } from "@weeko/engine";
import { addDays } from "@/lib/dates";
import { contextFor, mobileRoute } from "@/lib/mobile";
import { can } from "@/lib/premium";
import { getMeasurements, getPlan } from "@/lib/repo";
import { reviewFor } from "@/lib/review-service";

export const dynamic = "force-dynamic";

/** Weight curve, measurement history and the weekly review (Premium). */
export const GET = mobileRoute(async (_req, userId) => {
  const uc = await contextFor(userId);
  const hidden = !!uc.health.numbersHidden;
  const premium = can(uc.profile, "weekly_review");
  const nextWeek = addDays(uc.weekStart, 7);
  const [measurements, last, current, nextPlan] = await Promise.all([
    hidden ? Promise.resolve([]) : getMeasurements(userId),
    premium ? reviewFor(uc, addDays(uc.weekStart, -7)) : Promise.resolve(null),
    premium ? reviewFor(uc, uc.weekStart) : Promise.resolve(null),
    premium ? getPlan(userId, nextWeek) : Promise.resolve(null),
  ]);
  const t = await getTranslations({ locale: "fr", namespace: "review" });
  const review = (r: WeeklyReview | null, recs: boolean) =>
    r && {
      trendChangeKg: hidden ? null : (r.trendChangeKg ?? null),
      adherence: r.adherence ?? null,
      sessionsDone: r.sessionsDone,
      sessionsPlanned: r.sessionsPlanned,
      budgetPlanned: r.budgetPlanned ?? null,
      budgetActual: r.budgetActual ?? null,
      avgKcal: hidden ? null : (r.avgKcal ?? null),
      daysLogged: r.daysLogged,
      recommendations: recs
        ? r.recommendations.map((rec) => ({ code: rec.code, title: t(`recs.${rec.code}.title`), text: t(`recs.${rec.code}.text`, { value: Math.abs(rec.value ?? 0) }) }))
        : [],
    };
  return {
    today: uc.today,
    hidden,
    premium,
    goalKg: hidden ? null : (uc.self.member.targetWeightKg ?? null),
    measurements: measurements.map((m) => ({ date: m.date, kg: m.kg ?? null, waistCm: m.waistCm ?? null })),
    lastWeek: review(last, true),
    thisWeek: review(current, false),
    next: premium ? { weekStart: nextWeek, ready: !!nextPlan } : null,
  };
});
