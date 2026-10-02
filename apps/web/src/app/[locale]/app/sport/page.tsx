import { Dumbbell, Footprints, Moon, StretchHorizontal, Timer } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { DoneToggle, StepsInput } from "@/components/sport-client";
import { SportSettingsForm } from "@/components/settings-client";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { requireContext } from "@/lib/app-user";
import { dayIndex } from "@/lib/dates";
import { workoutWeekFor } from "@/lib/planning";
import { can } from "@/lib/premium";
import { getWorkoutWeek, saveWorkoutWeek } from "@/lib/repo";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("sport") };
}

const ICONS = { rest: Moon, walk: Footprints, strength: Dumbbell, cardio: Timer, mobility: StretchHorizontal } as const;

export default async function SportPage() {
  const { userId, uc } = await requireContext();
  const t = await getTranslations("sport");
  const e = await getTranslations("enums");
  const format = await getFormatter();
  if (!can(uc.profile, "sport")) {
    return (
      <div className="grid gap-6">
        <PageHeader title={t("title")} />
        <EmptyState title={t("premiumTitle")} action={<LinkButton href="/app/account" variant="accent">{t("discover")}</LinkButton>}>{t("premiumText")}</EmptyState>
      </div>
    );
  }
  let stored = uc.profile.sport.enabled ? await getWorkoutWeek(userId, uc.weekStart) : null;
  if (uc.profile.sport.enabled && !stored) {
    await saveWorkoutWeek(userId, uc.weekStart, workoutWeekFor(uc, uc.weekStart));
    stored = await getWorkoutWeek(userId, uc.weekStart);
  }
  const today = dayIndex(uc.today);
  const totalPlanned = stored?.week.sessions.filter((s) => s.type !== "rest").length ?? 0;
  const done = stored?.done.length ?? 0;

  return (
    <div className="grid gap-6">
      <PageHeader title={t("title")} subtitle={stored ? t("subtitle", { done, total: totalPlanned, week: stored.week.week }) : undefined} />
      {stored ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {stored.week.sessions.map((s) => {
              const Icon = ICONS[s.type];
              const isDone = stored!.done.includes(s.day);
              return (
                <Card key={s.day} className={`grid content-start gap-3 ${s.day === today ? "border-abricot" : ""}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{e(`day.${s.day}`)}</p>
                    {s.day === today && <Badge tone="abricot">{t("today")}</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Icon className={`size-6 ${s.type === "rest" ? "text-muted" : "text-basilic"}`} aria-hidden />
                    <div>
                      <p className="font-semibold">{s.title.fr}</p>
                      {s.type !== "rest" && <p className="text-sm text-muted num">{t("meta", { minutes: s.minutes, kcal: s.kcal })}</p>}
                    </div>
                  </div>
                  {s.type !== "rest" && (
                    <div className="flex flex-wrap gap-2">
                      {s.blocks.length > 0 && <Link href={`/app/sport/${s.day}`} className="inline-flex h-8 items-center rounded-full bg-basilic px-3 text-sm font-semibold text-surface">{t("open")}</Link>}
                      <DoneToggle day={s.day} done={isDone} />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          <Card className="grid gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Footprints className="size-5 text-basilic" />{t("stepsTitle")}</h2>
            <p className="text-sm text-muted">{t("stepsText", { goal: format.number(stored.week.stepsGoal) })}</p>
            <StepsInput date={uc.today} initial={stored.steps?.[uc.today]} />
            <p className="text-xs text-muted">{t("devicesSoon")}</p>
          </Card>
        </>
      ) : (
        <EmptyState title={t("disabledTitle")}>{t("disabledText")}</EmptyState>
      )}
      <Card className="grid gap-3">
        <h2 className="text-lg font-bold">{t("settings")}</h2>
        <SportSettingsForm initial={uc.profile.sport} />
      </Card>
    </div>
  );
}
