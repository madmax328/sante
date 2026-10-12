"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCatalog } from "@weeko/catalog";
import { MEAL_TYPES } from "@weeko/engine";
import { addDays, todayIn } from "@/lib/dates";
import { addLogEntry, getLog, getLogs, getProfile, removeLogEntry } from "@/lib/repo";
import { takeAiMessage } from "@/lib/ai-quota";
import { features } from "@/lib/env";
import { requestLocale, tr } from "@/lib/locale";
import { analyzeMealPhoto, isPhotoMedia, type PhotoFood, type PhotoResult } from "@/lib/meal-photo";
import { can } from "@/lib/premium";
import { requireUserId } from "@/lib/session";
import { buildLogEntry, entryInput, favorites, inputFromLog, keyOf, quickFood, savedMeals, type EntryInput, type QuickFood } from "@/lib/journal";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const meal = z.enum(MEAL_TYPES);

export interface FoodHit {
  kind: "recipe" | "ingredient";
  id: string;
  name: string;
  /** kcal per 100 g for ingredients, per serving for recipes */
  kcal: number;
  unit: "g" | "ml" | "pc" | "serving";
  pieceWeight?: number;
}

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export async function searchFoodsAction(query: string): Promise<FoodHit[]> {
  await requireUserId();
  const q = norm(query.trim()).slice(0, 60);
  if (q.length < 2) return [];
  const words = q.split(/\s+/);
  const catalog = getCatalog();
  const loc = await requestLocale();
  // French, English and the person's language are searched; results are shown in their language.
  const hay = (t: { fr: string; en?: string } & Partial<Record<string, string>>) => norm(`${t.fr} ${t.en ?? ""} ${loc === "fr" || loc === "en" ? "" : (t[loc] ?? "")}`);
  const ingredients: FoodHit[] = [...catalog.ingredients.values()]
    .filter((i) => words.every((w) => hay(i.name).includes(w)))
    .slice(0, 12)
    .map((i) => ({ kind: "ingredient", id: i.id, name: tr(i.name, loc), kcal: i.nutrition.kcal, unit: i.unit, pieceWeight: i.pieceWeight }));
  const recipes: FoodHit[] = catalog
    .allRecipes()
    .filter((r) => words.every((w) => hay(r.name).includes(w)))
    .slice(0, 12)
    .map((r) => ({ kind: "recipe", id: r.id, name: tr(r.name, loc), kcal: r.nutrition.kcal, unit: "serving" }));
  return [...ingredients, ...recipes];
}

export async function addFoodAction(input: { date?: string; meal: (typeof MEAL_TYPES)[number]; entry: EntryInput }): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const parsed = z.object({ date: date.optional(), meal, entry: entryInput }).safeParse(input);
  if (!parsed.success) return { ok: false };
  const profile = await getProfile(userId);
  const day = parsed.data.date ?? todayIn(profile?.timeZone);
  const entry = buildLogEntry(parsed.data.entry, parsed.data.meal);
  if (!entry) return { ok: false };
  await addLogEntry(userId, day, entry);
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}

/** About 1.5 MB of base64: a 1280 px JPEG weighs far less. */
const MAX_PHOTO = 2_000_000;

/** Meal photo → foods and estimated weights to check (Premium, counts as one AI message). */
export async function analyzeMealPhotoAction(input: { image: string; mediaType: string }): Promise<PhotoResult | { ok: false; error: "premium" | "quota" | "invalid" | "unavailable" }> {
  const userId = await requireUserId();
  const image = typeof input?.image === "string" ? input.image.replace(/^data:[^,]*,/, "") : "";
  const mediaType = String(input?.mediaType ?? "");
  if (!image || image.length > MAX_PHOTO || !isPhotoMedia(mediaType) || !/^[A-Za-z0-9+/=]+$/.test(image)) return { ok: false, error: "invalid" };
  const profile = await getProfile(userId);
  if (!profile || !can(profile, "meal_photo")) return { ok: false, error: "premium" };
  if (!features.ai()) return { ok: false, error: "unavailable" };
  if (!(await takeAiMessage(profile))) return { ok: false, error: "quota" };
  return analyzeMealPhoto(image, mediaType, await requestLocale());
}

const photoFood = z.object({
  name: z.string().trim().min(1).max(80),
  grams: z.number().min(1).max(2000),
  ingredientId: z.string().max(60).nullable(),
  per100: z.object({ kcal: z.number().min(0).max(900), protein: z.number().min(0).max(100), carbs: z.number().min(0).max(100), fat: z.number().min(0).max(100) }),
});

