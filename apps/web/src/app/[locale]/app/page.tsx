import { ArrowRight, Clock, Dumbbell, Footprints, Wallet } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { EatenToggle, GenerateWeekButton, QuickAdjust, WaterTracker } from "@/components/app-client";
import { RecipeImage } from "@/components/recipe-image";
import { Badge, Card, EmptyState, LinkButton, Notice, PageHeader, Progress, Ring, SectionTitle } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { requireContext } from "@/lib/app-user";
import { dayIndex } from "@/lib/dates";
import { getPhotoMap } from "@/lib/photos";
import { can, isPremium } from "@/lib/premium";
import { getLog, getWorkoutWeek } from "@/lib/repo";
import { loadWeek } from "@/lib/week-service";
import { MEAL_ORDER } from "@weeko/engine";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("today") };
}

export default async function TodayPage() {
  const { userId, uc } = await requireContext();
  const t = await getTranslations("today");
  const e = await getTranslations("enums");
  const format = await getFormatter();
  const day = dayIndex(uc.today);
  const premium = isPremium(uc.profile);
  const hidden = !!uc.health.numbersHidden;

  const [{ stored, result }, log, workouts] = await Promise.all([
    loadWeek(userId),
    getLog(userId, uc.today),
    uc.profile.sport.enabled && can(uc.profile, "sport") ? getWorkoutWeek(userId, uc.weekStart) : Promise.resolve(null),
  ]);

  const meals = (stored?.plan.meals ?? [])
    .filter((m) => m.day === day)
    .sort((a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal));
  const photos = await getPhotoMap(meals.map((m) => m.recipeId).filter((x): x is string => !!x));
  const selfId = uc.self.member.id;
  const target = uc.self.targets;
  const eatenKcal = log.entries.reduce((s, x) => s + x.kcal, 0);
  const eatenProtein = log.entries.reduce((s, x) => s + x.protein, 0);
  const session = workouts?.week.sessions.find((s) => s.day === day);
  const sessionDone = workouts?.done.includes(day) ?? false;
  const money = (v: number) => format.number(v, { style: "currency", currency: stored?.plan.currency ?? "EUR" });
  const notices = uc.self.safety.notices.filter((n) => n.code !== "kcal_floor");

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("hello", { name: uc.self.member.name })}
        subtitle={format.dateTime(new Date(uc.today + "T12:00:00"), { weekday: "long", day: "numeric", month: "long" })}
      />

      {notices.length > 0 && (
        <Notice tone="miel" title={e(`safety.${notices[0]!.code}.title`)}>
          {e(`safety.${notices[0]!.code}.text`)}
        </Notice>
      )}

      {!stored ? (
        <EmptyState title={t("noPlanTitle")} action={<GenerateWeekButton label={t("createWeek")} />}>
          {t("noPlanText")}
        </EmptyState>
      ) : (
        <>
          <Card className="grid gap-4">
            <SectionTitle action={<Link href="/app/week" className="text-sm font-semibold text-basilic">{t("seeWeek")}</Link>}>
              {t("whatToEat")}
            </SectionTitle>
            <ul className="grid gap-3">
              {meals.map((m) => {
                const recipe = m.recipeId ? uc.ctx.catalog.recipe(m.recipeId) : undefined;
                const servings = m.portions.find((p) => p.memberId === selfId)?.servings ?? 0;
                const k = `${m.day}:${m.meal}`;
                return (
                  <li key={k} className="flex items-center gap-3">
                    <RecipeImage photo={m.recipeId ? photos.get(m.recipeId) : undefined} meal={m.meal} thumb className="size-16 shrink-0 rounded-xl" sizes="64px" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                        {e(`meal.${m.meal}`)}
                        {m.kind === "leftover" && <Badge tone="miel" className="ml-2 normal-case tracking-normal">{t("leftover")}</Badge>}
                      </p>
                      {recipe ? (
                        <Link href={`/app/recipes/${recipe.id}`} className="line-clamp-2 font-semibold hover:text-basilic">{recipe.name.fr}</Link>
                      ) : (
                        <p className="font-semibold">{m.external?.label ?? t("nothingPlanned")}</p>
                      )}
                      {recipe && (
                        <p className="flex flex-wrap gap-x-3 text-sm text-muted num">
                          {!hidden && <span>{Math.round(recipe.nutrition.kcal * servings)} kcal</span>}
                          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden />{recipe.totalMin} min</span>
                          {servings > 0 && servings !== 1 && <span>{t("portion", { n: format.number(servings, { maximumFractionDigits: 1 }) })}</span>}
                        </p>
                      )}
                    </div>
                    {(recipe || m.external) && <EatenToggle day={m.day} meal={m.meal} eaten={stored.eaten?.includes(k) ?? false} />}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="grid gap-3">
            <SectionTitle>{t("adjustTitle")}</SectionTitle>
            <QuickAdjust premium={premium} />
          </Card>
        </>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="grid content-start gap-4">
          <SectionTitle>{t("whatToDo")}</SectionTitle>
          {!uc.profile.sport.enabled ? (
            <p className="text-muted">{t("sportDisabled")}</p>
          ) : !can(uc.profile, "sport") ? (
            <div className="grid gap-3">
              <p className="text-muted">{t("sportPremium")}</p>
              <LinkButton href="/app/account" variant="secondary" size="sm" className="justify-self-start">{t("discoverPremium")}</LinkButton>
            </div>
          ) : session && session.type !== "rest" ? (
            <Link href={`/app/sport/${day}`} className="flex items-center gap-3 rounded-2xl bg-basilic-soft p-4 hover:bg-basilic-soft/70">
              <Dumbbell className="size-6 text-basilic" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{session.title.fr}</p>
                <p className="text-sm text-muted num">{t("sessionMeta", { minutes: session.minutes, kcal: session.kcal })}</p>
              </div>
              {sessionDone ? <Badge tone="basilic">{t("done")}</Badge> : <ArrowRight className="size-5 text-basilic" aria-hidden />}
            </Link>
          ) : (
            <p className="text-muted">{t("restDay")}</p>
          )}
          {workouts && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Footprints className="size-4" aria-hidden /> {t("stepsGoal", { steps: format.number(workouts.week.stepsGoal) })}
            </p>
          )}
        </Card>

        <Card className="grid content-start gap-4">
          <SectionTitle>{t("whereAmI")}</SectionTitle>
          {!hidden ? (
            <div className="flex flex-wrap items-center gap-5">
              <Ring value={eatenKcal} max={target.kcal}>
                <span className="font-display text-xl font-bold num">{format.number(eatenKcal)}</span>
                <span className="text-xs text-muted num">/ {format.number(target.kcal)} kcal</span>
              </Ring>
              <div className="grid min-w-40 flex-1 gap-3">
                <div className="grid gap-1">
                  <div className="flex justify-between text-sm"><span>{e("nutrient.protein")}</span><span className="num text-muted">{eatenProtein} / {target.protein} g</span></div>
                  <Progress value={eatenProtein} max={target.protein} label={e("nutrient.protein")} />
                </div>
                <p className="text-sm text-muted">
                  {eatenKcal === 0 ? t("logHint") : t("remaining", { kcal: format.number(Math.max(0, target.kcal - eatenKcal)) })}{" "}
                  <Link href="/app/journal" className="font-semibold text-basilic">{t("openJournal")}</Link>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted">{t("noNumbers")}</p>
          )}
          <WaterTracker initial={log.waterMl} goal={target.waterMl} />
        </Card>
      </div>

      {result && (
        <Card className="grid gap-3">
          <SectionTitle action={<Link href="/app/groceries" className="text-sm font-semibold text-basilic">{t("seeGroceries")}</Link>}>
            <span className="inline-flex items-center gap-2"><Wallet className="size-5 text-miel" aria-hidden />{t("budgetTitle")}</span>
          </SectionTitle>
          {result.summary.budget ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display text-3xl font-extrabold num">{money(Math.max(0, result.summary.budget - (stored?.actualSpent ?? result.summary.cost)))}</p>
                <p className="text-sm text-muted num">{t("budgetOf", { cost: money(stored?.actualSpent ?? result.summary.cost), budget: money(result.summary.budget) })}</p>
              </div>
              <Progress value={stored?.actualSpent ?? result.summary.cost} max={result.summary.budget} tone="miel" label={t("budgetTitle")} />
              {result.summary.budgetStatus === "over" && <p className="text-sm text-danger">{t("budgetOver")}</p>}
            </>
          ) : (
            <p className="text-muted">
              {t("estimated", { cost: money(result.summary.cost) })}{" "}
              {premium ? (
                <Link href="/app/week" className="font-semibold text-basilic">{t("setBudget")}</Link>
              ) : (
                <Link href="/app/account" className="font-semibold text-basilic">{t("budgetPremium")}</Link>
              )}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
