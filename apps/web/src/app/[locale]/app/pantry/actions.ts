"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCatalog } from "@weeko/catalog";
import { can } from "@/lib/premium";
import { getPantry, getProfile, savePantry } from "@/lib/repo";
import { requireUserId } from "@/lib/session";

export async function setPantryItemAction(input: { ingredientId: string; qty: number }): Promise<{ ok: boolean; error?: "premium" | "invalid" }> {
  const userId = await requireUserId();
  const parsed = z.object({ ingredientId: z.string().max(60), qty: z.number().min(0).max(100000) }).safeParse(input);
  if (!parsed.success || !getCatalog().ingredients.has(parsed.data.ingredientId)) return { ok: false, error: "invalid" };
  if (!can(await getProfile(userId), "pantry")) return { ok: false, error: "premium" };
  const items = (await getPantry(userId)).filter((i) => i.ingredientId !== parsed.data.ingredientId);
  if (parsed.data.qty > 0) items.push({ ingredientId: parsed.data.ingredientId, qty: parsed.data.qty });
  await savePantry(userId, items);
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}