/** The journal entry for a checked photo food: the catalog's when known, otherwise the estimate. */
function photoEntry(f: Omit<PhotoFood, "confidence">): EntryInput {
  const catalog = getCatalog();
  if (f.ingredientId && catalog.ingredients.has(f.ingredientId)) {
    const i = catalog.ingredient(f.ingredientId);
    if (i.unit !== "pc") return { kind: "ingredient", id: i.id, amount: Math.round(f.grams) };
    if (i.pieceWeight) return { kind: "ingredient", id: i.id, amount: Math.max(0.5, Math.round((f.grams / i.pieceWeight) * 2) / 2) };
  }
  const k = f.grams / 100;
  return { kind: "custom", name: `${f.name} (${Math.round(f.grams)} g)`.slice(0, 80), kcal: Math.min(5000, f.per100.kcal * k), protein: Math.min(300, f.per100.protein * k), carbs: Math.min(600, f.per100.carbs * k), fat: Math.min(300, f.per100.fat * k) };
}

export async function addPhotoFoodsAction(input: { date?: string; meal: (typeof MEAL_TYPES)[number]; foods: Omit<PhotoFood, "confidence">[] }): Promise<{ ok: boolean; added?: number }> {
  const userId = await requireUserId();
  const parsed = z.object({ date: date.optional(), meal, foods: z.array(photoFood).min(1).max(12) }).safeParse(input);
  if (!parsed.success) return { ok: false };
  const profile = await getProfile(userId);
  const day = parsed.data.date ?? todayIn(profile?.timeZone);
  let added = 0;
  for (const f of parsed.data.foods) {
    const entry = buildLogEntry(photoEntry(f), parsed.data.meal);
    if (!entry) continue;
    await addLogEntry(userId, day, entry);
    added++;
  }
  revalidatePath("/[locale]/app", "layout");
  return { ok: added > 0, added };
}

export async function removeFoodAction(input: { date: string; id: string }): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const parsed = z.object({ date, id: z.string().max(60) }).safeParse(input);
  if (!parsed.success) return { ok: false };
  await removeLogEntry(userId, parsed.data.date, parsed.data.id);
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}

export interface BarcodeProduct {
  code: string;
  name: string;
  brand?: string;
  per100: { kcal: number; protein: number; carbs: number; fat: number };
  nutriscore?: string;
}

