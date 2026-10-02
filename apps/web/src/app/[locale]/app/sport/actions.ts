"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { weekStartOf } from "@/lib/dates";
import { loadUserContext, workoutWeekFor } from "@/lib/planning";
import { can } from "@/lib/premium";
import { saveWorkoutWeek, setSteps, setWorkoutDone, updateProfile } from "@/lib/repo";
import { requireUserId } from "@/lib/session";

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
