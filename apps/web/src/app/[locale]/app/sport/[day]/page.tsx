import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { exercises } from "@weeko/catalog";
import { GuidedSession, type GuidedStep } from "@/components/sport-client";
import { Card, PageHeader } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { requireContext } from "@/lib/app-user";
import { can } from "@/lib/premium";
import { getWorkoutWeek } from "@/lib/repo";

export default async function SessionPage({ params }: PageProps<"/[locale]/app/sport/[day]">) {
  const { day: dayParam } = await params;
  const day = Number(dayParam);
  if (!Number.isInteger(day) || day < 0 || day > 6) notFound();
  const { userId, uc } = await requireContext();
  if (!can(uc.profile, "sport")) notFound();
  const stored = await getWorkoutWeek(userId, uc.weekStart);
  const session = stored?.week.sessions.find((s) => s.day === day);
  if (!session || session.type === "rest") notFound();
  const t = await getTranslations("sport");
  const byId = new Map(exercises.map((x) => [x.id, x]));
  const steps: GuidedStep[] = [];
  for (const w of session.warmup) {
    const x = byId.get(w.exerciseId);
    if (x) steps.push({ name: `${t("warmup")} · ${x.name.fr}`, amount: w.amount, unit: "seconds", restSec: 0, round: 1, rounds: 1 });
  }
  for (let r = 1; r <= session.rounds; r++) {
    for (const b of session.blocks) {
      const x = byId.get(b.exerciseId);
      if (x) steps.push({ name: x.name.fr, amount: b.amount, unit: x.unit, restSec: b.restSec, round: r, rounds: session.rounds });
    }
  }

  return (
    <div className="grid gap-6">
      <Link href="/app/sport" className="text-sm font-semibold text-muted hover:text-encre">← {t("back")}</Link>
      <PageHeader title={session.title.fr} subtitle={t("sessionSubtitle", { minutes: session.minutes, rounds: session.rounds })} />
      <GuidedSession steps={steps} day={day} />
      <p className="text-sm text-muted">{t("safety")}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {[...session.warmup, ...session.blocks].map((b, i) => {
          const x = byId.get(b.exerciseId);
          if (!x) return null;
          const easier = x.easier ? byId.get(x.easier) : undefined;
          return (
            <Card key={`${b.exerciseId}-${i}`} className="grid content-start gap-3">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold">{x.name.fr}</h2>
                <span className="text-sm font-semibold text-basilic num">
                  {x.unit === "seconds" ? `${b.amount} s` : t("reps", { n: b.amount })}{b.restSec ? ` · ${t("restShort", { s: b.restSec })}` : ""}
                </span>
              </div>
              <ol className="grid list-decimal gap-1 pl-5 text-sm">
                {x.steps.map((s, k) => <li key={k}>{s.fr}</li>)}
              </ol>
              {x.tips.length > 0 && <p className="rounded-xl bg-riz p-3 text-sm"><strong>{t("tip")} :</strong> {x.tips.map((s) => s.fr).join(" ")}</p>}
              {easier && <p className="text-sm text-muted">{t("easier", { name: easier.name.fr })}</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
