"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addProgressPhoto, deleteProgressPhoto, listProgressPhotos, type AddPhotoResult, type ProgressPhoto } from "@/lib/progress-photos";
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

const b64 = z.string().max(1_300_000).regex(/^[A-Za-z0-9+/=]+$/);

export async function addProgressPhotoAction(input: { date: string; full: string; thumb: string; width: number; height: number }): Promise<AddPhotoResult> {
  const userId = await requireUserId();
  const parsed = z
    .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), full: b64, thumb: b64, width: z.number().min(1).max(5000), height: z.number().min(1).max(5000) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const res = await addProgressPhoto(userId, parsed.data);
  revalidatePath("/[locale]/app/progress");
  return res;
}

export async function listProgressPhotosAction(): Promise<ProgressPhoto[]> {
  return listProgressPhotos(await requireUserId());
}

export async function deleteProgressPhotoAction(input: { id: string }): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const id = String(input?.id ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false };
  const ok = await deleteProgressPhoto(userId, id);
  revalidatePath("/[locale]/app/progress");
  return { ok };
}
