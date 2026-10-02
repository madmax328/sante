import type { Catalog } from "./catalog";
import type { Stock } from "./stock";
import type { Aisle } from "./types";

export const AISLE_ORDER: Aisle[] = [
  "produce",
  "bakery",
  "meat",
  "fish",
  "dairy",
  "plant",
  "grocery",
  "sweet",
  "spices",
  "frozen",
  "drinks",
];

export interface ShoppingItem {
  ingredientId: string;
  /** Quantity needed by the plan (base unit) */
  needed: number;
  /** Taken from the pantry */
  fromPantry: number;
  /** Quantity to buy (whole packs) */
  toBuy: number;
  packs: number[];
  cost: number;
  /** Left after the week, from bought packs */
  leftover: number;
}

export interface ShoppingAisle {
  aisle: Aisle;
  items: ShoppingItem[];
  cost: number;
}

export interface ShoppingList {
  aisles: ShoppingAisle[];
  /** Assumed in the kitchen: check before shopping */
  staples: { ingredientId: string; needed: number }[];
  /** Ingredients fully covered by the pantry */
  fromPantry: { ingredientId: string; qty: number }[];
  total: number;
  /** Value of what will be left (bought but unused) */
  leftoverValue: number;
}

export function buildShoppingList(catalog: Catalog, stock: Stock): ShoppingList {
  const byAisle = new Map<Aisle, ShoppingItem[]>();
  const fromPantry: ShoppingList["fromPantry"] = [];
  const staples: ShoppingList["staples"] = [];
  const leftovers = stock.leftovers();
  let leftoverValue = 0;

  for (const [id, needed] of stock.consumed) {
    const ing = catalog.ingredient(id);
    if (ing.staple) {
      staples.push({ ingredientId: id, needed: roundQty(needed, ing.unit) });
      continue;
    }
    const purchase = stock.purchases.get(id);
    const pantry = stock.pantryUsed(id);
    if (!purchase) {
      if (pantry > 0) fromPantry.push({ ingredientId: id, qty: roundQty(pantry, ing.unit) });
      continue;
    }
    const left = leftovers.get(id) ?? 0;
    leftoverValue += catalog.price(id, left);
    const item: ShoppingItem = {
      ingredientId: id,
      needed: roundQty(needed, ing.unit),
      fromPantry: roundQty(pantry, ing.unit),
      toBuy: purchase.qty,
      packs: [...purchase.packs].sort((a, b) => b - a),
      cost: Math.round(purchase.cost * 100) / 100,
      leftover: roundQty(left, ing.unit),
    };
    if (!byAisle.has(ing.aisle)) byAisle.set(ing.aisle, []);
    byAisle.get(ing.aisle)!.push(item);
  }

  const aisles = AISLE_ORDER.filter((a) => byAisle.has(a)).map((aisle) => {
    const items = byAisle.get(aisle)!.sort((a, b) =>
      catalog.ingredient(a.ingredientId).name.fr.localeCompare(catalog.ingredient(b.ingredientId).name.fr, "fr"),
    );
    return { aisle, items, cost: Math.round(items.reduce((s, i) => s + i.cost, 0) * 100) / 100 };
  });
  return {
    aisles,
    staples,
    fromPantry,
    total: Math.round(aisles.reduce((s, a) => s + a.cost, 0) * 100) / 100,
    leftoverValue: Math.round(leftoverValue * 100) / 100,
  };
}

export function roundQty(q: number, unit: "g" | "ml" | "pc"): number {
  if (unit === "pc") return Math.round(q * 4) / 4;
  if (q < 20) return Math.round(q);
  if (q < 200) return Math.round(q / 5) * 5;
  return Math.round(q / 10) * 10;
}

/** Human friendly quantity, e.g. "1,2 kg", "12 œufs", "250 ml". */
export function formatQty(catalog: Catalog, id: string, q: number, locale = "fr"): string {
  const ing = catalog.ingredient(id);
  const nf = (n: number, d = 1) => n.toLocaleString(locale, { maximumFractionDigits: d });
  if (ing.unit === "pc") {
    const n = Math.round(q * 4) / 4;
    const name = n > 1 ? (ing.plural?.[locale as "fr"] ?? ing.plural?.fr ?? ing.name.fr) : ing.name.fr;
    return `${nf(n, 2)} ${name.toLowerCase()}`;
  }
  const unit = ing.unit === "ml" ? ["ml", "l"] : ["g", "kg"];
  if (q >= 1000) return `${nf(q / 1000, 2)} ${unit[1]}`;
  return `${nf(roundQty(q, ing.unit), 0)} ${unit[0]}`;
}