/** Product lookup on Open Food Facts (open database, no key needed). */
export async function lookupBarcodeAction(code: string): Promise<BarcodeProduct | null> {
  await requireUserId();
  if (!/^\d{8,14}$/.test(code)) return null;
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_fr,brands,nutriments,nutriscore_grade`, {
      headers: { "User-Agent": "Sorloo/1.0 (contact: contact@sorloo.com)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status: number;
      product?: { product_name?: string; product_name_fr?: string; brands?: string; nutriscore_grade?: string; nutriments?: Record<string, number> };
    };
    if (json.status !== 1 || !json.product) return null;
    const n = json.product.nutriments ?? {};
    const kcal = n["energy-kcal_100g"] ?? (n["energy_100g"] ? n["energy_100g"] / 4.184 : undefined);
    if (kcal === undefined) return null;
    return {
      code,
      name: json.product.product_name_fr || json.product.product_name || code,
      brand: json.product.brands?.split(",")[0],
      per100: { kcal: Math.round(kcal), protein: n["proteins_100g"] ?? 0, carbs: n["carbohydrates_100g"] ?? 0, fat: n["fat_100g"] ?? 0 },
      nutriscore: json.product.nutriscore_grade,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- Favorites, recent foods, saved meals

export interface QuickFoods {
  favorites: QuickFood[];
  recents: QuickFood[];
  meals: { id: string; name: string; kcal: number; count: number; names: string[] }[];
}

/** Everything that can be added in one tap: favorites, foods of the last 3 weeks, saved meals. */
export async function quickFoodsAction(): Promise<QuickFoods> {
  const loc = await requestLocale();
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  const today = todayIn(profile?.timeZone);
  const [fav, logs, meals] = await Promise.all([
    favorites().findOne({ _id: userId }),
    getLogs(userId, addDays(today, -21), today),
    savedMeals().find({ userId }).sort({ at: -1 }).limit(30).toArray(),
  ]);
  const favs = (fav?.items ?? []).map((i) => quickFood(i.entry, true, loc)).filter((x): x is QuickFood => !!x);
  const favKeys = new Set(favs.map((f) => f.key));
  const seen = new Set<string>();
  const recents: QuickFood[] = [];
  for (const log of [...logs].reverse()) {
    for (const x of [...log.entries].reverse()) {
      if (x.kind === "planned") continue;
      const input = inputFromLog(x);
      if (!input) continue;
      const key = keyOf(input);
      if (seen.has(key) || favKeys.has(key)) continue;
      seen.add(key);
      const q = quickFood(input, false, loc);
      if (q) recents.push(q);
      if (recents.length >= 20) break;
    }
    if (recents.length >= 20) break;
  }
  return {
    favorites: favs,
    recents,
    meals: meals.map((m) => ({ id: m._id, name: m.name, kcal: m.kcal, count: m.entries.length, names: m.entries.map((e) => quickFood(e, false, loc)?.name ?? "").filter(Boolean).slice(0, 4) })),
  };
}

/** Adds or removes a food from the favorites (from a quick list, or from a journal line). */
export async function toggleFavoriteAction(input: { entry?: EntryInput; date?: string; id?: string }): Promise<{ ok: boolean; favorite?: boolean }> {
  const userId = await requireUserId();
  let entry: EntryInput | null = null;
  if (input?.entry) {
    const parsed = entryInput.safeParse(input.entry);
    if (parsed.success) entry = parsed.data;
  } else if (input?.date && input.id && date.safeParse(input.date).success) {
    const x = (await getLog(userId, input.date)).entries.find((e) => e.id === input.id);
    entry = x ? inputFromLog(x) : null;
  }
  if (!entry || !buildLogEntry(entry, "lunch")) return { ok: false };
  const key = keyOf(entry);
  const current = (await favorites().findOne({ _id: userId }))?.items ?? [];
  const exists = current.some((i) => i.key === key);
  const items = exists ? current.filter((i) => i.key !== key) : [{ key, entry, at: new Date() }, ...current].slice(0, 100);
  await favorites().updateOne({ _id: userId }, { $set: { items } }, { upsert: true });
  return { ok: true, favorite: !exists };
}

/** Saves the foods of one meal of one day under a name ("Mon petit-déjeuner"). */
export async function saveMealAction(input: { date: string; meal: (typeof MEAL_TYPES)[number]; name: string }): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const parsed = z.object({ date, meal, name: z.string().trim().min(1).max(60) }).safeParse(input);
  if (!parsed.success) return { ok: false };
  const lines = (await getLog(userId, parsed.data.date)).entries.filter((e) => e.meal === parsed.data.meal);
  const entries = lines.map(inputFromLog).filter((e): e is EntryInput => !!e).slice(0, 30);
  if (!entries.length) return { ok: false };
  if ((await savedMeals().countDocuments({ userId })) >= 50) return { ok: false };
  await savedMeals().insertOne({ _id: crypto.randomUUID(), userId, name: parsed.data.name, entries, kcal: lines.reduce((s, e) => s + e.kcal, 0), at: new Date() });
  return { ok: true };
}

export async function deleteSavedMealAction(input: { id: string }): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  if (typeof input?.id !== "string") return { ok: false };
  await savedMeals().deleteOne({ _id: input.id, userId });
  return { ok: true };
}

async function addAll(userId: string, day: string, mealType: (typeof MEAL_TYPES)[number], entries: EntryInput[]): Promise<number> {
  let n = 0;
  for (const e of entries) {
    const line = buildLogEntry(e, mealType);
    if (!line) continue;
    await addLogEntry(userId, day, line);
    n++;
  }
  revalidatePath("/[locale]/app", "layout");
  return n;
}

/** Adds a saved meal to a meal of the day. */
export async function addSavedMealAction(input: { id: string; date: string; meal: (typeof MEAL_TYPES)[number] }): Promise<{ ok: boolean; added?: number }> {
  const userId = await requireUserId();
  const parsed = z.object({ id: z.string().max(60), date, meal }).safeParse(input);
  if (!parsed.success) return { ok: false };
  const saved = await savedMeals().findOne({ _id: parsed.data.id, userId });
  if (!saved) return { ok: false };
  return { ok: true, added: await addAll(userId, parsed.data.date, parsed.data.meal, saved.entries) };
}

/** Copies a meal of the previous day (or any day) into a meal of the given day. */
export async function copyMealAction(input: { fromDate: string; meal: (typeof MEAL_TYPES)[number]; toDate: string; toMeal?: (typeof MEAL_TYPES)[number] }): Promise<{ ok: boolean; added?: number }> {
  const userId = await requireUserId();
  const parsed = z.object({ fromDate: date, meal, toDate: date, toMeal: meal.optional() }).safeParse(input);
  if (!parsed.success) return { ok: false };
  const lines = (await getLog(userId, parsed.data.fromDate)).entries.filter((e) => e.meal === parsed.data.meal);
  const entries = lines.map(inputFromLog).filter((e): e is EntryInput => !!e);
  if (!entries.length) return { ok: true, added: 0 };
  return { ok: true, added: await addAll(userId, parsed.data.toDate, parsed.data.toMeal ?? parsed.data.meal, entries) };
}
