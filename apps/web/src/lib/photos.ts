import "server-only";
import { getCatalog } from "@weeko/catalog";
import { db } from "./db";
import { env } from "./env";

export interface RecipePhoto {
  recipeId: string;
  /** Where the photo comes from (credit link); older entries are Pexels */
  source?: "pexels" | "unsplash";
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

/** A photo found by a provider, before it is saved for recipes. */
type Found = Omit<RecipePhoto, "recipeId" | "query"> & { source: "pexels" | "unsplash"; downloadLocation?: string };

interface PexelsPhoto {
  id: number;
  url: string;
  alt: string;
  photographer: string;
  photographer_url: string;
  src: { large: string; medium: string; landscape: string };
}

async function searchPexels(query: string): Promise<Found | undefined> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: env.pexelsKey! }, cache: "no-store" });
  if (res.status === 429) throw new Error("rate_limited");
  if (!res.ok) return undefined;
  const p = ((await res.json()) as { photos: PexelsPhoto[] }).photos[0];
  if (!p) return undefined;
  return { source: "pexels", url: p.src.large, thumb: p.src.medium, alt: p.alt, photographer: p.photographer, photographerUrl: p.photographer_url, sourceUrl: p.url };
}

interface UnsplashPhoto {
  alt_description: string | null;
  urls: { regular: string; small: string };
  links: { html: string; download_location: string };
  user: { name: string; links: { html: string } };
}

// Unsplash asks for these parameters on every link back to them.
const UTM = "utm_source=sorloo&utm_medium=referral";

async function searchUnsplash(query: string): Promise<Found | undefined> {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&content_filter=high`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${env.unsplashKey}`, "Accept-Version": "v1" }, cache: "no-store" });
  if (res.status === 429 || res.status === 403) throw new Error("rate_limited");
  if (!res.ok) return undefined;
  const p = ((await res.json()) as { results: UnsplashPhoto[] }).results[0];
  if (!p) return undefined;
  return {
    source: "unsplash",
    // Hotlinked as Unsplash requires; their CDN resizes on the fly.
    url: p.urls.regular,
    thumb: p.urls.small,
    alt: p.alt_description ?? query,
    photographer: p.user.name,
    photographerUrl: `${p.user.links.html}?${UTM}`,
    sourceUrl: `${p.links.html}?${UTM}`,
    downloadLocation: p.links.download_location,
  };
}

/** Unsplash counts a "download" each time a photo is used in the app (API guideline). */
async function trackUnsplashUse(downloadLocation: string): Promise<void> {
  await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${env.unsplashKey}` }, cache: "no-store" }).catch(() => undefined);
}

const search = (query: string) => (env.pexelsKey ? searchPexels(query) : searchUnsplash(query));

/**
 * Searches per run: Pexels allows 200 requests per hour, Unsplash 50 until the
 * app is approved for production (up to 3 requests per dish: 2 searches + use tracking).
 */
export const PHOTO_BATCH = () => (env.pexelsKey ? 150 : 15);

/**
 * Finds a photo for recipes that have none, one search per distinct query
 * (variants of a dish share their photo). Providers limit requests per hour,
 * so the work is done in batches (cron job, or the URL called by hand).
 */
export async function syncPhotos(maxQueries = 40): Promise<{ provider: string; queries: number; saved: number; remaining: number }> {
  const provider = env.pexelsKey ? "pexels" : env.unsplashKey ? "unsplash" : "none";
  if (provider === "none") return { provider, queries: 0, saved: 0, remaining: -1 };
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
      let found: Found | undefined;
      try {
        found = await search(query);
        if (!found) found = await search(query.split(" ").slice(0, 2).join(" ") + " dish");
      } catch {
        break;
      }
      if (!found) continue;
      if (found.downloadLocation) await trackUnsplashUse(found.downloadLocation);
      const { downloadLocation: _d, ...rest } = found;
      void _d;
      const created: RecipePhoto = { ...rest, recipeId: "", alt: found.alt || query, query };
      known.set(query, created);
      photo = created;
    }
    for (const id of ids) {
      await photos().updateOne({ recipeId: id }, { $set: { ...photo, recipeId: id } }, { upsert: true });
      saved++;
    }
  }
  const remaining = missing.length - saved;
  return { provider, queries, saved, remaining };
}
