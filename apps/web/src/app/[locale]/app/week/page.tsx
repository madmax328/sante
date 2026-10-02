import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { MEAL_ORDER } from "@weeko/engine";
import { GenerateWeekButton } from "@/components/app-client";
import { RecipeImage } from "@/components/recipe-image";
import { Badge, Card, EmptyState, Notice, PageHeader, Progress } from "@/components/ui";
import { BudgetControl, MealMenu, ReplaceMeal } from "@/components/week-client";
import { Link } from "@/i18n/navigation";
import { requireContext } from "@/lib/app-user";
import { addDays, dayIndex, isValidDate, weekStartOf } from "@/lib/dates";
import { getPhotoMap } from "@/lib/photos";
import { can, isPremium } from "@/lib/premium";
import { loadWeek } from "@/lib/week-service";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("week") };
}

export default async function WeekPage({ searchParams }: PageProps<"/[locale]/app/week">) {
  const { userId, uc } = await requireContext();
  const sp = await searchParams;
  const requested = typeof sp.week === "string" && isValidDate(sp.week) ? weekStartOf(sp.week) : uc.weekStart;
  const t = await getTranslations("week");
  const e = await getTranslations("enums");
  const format = await getFormatter();
  const { stored, result } = await loadWeek(userId, requested);
  const premium = isPremium(uc.profile);
  const hidden = !!uc.health.numbersHidden;
  const isCurrent = requested === uc.weekStart;
  const todayIdx = isCurrent ? dayIndex(uc.today) : -1;
  const money = (v: number) => format.number(v, { style: "currency", currency: stored?.plan.currency ?? "EUR" });
  const photos = await getPhotoMap((stored?.plan.meals ?? []).map((m) => m.recipeId).filter((x): x is string => !!x));
  const range = `${format.dateTime(new Date(requested + "T12:00:00"), { day: "numeric", month: "long" })} – ${format.dateTime(new Date(addDays(requested, 6) + "T12:00:00"), { day: "numeric", month: "long" })}`;
  const multi = uc.members.length > 1;
  const memberName = new Map(uc.members.map((m) => [m.member.id, m.member.name]));

  const nav = (
    <div className="flex items-center gap-2">
      <Link href={`/app/week?week=${addDays(requested, -7)}`} className="rounded-full border border-line bg-surface p-2 hover:border-basilic" aria-label={t("previous")}>
        <ChevronLeft className="size-4" />
      </Link>
      {!isCurrent && <Link href="/app/week" className="text-sm font-semibold text-basilic">{t("thisWeek")}</Link>}
      <Link href={`/app/week?week=${addDays(requested, 7)}`} className="rounded-full border border-line bg-surface p-2 hover:border-basilic" aria-label={t("next")}>
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );

  if (!stored || !result) {
    return (
      <div className="grid gap-6">
        <PageHeader title={t("title")} subtitle={range} action={nav} />
        <EmptyState title={t("emptyTitle")} action={<GenerateWeekButton label={t("create")} weekStart={requested} />}>
          {t("emptyText")}
        </EmptyState>
      </div>
    );
  }

  const s = result.summary;
  const selfDaily = s.daily[uc.self.member.id] ?? [];
  const avgKcal = Math.round(selfDaily.reduce((a, d) => a + d.kcal, 0) / Math.max(1, selfDaily.length));

  return (
    <div className="grid gap-6">
      <PageHeader title={t("title")} subtitle={range} action={nav} />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted">{t("groceriesCost")}</p>
              <p className="font-display text-3xl font-extrabold num">{money(s.cost)}</p>
              {s.leftoverValue > 0.5 && <p className="text-sm text-muted num">{t("leftoverValue", { value: money(s.leftoverValue) })}</p>}
            </div>
            {!hidden && (
              <div>
                <p className="text-sm font-semibold text-muted">{t("avgPerDay")}</p>
                <p className="font-display text-2xl font-bold num">{format.number(avgKcal)} <span className="text-base text-muted">/ {format.number(uc.self.targets.kcal)} kcal</span></p>
              </div>
            )}
            <GenerateWeekButton label={t("regenerate")} variant="secondary" weekStart={requested} confirmText={t("regenerateConfirm")} />
          </div>
          {s.budget !== undefined && (
            <>
              <Progress value={s.cost} max={s.budget} tone="miel" label={t("budget")} />
              <p className="text-sm text-muted num">{t("budgetLine", { budget: money(s.budget), left: money(Math.max(0, s.budget - s.cost)) })}</p>
            </>
          )}
          {s.notes.some((n) => n.code === "budget_over") && (
            <Notice tone="miel" title={t("budgetOverTitle")}>{t("budgetOverText", { min: money(s.cost) })}</Notice>
          )}
        </Card>
        <Card className="grid content-start gap-3">
          <p className="font-bold">{t("budgetTitle")}</p>
          {can(uc.profile, "budget") ? (
            <BudgetControl enabled={uc.profile.budget.enabled} weekly={uc.profile.budget.weekly} />
          ) : (
            <p className="text-sm text-muted">
              {t("budgetPremium")} <Link href="/app/account" className="font-semibold text-basilic">{t("discover")}</Link>
            </p>
          )}
        </Card>
      </div>

      {!premium && <p className="text-sm text-muted">{t("freeNote")}</p>}

      <div className="grid gap-4">
        {Array.from({ length: 7 }, (_, day) => {
          const meals = stored.plan.meals.filter((m) => m.day === day).sort((a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal));
          const totals = selfDaily[day];
          return (
            <section key={day} id={`day-${day}`} className={`grid gap-3 rounded-3xl border p-4 ${day === todayIdx ? "border-abricot bg-surface" : "border-line bg-surface/60"}`}>
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold">
                  {e(`day.${day}`)}{" "}
                  <span className="font-sans text-sm font-semibold text-muted">{format.dateTime(new Date(addDays(requested, day) + "T12:00:00"), { day: "numeric", month: "short" })}</span>
                  {day === todayIdx && <Badge tone="abricot" className="ml-2">{t("today")}</Badge>}
                </h2>
                {!hidden && totals && <span className="text-sm text-muted num">{format.number(totals.kcal)} kcal · {totals.protein} g prot.</span>}
              </header>
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {meals.map((m) => {
                  const recipe = m.recipeId ? uc.ctx.catalog.recipe(m.recipeId) : undefined;
                  return (
                    <li key={m.meal} className="grid min-w-0 content-start gap-2 rounded-2xl border border-line bg-surface p-3">
                      <div className="flex items-center justify-between gap-1">
                        <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-muted">{e(`meal.${m.meal}`)}</span>
                        <div className="flex shrink-0 items-center">
                          {m.kind === "recipe" && <ReplaceMeal day={day} meal={m.meal} weekStart={requested} hidden={hidden} />}
                          <MealMenu day={day} meal={m.meal} weekStart={requested} />
                        </div>
                      </div>
                      {recipe ? (
                        <Link href={`/app/recipes/${recipe.id}`} className="grid gap-2">
                          <RecipeImage photo={photos.get(recipe.id)} meal={m.meal} thumb className="aspect-[16/9] w-full rounded-xl" sizes="(max-width: 768px) 100vw, 25vw" />
                          <span className="line-clamp-2 font-semibold hover:text-basilic">{recipe.name.fr}</span>
                        </Link>
                      ) : (
                        <p className="font-semibold">{m.kind === "external" ? m.external?.label : t("nothing")}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {m.kind === "leftover" && <Badge tone="miel">{t("leftoverOf", { day: e(`day.${m.leftoverOf?.day ?? 0}`) })}</Badge>}
                        {stored.plan.meals.some((c) => c.leftoverOf?.day === m.day && c.leftoverOf.meal === m.meal) && <Badge tone="basilic">{t("cookDouble")}</Badge>}
                        {m.kind === "external" && <Badge tone="eau">{t("outside")}</Badge>}
                        {m.external?.memberIds && <Badge tone="eau">{t("someOutside")}</Badge>}
                        {m.guests ? <Badge tone="abricot">{t("withGuests", { n: m.guests })}</Badge> : null}
                      </div>
                      {recipe && (
                        <p className="flex flex-wrap gap-x-3 text-xs text-muted num">
                          <span className="inline-flex items-center gap-1"><Clock className="size-3" aria-hidden />{recipe.totalMin} min</span>
                          {!hidden && <span>{recipe.nutrition.kcal} kcal / {t("serving")}</span>}
                          <span>{money(recipe.cost)} / {t("serving")}</span>
                        </p>
                      )}
                      {recipe && multi && (
                        <p className="text-xs text-muted">
                          {m.portions.map((p) => `${memberName.get(p.memberId) ?? ""} ${format.number(p.servings, { maximumFractionDigits: 1 })}`).join(" · ")}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
