import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { GenerateWeekButton } from "@/components/app-client";
import { DeleteMeasurement, MeasurementForm } from "@/components/progress-client";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { WeightChart } from "@/components/weight-chart";
import { requireContext } from "@/lib/app-user";
import { addDays } from "@/lib/dates";
import { can } from "@/lib/premium";
import { getMeasurements, getPlan } from "@/lib/repo";
import { reviewFor } from "@/lib/review-service";
import type { WeeklyReview } from "@weeko/engine";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("progress") };
}

export default async function ProgressPage() {
  const { userId, uc } = await requireContext();
  const t = await getTranslations("progress");
  const r = await getTranslations("review");
  const format = await getFormatter();
  const hidden = !!uc.health.numbersHidden;
  const measurements = await getMeasurements(userId);
  const weights = measurements.filter((m) => m.kg !== undefined).map((m) => ({ date: m.date, kg: m.kg! }));
  const premium = can(uc.profile, "weekly_review");
  const lastWeek = addDays(uc.weekStart, -7);
  const [review, current, nextPlan] = premium
    ? await Promise.all([reviewFor(uc, lastWeek), reviewFor(uc, uc.weekStart), getPlan(userId, addDays(uc.weekStart, 7))])
    : [null, null, null];

  return (
    <div className="grid gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {!hidden && (
        <Card className="grid gap-4">
          <h2 className="text-lg font-bold">{t("weightTitle")}</h2>
          {weights.length >= 2 ? (
            <WeightChart entries={weights} goal={uc.self.member.targetWeightKg} labels={{ trend: t("chartLabel"), goal: t("goal"), weighIn: t("weighIn") }} locale={await getLocale()} />
          ) : (
            <p className="text-muted">{t("needTwo")}</p>
          )}
          <p className="text-xs text-muted">{t("trendNote")}</p>
          <MeasurementForm today={uc.today} />
        </Card>
      )}

      {premium && review && current ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReviewCard title={r("lastWeek")} data={review} hidden={hidden} />
            <ReviewCard title={r("thisWeek")} data={current} recs={false} hidden={hidden} />
          </div>
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">{r("nextTitle")}</h2>
              <p className="text-sm text-muted">{r("nextText")}</p>
            </div>
            {nextPlan ? (
              <LinkButton href={`/app/week?week=${addDays(uc.weekStart, 7)}`} variant="secondary">{r("seeNext")}</LinkButton>
            ) : (
              <GenerateWeekButton label={r("createNext")} weekStart={addDays(uc.weekStart, 7)} />
            )}
          </Card>
        </>
      ) : (
        <EmptyState title={r("premiumTitle")} action={<LinkButton href="/app/account" variant="accent">{r("discover")}</LinkButton>}>{r("premiumText")}</EmptyState>
      )}

      {!hidden && measurements.length > 0 && (
        <Card className="grid gap-2">
          <h2 className="text-lg font-bold">{t("history")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-80 text-sm num">
              <thead>
                <tr className="text-left text-muted"><th className="py-2 font-semibold">{t("date")}</th><th className="py-2 font-semibold">{t("weight")}</th><th className="py-2 font-semibold">{t("waist")}</th><th /></tr>
              </thead>
              <tbody>
                {[...measurements].reverse().slice(0, 30).map((m) => (
                  <tr key={m.date} className="border-t border-line/70">
                    <td className="py-2">{format.dateTime(new Date(m.date + "T12:00:00"), { dateStyle: "medium" })}</td>
                    <td className="py-2">{m.kg !== undefined ? `${format.number(m.kg)} kg` : "—"}</td>
                    <td className="py-2">{m.waistCm !== undefined ? `${format.number(m.waistCm)} cm` : "—"}</td>
                    <td className="py-2 text-right"><DeleteMeasurement date={m.date} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

async function ReviewCard({ title, data, recs = true, hidden }: { title: string; data: WeeklyReview; recs?: boolean; hidden: boolean }) {
  const r = await getTranslations("review");
  const format = await getFormatter();
  const money = (v: number) => format.number(v, { style: "currency", currency: "EUR" });
  return (
    <Card className="grid content-start gap-4">
      <h2 className="text-lg font-bold">{title}</h2>
      <dl className="grid grid-cols-2 gap-3">
        {!hidden && data.trendChangeKg !== undefined && (
          <div className="rounded-2xl bg-surface-2 p-3"><dt className="text-xs text-muted">{r("weightTrend")}</dt><dd className="font-display text-xl font-bold num">{data.trendChangeKg > 0 ? "+" : ""}{format.number(data.trendChangeKg, { maximumFractionDigits: 2 })} kg</dd></div>
        )}
        {data.adherence !== undefined && (
          <div className="rounded-2xl bg-surface-2 p-3"><dt className="text-xs text-muted">{r("adherence")}</dt><dd className="font-display text-xl font-bold num">{Math.round(data.adherence * 100)} %</dd></div>
        )}
        <div className="rounded-2xl bg-surface-2 p-3"><dt className="text-xs text-muted">{r("sessions")}</dt><dd className="font-display text-xl font-bold num">{data.sessionsDone} / {data.sessionsPlanned}</dd></div>
        {data.budgetPlanned !== undefined && (
          <div className="rounded-2xl bg-surface-2 p-3"><dt className="text-xs text-muted">{r("budget")}</dt><dd className="font-display text-xl font-bold num">{data.budgetActual !== undefined ? money(data.budgetActual) : "—"} <span className="text-sm text-muted">/ {money(data.budgetPlanned)}</span></dd></div>
        )}
        {!hidden && data.avgKcal !== undefined && (
          <div className="rounded-2xl bg-surface-2 p-3"><dt className="text-xs text-muted">{r("avgKcal")}</dt><dd className="font-display text-xl font-bold num">{format.number(data.avgKcal)} kcal</dd></div>
        )}
        <div className="rounded-2xl bg-surface-2 p-3"><dt className="text-xs text-muted">{r("daysLogged")}</dt><dd className="font-display text-xl font-bold num">{data.daysLogged} / 7</dd></div>
      </dl>
      {recs && <ul className="grid gap-2">
        {data.recommendations.map((rec) => (
          <li key={rec.code} className="rounded-2xl bg-basilic-soft p-3 text-sm">
            <strong>{r(`recs.${rec.code}.title`)}</strong> — {r(`recs.${rec.code}.text`, { value: Math.abs(rec.value ?? 0) })}
          </li>
        ))}
      </ul>}
    </Card>
  );
}
