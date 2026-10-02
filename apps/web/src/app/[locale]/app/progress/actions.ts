"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteMeasurement, getHealth, saveHealth, saveMeasurement } from "@/lib/repo";
import { requireUserId } from "@/lib/session";

export async function addMeasurementAction(input: { date: string; kg?: number; waistCm?: number }): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const parsed = z
    .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), kg: z.number().min(25).max(350).optional(), waistCm: z.number().min(40).max(250).optional() })
    .safeParse(input);
  if (!parsed.success || (parsed.data.kg === undefined && parsed.data.waistCm === undefined)) return { ok: false };
  await saveMeasurement(userId, parsed.data);
  // The latest weight also updates the profile so targets follow.
  if (parsed.data.kg !== undefined) {
    const health = await getHealth(userId);
    if (health) await saveHealth(userId, { ...health, members: health.members.map((m) => (m.self ? { ...m, weightKg: parsed.data.kg! } : m)) });
  }
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}

export async function deleteMeasurementAction(date: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false };
  await deleteMeasurement(userId, date);
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}
