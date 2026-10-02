import "server-only";
import { getCatalog } from "@weeko/catalog";
import { db } from "./db";
import { env } from "./env";

export interface RecipePhoto {
  recipeId: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
  query: string;
}

const photos = () => db.collection<RecipePhoto>("recipe_photos");

export async function getPhotoMap(recipeIds: string[]): Promise<Map<string, RecipePhoto>> {
  const ids = [...new Set(recipeIds)];
  if (ids.length === 0) return new Map();
  try {
    const docs = await photos().find({ recipeId: { $in: ids } }, { projection: { _id: 0 } }).toArray();
    return new Map(docs.map((d) => [d.recipeId, d]));
  } catch {
    return new Map();
  }
}

interface PexelsPhoto {
  id: number;
  url: string;
  alt: string;
  photographer: string;
  photographer_url: string;
  src: { large: string; medium: string; landscape: string };
}

async function searchPexels(query: string): Promise<PexelsPhoto | undefined> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: env.pexelsKey! }, cache: "no-store" });
  if (res.status === 429) throw new Error("rate_limited");
  if (!res.ok) return undefined;
  const json = (await res.json()) as { photos: PexelsPhoto[] };
  return json.photos[0];
}

/**
 * Finds a photo for recipes that have none, one Pexels search per distinct
 * query (variants of a dish share their photo). Pexels allows 200 requests
 * per hour, so the work is done in batches by a cron job.
 */
export async function syncPhotos(maxQueries = 40): Promise<{ queries: number; saved: number; remaining: number }> {
  if (!env.pexelsKey) return { queries: 0, saved: 0, remaining: -1 };
  const catalog = getCatalog();
  const have = new Set((await photos().find({}, { projection: { recipeId: 1 } }).toArray()).map((d) => d.recipeId));
  const missing = catalog.allRecipes().filter((r) => !have.has(r.id));
  const byQuery = new Map<string, string[]>();
  for (const r of missing) {
    const q = `${r.imageQuery} food`.toLowerCase();
    byQuery.set(q, [...(byQuery.get(q) ?? []), r.id]);
  }
  // Reuse photos already fetched for the same query.
  const known = new Map<string, RecipePhoto>(
    (await photos().find({}, { projection: { _id: 0 } }).toArray()).map((p) => [p.query, p as RecipePhoto]),
  );
  let queries = 0;
  let saved = 0;
  for (const [query, ids] of byQuery) {
    let photo = known.get(query);
    if (!photo) {
      if (queries >= maxQueries) continue;
      queries++;
      let found: PexelsPhoto | undefined;
      try {
        found = await searchPexels(query);
        if (!found) found = await searchPexels(query.split(" ").slice(0, 2).join(" ") + " dish");
      } catch {
        break;
      }
      if (!found) continue;
      const created: RecipePhoto = {
        recipeId: "",
        url: found.src.large,
        thumb: found.src.medium,
        alt: found.alt || query,
        photographer: found.photographer,
        photographerUrl: found.photographer_url,
        sourceUrl: found.url,
        query,
      };
      known.set(query, created);
      photo = created;
    }
    for (const id of ids) {
      await photos().updateOne({ recipeId: id }, { $set: { ...photo, recipeId: id } }, { upsert: true });
      saved++;
    }
  }
  const remaining = missing.length - saved;
  return { queries, saved, remaining };
}
