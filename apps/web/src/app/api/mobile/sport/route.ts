import { dayIndex } from "@/lib/dates";
import { contextFor, mobileRoute } from "@/lib/mobile";
import { workoutWeekFor } from "@/lib/planning";
import { can } from "@/lib/premium";
import { getWorkoutWeek, saveWorkoutWeek } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** This week's workout programme, the steps of the day and the sport settings. */
export const GET = mobileRoute(async (_req, userId) => {
  const uc = await contextFor(userId);
  const settings = uc.profile.sport;
  if (!can(uc.profile, "sport")) return { allowed: false, settings, week: null };
  let stored = settings.enabled ? await getWorkoutWeek(userId, uc.weekStart) : null;
  if (settings.enabled && !stored) {
    await saveWorkoutWeek(userId, uc.weekStart, workoutWeekFor(uc, uc.weekStart));
    stored = await getWorkoutWeek(userId, uc.weekStart);
  }
  return {
    allowed: true,
    settings,
    today: dayIndex(uc.today),
    date: uc.today,
    week: stored
      ? {
          number: stored.week.week,
          stepsGoal: stored.week.stepsGoal,
          steps: stored.steps?.[uc.today] ?? null,
          sessions: stored.week.sessions.map((s) => ({
            day: s.day,
            type: s.type,
            title: s.title.fr,
            minutes: s.minutes,
            kcal: s.kcal,
            guided: s.blocks.length > 0,
            done: stored!.done.includes(s.day),
          })),
        }
      : null,
  };
});
