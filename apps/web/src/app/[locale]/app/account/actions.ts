"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { todayIn } from "@/lib/dates";
import { features } from "@/lib/env";
import { deleteAllData, getHealth, getProfile, saveHealth, saveMeasurement, updateProfile } from "@/lib/repo";
import { getSession, requireUserId } from "@/lib/session";
import { cancelSubscriptionNow, createCheckout, createPortal } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function checkoutAction(plan: "monthly" | "yearly"): Promise<{ url?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "auth" };
  if (!features.stripe()) return { error: "not_configured" };
  if (plan !== "monthly" && plan !== "yearly") return { error: "invalid" };
  try {
    return { url: await createCheckout(session.user.id, session.user.email, plan, await getLocale()) };
  } catch (e) {
    console.error(e);
    return { error: "server" };
  }
}

export async function portalAction(): Promise<{ url?: string; error?: string }> {
  const userId = await requireUserId();
  if (!features.stripe()) return { error: "not_configured" };
  const url = await createPortal(userId, await getLocale());
  return url ? { url } : { error: "no_customer" };
}

const prefsSchema = z.object({
  diet: z.enum(["omnivore", "pescatarian", "vegetarian", "vegan"]),
  avoid: z.array(z.enum(["pork", "beef", "lamb", "alcohol", "seafood", "fish", "dairy", "egg", "gluten"])),
  maxMinutesWeekday: z.number().min(10).max(120),
  maxMinutesWeekend: z.number().min(10).max(180),
  equipment: z.array(z.enum(["oven", "microwave", "blender", "airfryer", "slowcooker"])),
  leftovers: z.boolean(),
  snacks: z.boolean(),
});

export async function saveFoodPrefsAction(input: z.input<typeof prefsSchema>): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const parsed = prefsSchema.safeParse(input);
  const profile = await getProfile(userId);
  if (!parsed.success || !profile) return { ok: false };
  await updateProfile(userId, { prefs: { ...profile.prefs, ...parsed.data } });
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}

const bodySchema = z.object({
  weightKg: z.number().min(25).max(350),
  heightCm: z.number().min(100).max(250),
  goal: z.enum(["lose_weight", "maintain", "gain_muscle", "eat_better", "save_money", "family_meals"]),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  targetWeightKg: z.number().min(25).max(350).optional(),
  pace: z.enum(["gentle", "moderate"]),
});

export async function saveBodyAction(input: z.input<typeof bodySchema>): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const parsed = bodySchema.safeParse(input);
  const [profile, health] = await Promise.all([getProfile(userId), getHealth(userId)]);
  if (!parsed.success || !health || !profile) return { ok: false };
  const d = parsed.data;
  const weekly = d.goal === "lose_weight" ? -Math.round(d.weightKg * (d.pace === "gentle" ? 0.004 : 0.0075) * 100) / 100 : d.goal === "gain_muscle" ? (d.pace === "gentle" ? 0.15 : 0.25) : undefined;
  const members = health.members.map((m) =>
    m.self ? { ...m, weightKg: d.weightKg, heightCm: d.heightCm, goal: d.goal, activity: d.activity, targetWeightKg: d.targetWeightKg, weeklyChangeKg: weekly } : m,
  );
  await saveHealth(userId, { ...health, members });
  await saveMeasurement(userId, { date: todayIn(profile.timeZone), kg: d.weightKg });
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}

/** Withdrawing consent deletes health data; the user goes back to onboarding. */
export async function withdrawHealthConsentAction(): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  await Promise.all([
    db.collection("health_profiles").deleteOne({ _id: userId as never }),
    db.collection("measurements").deleteMany({ userId }),
  ]);
  const profile = await getProfile(userId);
  await updateProfile(userId, { onboarded: false, consents: { ...profile?.consents, health: undefined } });
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}

export async function deleteAccountAction(confirm: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  if (!["SUPPRIMER", "DELETE"].includes(confirm.trim().toUpperCase())) return { ok: false };
  await cancelSubscriptionNow(userId);
  await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
  await deleteAllData(userId);
  // Leave the app area right away: re-rendering it would recreate a profile.
  const locale = await getLocale();
  redirect(locale === "fr" ? "/" : `/${locale}`);
}
