"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCatalog } from "@weeko/catalog";
import { MEAL_TYPES } from "@weeko/engine";
import { todayIn } from "@/lib/dates";
import { addLogEntry, getProfile, removeLogEntry } from "@/lib/repo";
import { requireUserId } from "@/lib/session";
import type { LogEntry } from "@/lib/types";

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
  const ingredients: FoodHit[] = [...catalog.ingredients.values()]
    .filter((i) => words.every((w) => norm(i.name.fr).includes(w)))
    .slice(0, 12)
    .map((i) => ({ kind: "ingredient", id: i.id, name: i.name.fr, kcal: i.nutrition.kcal, unit: i.unit, pieceWeight: i.pieceWeight }));
  const recipes: FoodHit[] = catalog
    .allRecipes()
    .filter((r) => words.every((w) => norm(r.name.fr).includes(w)))
    .slice(0, 12)
    .map((r) => ({ kind: "recipe", id: r.id, name: r.name.fr, kcal: r.nutrition.kcal, unit: "serving" }));
  return [...ingredients, ...recipes];
}

const entryInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("recipe"), id: z.string().max(120), amount: z.number().min(0.1).max(10) }),
  z.object({ kind: z.literal("ingredient"), id: z.string().max(60), amount: z.number().min(1).max(5000) }),
  z.object({
    kind: z.literal("custom"),
    name: z.string().trim().min(1).max(80),
    kcal: z.number().min(0).max(5000),
    protein: z.number().min(0).max(300).optional(),
    carbs: z.number().min(0).max(600).optional(),
    fat: z.number().min(0).max(300).optional(),
  }),
  z.object({
    kind: z.literal("barcode"),
    code: z.string().regex(/^\d{8,14}$/),
    name: z.string().max(120),
    grams: z.number().min(1).max(2000),
    per100: z.object({ kcal: z.number().min(0).max(1000), protein: z.number().min(0).max(100), carbs: z.number().min(0).max(100), fat: z.number().min(0).max(100) }),
  }),
]);

export async function addFoodAction(input: { date?: string; meal: (typeof MEAL_TYPES)[number]; entry: z.input<typeof entryInput> }): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const parsed = z.object({ date: date.optional(), meal, entry: entryInput }).safeParse(input);
  if (!parsed.success) return { ok: false };
  const profile = await getProfile(userId);
  const day = parsed.data.date ?? todayIn(profile?.timeZone);
  const catalog = getCatalog();
  const e = parsed.data.entry;
  const base = { id: crypto.randomUUID(), meal: parsed.data.meal, at: new Date() };
  let entry: LogEntry;
  if (e.kind === "recipe") {
    if (!catalog.recipes.has(e.id)) return { ok: false };
    const r = catalog.recipe(e.id);
    entry = { ...base, kind: "recipe", refId: r.id, name: r.name.fr, amount: e.amount, kcal: Math.round(r.nutrition.kcal * e.amount), protein: Math.round(r.nutrition.protein * e.amount), carbs: Math.round(r.nutrition.carbs * e.amount), fat: Math.round(r.nutrition.fat * e.amount) };
  } else if (e.kind === "ingredient") {
    if (!catalog.ingredients.has(e.id)) return { ok: false };
    const i = catalog.ingredient(e.id);
    const grams = catalog.grams(e.id, e.amount);
    const f = grams / 100;
    entry = { ...base, kind: "ingredient", refId: i.id, name: i.name.fr, amount: e.amount, kcal: Math.round(i.nutrition.kcal * f), protein: Math.round(i.nutrition.protein * f), carbs: Math.round(i.nutrition.carbs * f), fat: Math.round(i.nutrition.fat * f) };
  } else if (e.kind === "custom") {
    entry = { ...base, kind: "custom", name: e.name, amount: 1, kcal: Math.round(e.kcal), protein: Math.round(e.protein ?? 0), carbs: Math.round(e.carbs ?? 0), fat: Math.round(e.fat ?? 0) };
  } else {
    const f = e.grams / 100;
    entry = { ...base, kind: "barcode", refId: e.code, name: e.name, amount: e.grams, kcal: Math.round(e.per100.kcal * f), protein: Math.round(e.per100.protein * f), carbs: Math.round(e.per100.carbs * f), fat: Math.round(e.per100.fat * f) };
  }
  await addLogEntry(userId, day, entry);
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
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
      headers: { "User-Agent": "Weeko/1.0 (contact: contact@getweeko.com)" },
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
