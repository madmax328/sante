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
import { cancelSubscriptionNow, prepareCheckout, refreshSubscription, setCancelAtPeriodEnd, startTrial, type Plan, type PreparedPayment } from "@/lib/stripe";
import { isPremium } from "@/lib/premium";
import { db } from "@/lib/db";
import { cleanDislikes } from "@/lib/dislikes";
import { ALLERGENS } from "@weeko/engine";
import type { MemberHealth } from "@/lib/types";

export async function prepareCheckoutAction(plan: Plan): Promise<{ data?: PreparedPayment; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "auth" };
  if (!features.stripe()) return { error: "not_configured" };
  if (plan !== "monthly" && plan !== "yearly") return { error: "invalid" };
  if (isPremium(await getProfile(session.user.id))) return { error: "already" };
  try {
    return { data: await prepareCheckout(session.user.id, session.user.email, plan) };
  } catch (e) {
    console.error("prepareCheckout failed", e);
    // Stripe's own error code helps diagnose a misconfiguration (prices, payment methods…).
    const code = e && typeof e === "object" && "code" in e && typeof e.code === "string" ? e.code : "error";
    return { error: `server:${code}` };
  }
}

/** After Stripe confirmed the card: activate (paid invoice) or start the trial (saved card). */
export async function completeCheckoutAction(ref: { subscriptionId?: string; setupIntentId?: string }): Promise<{ active: boolean }> {
  const userId = await requireUserId();
  try {
    let active = false;
    if (ref.subscriptionId && /^sub_[A-Za-z0-9]+$/.test(ref.subscriptionId)) active = await refreshSubscription(userId, ref.subscriptionId);
    else if (ref.setupIntentId && /^seti_[A-Za-z0-9]+$/.test(ref.setupIntentId)) active = await startTrial(userId, ref.setupIntentId);
    revalidatePath("/[locale]/app", "layout");
    return { active };
  } catch (e) {
    console.error("completeCheckout failed", e);
    return { active: false };
  }
}

export async function setCancelAction(cancel: boolean): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  if (!features.stripe() || typeof cancel !== "boolean") return { ok: false };
  try {
    const ok = await setCancelAtPeriodEnd(userId, cancel);
    revalidatePath("/[locale]/app", "layout");
    return { ok };
  } catch (e) {
    console.error("setCancelAtPeriodEnd failed", e);
    return { ok: false };
  }
}

const prefsSchema = z.object({
  diet: z.enum(["omnivore", "flexitarian", "pescatarian", "vegetarian", "vegan"]),
  veggies: z.enum(["less", "normal", "more"]),
  avoid: z.array(z.enum(["pork", "beef", "lamb", "alcohol", "seafood", "fish", "dairy", "egg", "gluten"])),
  maxMinutesWeekday: z.number().min(10).max(120),
  maxMinutesWeekend: z.number().min(10).max(180),
  equipment: z.array(z.enum(["oven", "microwave", "blender", "airfryer", "slowcooker"])),
  leftovers: z.boolean(),
  snacks: z.boolean(),
  dislikedIngredients: z.array(z.string().max(40)).max(150),
});

export async function saveFoodPrefsAction(input: z.input<typeof prefsSchema>): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const parsed = prefsSchema.safeParse(input);
  const profile = await getProfile(userId);
  if (!parsed.success || !profile) return { ok: false };
  await updateProfile(userId, { prefs: { ...profile.prefs, ...parsed.data, dislikedIngredients: cleanDislikes(parsed.data.dislikedIngredients) } });
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

const eats = z.object({ breakfast: z.boolean(), lunch: z.boolean(), dinner: z.boolean(), snack: z.boolean() });
const memberSchema = z.object({
  /** Absent for a new person; "self" for the account holder (only meals and allergies change). */
  id: z.string().max(20).optional(),
  name: z.string().trim().min(1).max(40),
  sex: z.enum(["female", "male"]),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heightCm: z.number().min(50).max(250),
  weightKg: z.number().min(10).max(350),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  allergies: z.array(z.enum(ALLERGENS)).max(14),
  eats,
});

export type MemberInput = z.input<typeof memberSchema>;
const MAX_HOUSEHOLD = 9;

/** Adds or updates a person of the household (portions and allergies follow). */
export async function saveMemberAction(input: MemberInput): Promise<{ ok: boolean; error?: "invalid" | "limit" | "future" }> {
  const userId = await requireUserId();
  const parsed = memberSchema.safeParse(input);
  const [profile, health] = await Promise.all([getProfile(userId), getHealth(userId)]);
  if (!parsed.success || !health || !profile) return { ok: false, error: "invalid" };
  const d = parsed.data;
  if (d.birthDate > todayIn(profile.timeZone)) return { ok: false, error: "future" };
  let members: MemberHealth[];
  if (d.id === "self" || health.members.some((m) => m.self && m.id === d.id)) {
    members = health.members.map((m) => (m.self ? { ...m, allergies: d.allergies, eats: d.eats } : m));
  } else if (d.id) {
    if (!health.members.some((m) => m.id === d.id && !m.self)) return { ok: false, error: "invalid" };
    members = health.members.map((m) => (m.id === d.id ? { ...m, ...d, id: m.id, self: false } : m));
  } else {
    if (health.members.length >= MAX_HOUSEHOLD) return { ok: false, error: "limit" };
    members = [...health.members, { ...d, id: `m${Date.now().toString(36)}`, self: false, goal: "maintain" }];
  }
  await saveHealth(userId, { ...health, members });
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}

export async function removeMemberAction(id: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const health = await getHealth(userId);
  if (!health || typeof id !== "string" || !health.members.some((m) => m.id === id && !m.self)) return { ok: false };
  await saveHealth(userId, { ...health, members: health.members.filter((m) => m.id !== id) });
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
