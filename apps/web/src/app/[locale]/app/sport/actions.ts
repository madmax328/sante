"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dayIndex, todayIn, weekStartOf } from "@/lib/dates";
import { loadUserContext, workoutWeekFor } from "@/lib/planning";
import { can } from "@/lib/premium";
import { getHealth, getMeasurements, getWorkoutWeek, saveHealth, saveMeasurement, saveWorkoutWeek, setSteps, setWorkoutDone, updateProfile } from "@/lib/repo";
import { requireUserId } from "@/lib/session";
import type { Profile } from "@/lib/types";

export async function toggleWorkoutAction(input: { day: number; done: boolean }): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const parsed = z.object({ day: z.number().int().min(0).max(6), done: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false };
  const uc = await loadUserContext(userId);
  if (!uc || !can(uc.profile, "sport")) return { ok: false };
  await setWorkoutDone(userId, uc.weekStart, parsed.data.day, parsed.data.done);
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}

export async function setStepsAction(input: { date: string; steps: number }): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const parsed = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), steps: z.number().int().min(0).max(100000) }).safeParse(input);
  if (!parsed.success) return { ok: false };
  await setSteps(userId, weekStartOf(parsed.data.date), parsed.data.date, parsed.data.steps);
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}

const settings = z.object({
  enabled: z.boolean(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  availableDays: z.array(z.number().int().min(0).max(6)).max(7),
  minutesPerSession: z.number().min(10).max(90),
  equipment: z.array(z.enum(["none", "mat", "dumbbells", "band", "kettlebell", "pullup_bar", "bike", "pool"])),
  limitations: z.array(z.enum(["knees", "back", "shoulders", "wrists"])),
});

export async function saveSportSettingsAction(input: z.input<typeof settings>): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const parsed = settings.safeParse(input);
  if (!parsed.success) return { ok: false };
  const uc = await loadUserContext(userId);
  if (!uc) return { ok: false };
  const sport = { ...uc.profile.sport, ...parsed.data };
  await updateProfile(userId, { sport });
  const next = { ...uc, profile: { ...uc.profile, sport } };
  if (sport.enabled) await saveWorkoutWeek(userId, uc.weekStart, workoutWeekFor(next, uc.weekStart));
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const healthImport = z.object({
  source: z.enum(["apple_health", "health_connect"]),
  steps: z.array(z.object({ date: day, steps: z.number().int().min(0).max(100000) })).max(14),
  weights: z.array(z.object({ date: day, kg: z.number().min(25).max(350) })).max(60),
  workouts: z.array(z.object({ date: day, minutes: z.number().min(0).max(1440) })).max(60),
});

/**
 * Data read by the phone app from Apple Santé / Health Connect: daily steps,
 * weigh-ins and workouts. A workout of 10 minutes or more on a day with a
 * planned session ticks that session.
 */
export async function importHealthAction(input: z.input<typeof healthImport>): Promise<{ ok: boolean; steps?: number; weights?: number; sessions?: number }> {
  const userId = await requireUserId();
  const parsed = healthImport.safeParse(input);
  if (!parsed.success) return { ok: false };
  const uc = await loadUserContext(userId);
  if (!uc) return { ok: false };
  const d = parsed.data;
  const today = todayIn(uc.profile.timeZone);
  const past = <T extends { date: string }>(list: T[]) => list.filter((x) => x.date <= today);

  for (const s of past(d.steps)) await setSteps(userId, weekStartOf(s.date), s.date, s.steps);

  // Weigh-ins: one per day (the last one), keeping a waist measurement taken the same day.
  const byDay = new Map(past(d.weights).map((w) => [w.date, Math.round(w.kg * 10) / 10]));
  const existing = new Map((await getMeasurements(userId, 120)).map((m) => [m.date, m]));
  let weights = 0;
  for (const [date, kg] of byDay) {
    const m = existing.get(date);
    if (m?.kg === kg) continue;
    await saveMeasurement(userId, { ...m, date, kg });
    weights++;
  }
  const latest = [...byDay.keys()].sort().pop();
  if (latest && latest >= ([...existing.keys()].sort().pop() ?? "")) {
    const health = await getHealth(userId);
    if (health) await saveHealth(userId, { ...health, members: health.members.map((m) => (m.self ? { ...m, weightKg: byDay.get(latest)! } : m)) });
  }

  let sessions = 0;
  if (uc.profile.sport.enabled && can(uc.profile, "sport")) {
    const week = await getWorkoutWeek(userId, uc.weekStart);
    for (const w of past(d.workouts)) {
      if (w.minutes < 10 || weekStartOf(w.date) !== uc.weekStart) continue;
      const i = dayIndex(w.date);
      const planned = week?.week.sessions.find((s) => s.day === i && s.type !== "rest");
      if (planned && !week!.done.includes(i)) {
        await setWorkoutDone(userId, uc.weekStart, i, true);
        week!.done.push(i);
        sessions++;
      }
    }
  }

  await updateProfile(userId, { [`devices.${d.source}`]: { lastSync: new Date() } } as Partial<Profile>);
  revalidatePath("/[locale]/app", "layout");
  return { ok: true, steps: past(d.steps).length, weights, sessions };
}
