import "server-only";
import { summarize, weeklyReview, type WeeklyReview } from "@weeko/engine";
import { addDays } from "./dates";
import type { UserContext } from "./planning";
import { getLogs, getMeasurements, getPlan, getWorkoutWeek } from "./repo";

export async function reviewFor(uc: UserContext, weekStart: string): Promise<WeeklyReview & { plannedCost?: number }> {
  const [stored, logs, workouts, measurements] = await Promise.all([
    getPlan(uc.userId, weekStart),
    getLogs(uc.userId, weekStart, addDays(weekStart, 6)),
    getWorkoutWeek(uc.userId, weekStart),
    getMeasurements(uc.userId, 120),
  ]);
  const selfId = uc.self.member.id;
  const days = Array.from({ length: 7 }, (_, day) => {
    const date = addDays(weekStart, day);
    const log = logs.find((l) => l.date === date);
    const planned = stored?.plan.meals.filter((m) => m.day === day && (m.kind === "recipe" || m.kind === "leftover") && m.portions.some((p) => p.memberId === selfId)) ?? [];
    return {
      day,
      kcal: log?.entries.reduce((s, x) => s + x.kcal, 0) ?? 0,
      protein: log?.entries.reduce((s, x) => s + x.protein, 0) ?? 0,
      planned: date <= uc.today ? planned.length : 0,
      plannedEaten: planned.filter((m) => stored?.eaten.includes(`${m.day}:${m.meal}`)).length,
      waterMl: log ? log.waterMl : undefined,
    };
  }).filter((d) => addDays(weekStart, d.day) <= uc.today);
  const plannedCost = stored ? summarize(uc.ctx, stored.plan).summary.cost : undefined;
  const review = weeklyReview({
    goal: uc.self.safety.goal,
    targets: uc.self.targets,
    weights: measurements.filter((m) => m.kg !== undefined).map((m) => ({ date: m.date, kg: m.kg! })),
    days,
    sessionsPlanned: workouts?.week.sessions.filter((s) => s.type !== "rest" && addDays(weekStart, s.day) <= uc.today).length ?? 0,
    sessionsDone: workouts?.done.length ?? 0,
    budgetPlanned: stored?.plan.budget ?? plannedCost,
    budgetActual: stored?.actualSpent,
    weekStart,
  });
  return { ...review, plannedCost };
}
