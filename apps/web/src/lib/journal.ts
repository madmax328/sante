import "server-only";
import { z } from "zod";
import { getCatalog } from "@weeko/catalog";
import type { MealType } from "@weeko/engine";
import { db } from "./db";
import type { LogEntry } from "./types";

/** What can be added to the journal (also what favorites and saved meals store). */
export const entryInput = z.discriminatedUnion("kind", [
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

export type EntryInput = z.infer<typeof entryInput>;

/** The journal line for an entry, with nutrition computed from the catalog. Null if unknown. */
export function buildLogEntry(e: EntryInput, meal: MealType): LogEntry | null {
  const catalog = getCatalog();
  const base = { id: crypto.randomUUID(), meal, at: new Date() };
  if (e.kind === "recipe") {
    if (!catalog.recipes.has(e.id)) return null;
    const r = catalog.recipe(e.id);
    return { ...base, kind: "recipe", refId: r.id, name: r.name.fr, amount: e.amount, kcal: Math.round(r.nutrition.kcal * e.amount), protein: Math.round(r.nutrition.protein * e.amount), carbs: Math.round(r.nutrition.carbs * e.amount), fat: Math.round(r.nutrition.fat * e.amount) };
  }
  if (e.kind === "ingredient") {
    if (!catalog.ingredients.has(e.id)) return null;
    const i = catalog.ingredient(e.id);
    const f = catalog.grams(e.id, e.amount) / 100;
    return { ...base, kind: "ingredient", refId: i.id, name: i.name.fr, amount: e.amount, kcal: Math.round(i.nutrition.kcal * f), protein: Math.round(i.nutrition.protein * f), carbs: Math.round(i.nutrition.carbs * f), fat: Math.round(i.nutrition.fat * f) };
  }
  if (e.kind === "custom") {
    return { ...base, kind: "custom", name: e.name, amount: 1, kcal: Math.round(e.kcal), protein: Math.round(e.protein ?? 0), carbs: Math.round(e.carbs ?? 0), fat: Math.round(e.fat ?? 0) };
  }
  const f = e.grams / 100;
  return { ...base, kind: "barcode", refId: e.code, name: e.name, amount: e.grams, kcal: Math.round(e.per100.kcal * f), protein: Math.round(e.per100.protein * f), carbs: Math.round(e.per100.carbs * f), fat: Math.round(e.per100.fat * f) };
}

/** The reverse: an existing journal line as something that can be added again. */
export function inputFromLog(x: LogEntry): EntryInput | null {
  const r1 = (v: number) => Math.round(v * 10) / 10;
  if (x.kind === "recipe" && x.refId) return { kind: "recipe", id: x.refId, amount: x.amount };
  if (x.kind === "ingredient" && x.refId) return { kind: "ingredient", id: x.refId, amount: x.amount };
  if (x.kind === "barcode" && x.refId && x.amount > 0) {
    const k = 100 / x.amount;
    return { kind: "barcode", code: x.refId, name: x.name, grams: x.amount, per100: { kcal: Math.min(1000, Math.round(x.kcal * k)), protein: Math.min(100, r1(x.protein * k)), carbs: Math.min(100, r1(x.carbs * k)), fat: Math.min(100, r1(x.fat * k)) } };
  }
  // Planned meals and free entries are kept with their nutrition as they are.
  return { kind: "custom", name: x.name.slice(0, 80), kcal: x.kcal, protein: x.protein, carbs: x.carbs, fat: x.fat };
}

/** Same food = same key (whatever the quantity). */
export function keyOf(e: EntryInput): string {
  if (e.kind === "recipe" || e.kind === "ingredient") return `${e.kind}:${e.id}`;
  if (e.kind === "barcode") return `barcode:${e.code}`;
  return `custom:${e.name.trim().toLowerCase()}`;
}

export interface QuickFood {
  key: string;
  name: string;
  /** "150 g · 120 kcal" */
  detail: string;
  kcal: number;
  entry: EntryInput;
  favorite: boolean;
}

export function quickFood(e: EntryInput, favorite: boolean): QuickFood | null {
  const line = buildLogEntry(e, "lunch");
  if (!line) return null;
  const qty =
    e.kind === "recipe" ? `${e.amount} portion${e.amount > 1 ? "s" : ""}` : e.kind === "ingredient" ? (getCatalog().ingredient(e.id).unit === "pc" ? `${e.amount} pièce${e.amount > 1 ? "s" : ""}` : `${e.amount} g`) : e.kind === "barcode" ? `${e.grams} g` : "";
  return { key: keyOf(e), name: line.name, detail: [qty, `${line.kcal} kcal`].filter(Boolean).join(" · "), kcal: line.kcal, entry: e, favorite };
}

export interface SavedMeal {
  _id: string;
  userId: string;
  name: string;
  entries: EntryInput[];
  kcal: number;
  at: Date;
}

export const favorites = () => db.collection<{ _id: string; items: { key: string; entry: EntryInput; at: Date }[] }>("journal_favorites");
export const savedMeals = () => db.collection<SavedMeal>("saved_meals");
