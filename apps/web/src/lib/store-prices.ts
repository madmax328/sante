import "server-only";
import { getCatalog } from "@weeko/catalog";
import type { ShoppingList } from "@weeko/engine";
import { db, ensureIndexes } from "./db";
import { brandOf, PRICE_SOURCES } from "./price-sources";

/**
 * Store comparison from Open Prices (Open Food Facts), the open database of
 * prices people record in shops. A daily job keeps, for each ingredient, the
 * median price per chain over the last 12 months in France. The weekly basket
 * is then estimated per chain: measured prices where there are some, and the
 * chain's usual gap to the average price for the rest.
 */

const API = "https://prices.openfoodfacts.org/api/v1/prices";
const MIN_SAMPLES = 2;
/** A chain is compared only with this many products of the list priced there. */
const MIN_ITEMS = 5;
/** Bumped when the import rules change: older entries are fetched again. */
const VERSION = 2;

interface StorePrices {
  _id: string;
  /** € per kg (or L) — or per piece for ingredients counted in pieces */
  brands: Record<string, { price: number; count: number }>;
  samples: number;
  updatedAt: Date;
  v?: number;
}

const collection = () => db.collection<StorePrices>("store_prices");

interface OpenPrice {
  price: string | number;
  labels_tags?: string[] | null;
  price_per?: "KILOGRAM" | "UNIT" | null;
  currency?: string;
  location?: { type?: string; osm_brand?: string | null; osm_name?: string | null; osm_address_country_code?: string | null } | null;
  product?: { product_quantity?: number | null; product_quantity_unit?: string | null; labels_tags?: string[] | null } | null;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

async function page(params: Record<string, string>, n: number): Promise<OpenPrice[]> {
  const url = `${API}?${new URLSearchParams({ ...params, currency: "EUR", price_is_discounted: "false", size: "100", page: String(n), order_by: "-date" })}`;
  const res = await fetch(url, { headers: { "User-Agent": "Sorloo/1.0 (contact@sorloo.com)" }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return [];
  const body = (await res.json().catch(() => null)) as { items?: OpenPrice[] } | null;
  return body?.items ?? [];
}

/** Prices for one ingredient, converted to the reference unit, with their chain. */
async function samplesFor(ingredientId: string): Promise<{ brand: string; price: number }[]> {
  const source = PRICE_SOURCES[ingredientId];
  const catalog = getCatalog();
  if (!source || !catalog.ingredients.has(ingredientId)) return [];
  const ing = catalog.ingredient(ingredientId);
  const perPiece = ing.unit === "pc";
  const reference = catalog.price(ingredientId, perPiece ? 1 : 1000);
  const since = new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);
  const out: { brand: string; price: number }[] = [];

  const queries = [
    ...(source.raw ?? []).map((tag) => ({ category_tag: tag, date__gte: since })),
    ...(source.product ?? []).map((tag) => ({ product__categories_tags__contains: tag, date__gte: since })),
  ];
  for (const q of queries) {
    for (let n = 1; n <= 2; n++) {
      const items = await page(q, n).catch(() => []);
      for (const p of items) {
        const loc = p.location;
        if (!loc || loc.osm_address_country_code !== "FR") continue;
        const brand = brandOf(loc.osm_brand, loc.osm_name);
        const value = Number(p.price);
        if (!brand || !(value > 0)) continue;
        // Organic prices would make mainstream chains look dearer: only kept for organic shops.
        const labels = [...(p.labels_tags ?? []), ...(p.product?.labels_tags ?? [])];
        if (brand !== "Biocoop" && labels.some((l) => /organic|biologique|\bbio\b|^fr:ab-/i.test(l))) continue;
        let price: number | null = null;
        if ("category_tag" in q) {
          if (p.price_per === "KILOGRAM") price = perPiece ? (ing.pieceWeight ? (value * ing.pieceWeight) / 1000 : null) : value;
          else if (p.price_per === "UNIT") price = perPiece ? value : ing.pieceWeight ? value / (ing.pieceWeight / 1000) : null;
        } else if (!perPiece) {
          const qty = p.product?.product_quantity;
          const unit = (p.product?.product_quantity_unit ?? "g").toLowerCase();
          const grams = qty ? (unit === "kg" || unit === "l" ? qty * 1000 : unit === "cl" ? qty * 10 : qty) : 0;
          if (grams >= 20) price = (value / grams) * 1000;
        }
        // A price far from the usual range is a mismatch (wrong category, unit or quantity).
        if (price && price > reference / 4 && price < reference * 4) out.push({ brand, price });
      }
      if (items.length < 100) break;
    }
  }
  // Drop what is far from the typical price of this product (wrong size, mislabelled item…).
  if (out.length < 3) return out;
  const typical = median(out.map((x) => x.price));
  return out.filter((x) => x.price > typical / 2 && x.price < typical * 2);
}

/** Refreshes the oldest ingredients first, within a time budget (daily cron). */
export async function refreshStorePrices(budgetMs = 50_000): Promise<{ updated: number; withData: number; remaining: number }> {
  await ensureIndexes();
  const started = Date.now();
  const ids = Object.keys(PRICE_SOURCES);
  // Entries imported with older rules count as never imported.
  const known = new Map((await collection().find({}, { projection: { updatedAt: 1, v: 1 } }).toArray()).map((d) => [d._id, d.v === VERSION ? d.updatedAt.getTime() : 0]));
  const queue = ids.sort((a, b) => (known.get(a) ?? 0) - (known.get(b) ?? 0));
  const fresh = Date.now() - 3 * 86400_000;
  let updated = 0;
  let withData = 0;
  for (const id of queue) {
    if (Date.now() - started > budgetMs) break;
    if ((known.get(id) ?? 0) > fresh) continue;
    const samples = await samplesFor(id);
    const byBrand = new Map<string, number[]>();
    for (const s of samples) byBrand.set(s.brand, [...(byBrand.get(s.brand) ?? []), s.price]);
    const brands: StorePrices["brands"] = {};
    for (const [brand, prices] of byBrand) brands[brand] = { price: Math.round(median(prices) * 100) / 100, count: prices.length };
    await collection().updateOne({ _id: id }, { $set: { brands, samples: samples.length, updatedAt: new Date(), v: VERSION } }, { upsert: true });
    updated++;
    if (samples.length) withData++;
  }
  const done = await collection().countDocuments({ updatedAt: { $gt: new Date(fresh) }, v: VERSION });
  return { updated, withData, remaining: Math.max(0, ids.length - done) };
}

export interface StoreEstimate {
  brand: string;
  total: number;
  /** Items of the list with prices measured in this chain */
  measured: number;
  /** Basket in this chain compared with the median chain (1 = same, 0.92 = 8 % cheaper) */
  index: number;
}

export interface StoreComparison {
  reference: number;
  items: number;
  stores: StoreEstimate[];
  updatedAt: Date | null;
}

/**
 * The week's shopping list priced in each chain. Chains are compared with
 * each other on the same products: for each product priced in several chains,
 * each chain's price is divided by the median of those chains. A chain's
 * index is the median of its ratios, used for the products it has no price for.
 */
export async function compareStores(list: ShoppingList): Promise<StoreComparison> {
  const items = list.aisles.flatMap((a) => a.items).filter((i) => i.cost > 0);
  const docs = await collection()
    .find({ _id: { $in: items.map((i) => i.ingredientId) } })
    .toArray()
    .catch(() => []);
  const ratios = new Map<string, Map<string, number>>();
  for (const d of docs) {
    const priced = Object.entries(d.brands).filter(([, v]) => v.count >= MIN_SAMPLES);
    if (priced.length < 2) continue;
    const typical = median(priced.map(([, v]) => v.price));
    for (const [brand, v] of priced) {
      if (!ratios.has(brand)) ratios.set(brand, new Map());
      ratios.get(brand)!.set(d._id, v.price / typical);
    }
  }
  const stores: StoreEstimate[] = [];
  for (const [brand, byItem] of ratios) {
    if (byItem.size < MIN_ITEMS) continue;
    const index = Math.min(1.5, Math.max(0.7, median([...byItem.values()])));
    const total = items.reduce((s, i) => s + i.cost * (byItem.get(i.ingredientId) ?? index), 0);
    stores.push({ brand, total: Math.round(total * 100) / 100, measured: byItem.size, index: Math.round(index * 100) / 100 });
  }
  // The gap shown is the one of the whole basket, against the median of the chains.
  const typicalTotal = stores.length ? median(stores.map((x) => x.total)) : 0;
  for (const x of stores) x.index = typicalTotal ? Math.round((x.total / typicalTotal) * 100) / 100 : 1;
  stores.sort((a, b) => a.total - b.total);
  const updatedAt = docs.reduce<Date | null>((d, x) => (!d || x.updatedAt > d ? x.updatedAt : d), null);
  return { reference: Math.round(items.reduce((s, i) => s + i.cost, 0) * 100) / 100, items: items.length, stores, updatedAt };
}

/** Coverage of the price data, for the admin page. */
export async function storePriceStats(): Promise<{ ingredients: number; withData: number; samples: number; brands: { brand: string; ingredients: number }[]; updatedAt: Date | null }> {
  const docs = await collection().find({}).toArray().catch(() => []);
  const perBrand = new Map<string, number>();
  for (const d of docs) for (const [b, v] of Object.entries(d.brands)) if (v.count >= MIN_SAMPLES) perBrand.set(b, (perBrand.get(b) ?? 0) + 1);
  return {
    ingredients: Object.keys(PRICE_SOURCES).length,
    withData: docs.filter((d) => d.samples > 0).length,
    samples: docs.reduce((s, d) => s + d.samples, 0),
    brands: [...perBrand].map(([brand, ingredients]) => ({ brand, ingredients })).sort((a, b) => b.ingredients - a.ingredients),
    updatedAt: docs.reduce<Date | null>((d, x) => (!d || x.updatedAt > d ? x.updatedAt : d), null),
  };
}
