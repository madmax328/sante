import { ChevronLeft, ChevronRight } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { MEAL_TYPES, type MealType } from "@weeko/engine";
import { WaterTracker } from "@/components/app-client";
import { AddFood, FavoriteEntry, MealTools, RemoveEntry } from "@/components/journal-client";
import { favorites, inputFromLog, keyOf } from "@/lib/journal";
import { Badge, Card, PageHeader, Progress } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { requireContext } from "@/lib/app-user";
import { addDays, isValidDate } from "@/lib/dates";
import { getLog } from "@/lib/repo";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("journal") };
}

function currentMeal(hour: number): MealType {
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 18) return "snack";
  return "dinner";
}

export default async function JournalPage({ searchParams }: PageProps<"/[locale]/app/journal">) {
  const { userId, uc } = await requireContext();
  const sp = await searchParams;
  const date = typeof sp.date === "string" && isValidDate(sp.date) && sp.date <= uc.today ? sp.date : uc.today;
  const t = await getTranslations("journal");
  const e = await getTranslations("enums");
  const format = await getFormatter();
  const [log, fav] = await Promise.all([getLog(userId, date), favorites().findOne({ _id: userId })]);
  const favKeys = new Set((fav?.items ?? []).map((i) => i.key));
  const isFavorite = (x: (typeof log.entries)[number]) => {
    const input = x.kind === "planned" ? null : inputFromLog(x);
    return !!input && favKeys.has(keyOf(input));
  };
  const target = uc.self.targets;
  const hidden = !!uc.health.numbersHidden;
  const totals = log.entries.reduce(
    (s, x) => ({ kcal: s.kcal + x.kcal, protein: s.protein + x.protein, carbs: s.carbs + x.carbs, fat: s.fat + x.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: uc.profile.timeZone }).format(new Date()));

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("title")}
        subtitle={format.dateTime(new Date(date + "T12:00:00"), { weekday: "long", day: "numeric", month: "long" })}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/app/journal?date=${addDays(date, -1)}`} className="rounded-full border border-line bg-surface p-2" aria-label={t("previous")}><ChevronLeft className="size-4" /></Link>
            {date !== uc.today && <Link href="/app/journal" className="text-sm font-semibold text-basilic">{t("today")}</Link>}
            {date < uc.today && <Link href={`/app/journal?date=${addDays(date, 1)}`} className="rounded-full border border-line bg-surface p-2" aria-label={t("next")}><ChevronRight className="size-4" /></Link>}
          </div>
        }
      />

      {!hidden && (
        <Card className="grid gap-4 sm:grid-cols-4">
          {([
            ["kcal", totals.kcal, target.kcal, "kcal", "basilic"],
            ["protein", totals.protein, target.protein, "g", "eau"],
            ["carbs", totals.carbs, target.carbs, "g", "miel"],
            ["fat", totals.fat, target.fat, "g", "abricot"],
          ] as const).map(([k, v, max, unit, tone]) => (
            <div key={k} className="grid gap-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{e(`nutrient.${k}`)}</p>
              <p className="font-display text-xl font-bold num">{format.number(v)} <span className="text-sm text-muted">/ {format.number(max)} {unit}</span></p>
              <Progress value={v} max={max} tone={tone} label={e(`nutrient.${k}`)} />
            </div>
          ))}
        </Card>
      )}

      <Card className="grid gap-3">
        <h2 className="text-lg font-bold">{t("addTitle")}</h2>
        <AddFood date={date} defaultMeal={date === uc.today ? currentMeal(hour) : "dinner"} />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {MEAL_TYPES.map((m) => {
          const entries = log.entries.filter((x) => x.meal === m);
          const sum = entries.reduce((s, x) => s + x.kcal, 0);
          return (
            <Card key={m} className="grid content-start gap-2">
              <div className="flex items-baseline justify-between">
                <h2 className="font-bold">{e(`meal.${m}`)}</h2>
                {!hidden && <span className="text-sm text-muted num">{sum} kcal</span>}
              </div>
              {entries.length === 0 ? (
                <p className="text-sm text-muted">{t("nothing")}</p>
              ) : (
                <ul className="divide-y divide-line/70">
                  {entries.map((x) => (
                    <li key={x.id} className="flex items-center gap-2 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{x.name}</p>
                        <p className="text-xs text-muted num">
                          {x.kind === "planned" && <Badge tone="basilic" className="mr-1">{t("fromPlan")}</Badge>}
                          {x.kind === "ingredient" || x.kind === "barcode" ? `${x.amount} g · ` : x.kind === "recipe" ? `${t("servingsCount", { n: x.amount })} · ` : ""}
                          {!hidden && `${x.kcal} kcal · ${x.protein} g prot.`}
                        </p>
                      </div>
                      {x.kind !== "planned" && <FavoriteEntry date={date} id={x.id} name={x.name} initial={isFavorite(x)} />}
                      <RemoveEntry date={date} id={x.id} />
                    </li>
                  ))}
                </ul>
              )}
              <MealTools date={date} meal={m} yesterday={addDays(date, -1)} hasEntries={entries.length > 0} />
            </Card>
          );
        })}
      </div>

      {date === uc.today && (
        <Card className="grid gap-3">
          <h2 className="font-bold">{t("water")}</h2>
          <WaterTracker initial={log.waterMl} goal={target.waterMl} />
        </Card>
      )}
    </div>
  );
}
