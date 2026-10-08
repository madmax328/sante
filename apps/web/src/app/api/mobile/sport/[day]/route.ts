import { exercises } from "@weeko/catalog";
import { contextFor, MobileError, mobileRoute } from "@/lib/mobile";
import { can } from "@/lib/premium";
import { getWorkoutWeek } from "@/lib/repo";

export const dynamic = "force-dynamic";

const byId = new Map(exercises.map((x) => [x.id, x]));

/** One session: the guided steps (warm-up, then each round) and how to do each exercise. */
export const GET = mobileRoute(async (req, userId) => {
  const day = Number(new URL(req.url).pathname.split("/").pop());
  if (!Number.isInteger(day) || day < 0 || day > 6) throw new MobileError("not_found", 404);
  const uc = await contextFor(userId);
  if (!can(uc.profile, "sport")) throw new MobileError("premium", 403);
  const stored = await getWorkoutWeek(userId, uc.weekStart);
  const session = stored?.week.sessions.find((s) => s.day === day);
  if (!session || session.type === "rest") throw new MobileError("not_found", 404);

  const steps: { exerciseId: string; name: string; amount: number; unit: "reps" | "seconds"; restSec: number; round: number; rounds: number }[] = [];
  for (const w of session.warmup) {
    const x = byId.get(w.exerciseId);
    if (x) steps.push({ exerciseId: x.id, name: `Échauffement · ${x.name.fr}`, amount: w.amount, unit: "seconds", restSec: 0, round: 1, rounds: 1 });
  }
  for (let r = 1; r <= session.rounds; r++) {
    for (const b of session.blocks) {
      const x = byId.get(b.exerciseId);
      if (x) steps.push({ exerciseId: x.id, name: x.name.fr, amount: b.amount, unit: x.unit, restSec: b.restSec, round: r, rounds: session.rounds });
    }
  }
  const items = [...session.warmup.map((w) => ({ ...w, restSec: 0, warmup: true })), ...session.blocks.map((b) => ({ ...b, warmup: false }))];
  return {
    day,
    title: session.title.fr,
    minutes: session.minutes,
    rounds: session.rounds,
    done: stored!.done.includes(day),
    steps,
    exercises: items.flatMap((b) => {
      const x = byId.get(b.exerciseId);
      if (!x) return [];
      const easier = x.easier ? byId.get(x.easier) : undefined;
      return [
        {
          id: x.id,
          name: x.name.fr,
          warmup: b.warmup,
          amount: b.amount,
          unit: b.warmup ? "seconds" : x.unit,
          restSec: b.restSec,
          steps: x.steps.map((s) => s.fr),
          tips: x.tips.map((s) => s.fr),
          easier: easier?.name.fr ?? null,
        },
      ];
    }),
  };
});
