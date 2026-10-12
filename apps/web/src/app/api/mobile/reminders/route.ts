import { addDays, dayIndex, weekStartOf } from "@/lib/dates";
import { localeFromHeader } from "@/lib/locale";
import { contextFor, mobileRoute } from "@/lib/mobile";
import { can } from "@/lib/premium";
import { getLog, getPlan, getWorkoutWeek } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * What the app needs to schedule its reminders (local notifications) for
 * the next 7 days: planned workouts, what is already logged today, water.
 */
export const GET = mobileRoute(async (req, userId) => {
  const uc = await contextFor(userId);
  const loc = localeFromHeader(req.headers.get("accept-language"));
  const nextWeek = addDays(uc.weekStart, 7);
  const sport = uc.profile.sport.enabled && can(uc.profile, "sport");
  const [log, plan, nextPlan, thisWorkouts, nextWorkouts] = await Promise.all([
    getLog(userId, uc.today),
    getPlan(userId, uc.weekStart),
    getPlan(userId, nextWeek),
    sport ? getWorkoutWeek(userId, uc.weekStart) : null,
    sport ? getWorkoutWeek(userId, nextWeek) : null,
  ]);
  const day = dayIndex(uc.today);
  const logged = new Set<string>(log.entries.map((e) => e.meal));
  for (const k of plan?.eaten ?? []) if (k.startsWith(`${day}:`)) logged.add(k.slice(2));

  const workouts: { date: string; title: string; minutes: number; done: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(uc.today, i);
    const w = weekStartOf(date) === uc.weekStart ? thisWorkouts : nextWorkouts;
    const s = w?.week.sessions.find((x) => x.day === dayIndex(date) && x.type !== "rest");
    if (s) workouts.push({ date, title: s.title[loc] ?? s.title.fr, minutes: s.minutes, done: w!.done.includes(s.day) });
  }
  return {
    today: uc.today,
    timeZone: uc.profile.timeZone,
    name: uc.self.member.name,
    loggedToday: [...logged],
    water: { ml: log.waterMl ?? 0, target: uc.self.targets.waterMl },
    workouts,
    /** Sunday reminder: the weekly review, and the next week to prepare if it does not exist yet. */
    nextWeekReady: !!nextPlan,
  };
});
