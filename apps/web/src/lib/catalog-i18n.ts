import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { DISLIKE_GROUPS, exercises, ingredients, recipes } from "@weeko/catalog";
import type { Locale, Localized } from "@weeko/engine";
import { db } from "./db";
import { env } from "./env";

/**
 * The catalog in the other languages. It is written in French (with English
 * names for ingredients and exercises); the other texts are translated once by
 * Claude (Message Batches API, half price), stored in MongoDB and laid over
 * the catalog in memory, one language at a time when it is first needed.
 * A text whose French changes goes back to the fallback until translated again.
 */

type Kind = "recipe" | "ingredient" | "exercise" | "group";
export const TARGETS = ["en", "de", "es", "it", "pt"] as const satisfies readonly Locale[];
type Target = (typeof TARGETS)[number];

interface Unit {
  kind: Kind;
  id: string;
  /** The French texts, in a fixed order; "" for an absent optional text */
  texts: string[];
  /** Where each translated text goes */
  slots: (Localized | undefined)[];
}

interface Translation {
  _id: string;
  lang: Target;
  kind: Kind;
  id: string;
  hash: string;
  texts: string[];
  at: Date;
}

interface Job {
  _id: "catalog_i18n";
  batchId: string;
  chunks: Record<string, { lang: Target; keys: string[] }>;
  createdAt: Date;
}

const translations = () => db.collection<Translation>("catalog_i18n");
const jobs = () => db.collection<Job>("jobs");

/** Every translatable text of the catalog, grouped by item. */
function units(): Unit[] {
  const out: Unit[] = [];
  for (const r of recipes) {
    out.push({ kind: "recipe", id: r.id, texts: [r.name.fr, r.description?.fr ?? "", ...r.steps.map((s) => s.fr)], slots: [r.name, r.description, ...r.steps] });
  }
  for (const i of ingredients) out.push({ kind: "ingredient", id: i.id, texts: [i.name.fr, i.plural?.fr ?? ""], slots: [i.name, i.plural] });
  for (const x of exercises) out.push({ kind: "exercise", id: x.id, texts: [x.name.fr, ...x.steps.map((s) => s.fr), ...x.tips.map((s) => s.fr)], slots: [x.name, ...x.steps, ...x.tips] });
  for (const g of DISLIKE_GROUPS) out.push({ kind: "group", id: g.id, texts: [g.name.fr], slots: [g.name] });
  return out;
}

let unitCache: Map<string, Unit> | undefined;
const unitMap = () => (unitCache ??= new Map(units().map((u) => [`${u.kind}:${u.id}`, u])));

const hashOf = (u: Unit) => createHash("sha1").update(JSON.stringify(u.texts)).digest("hex").slice(0, 16);

/** English already exists for ingredients, exercises and food groups: only recipes need it. */
const needed = (u: Unit, lang: Target) => lang !== "en" || u.kind === "recipe";

// ------------------------------------------------------------------ Overlay

const loaded = new Map<Target, Date>();
const loading = new Map<Target, Promise<void>>();
const RELOAD_MS = 10 * 60_000;

function apply(docs: Translation[]) {
  const map = unitMap();
  for (const d of docs) {
    const u = map.get(`${d.kind}:${d.id}`);
    if (!u || hashOf(u) !== d.hash || d.texts.length !== u.texts.length) continue;
    u.slots.forEach((slot, i) => {
      const text = d.texts[i]?.trim();
      if (slot && text) slot[d.lang] = text;
    });
  }
}

/**
 * Lays the stored translations of a language over the catalog: all of them
 * the first time, then only the new ones (at most every 10 minutes). Never throws.
 */
export function ensureCatalogTranslations(locale: Locale): Promise<void> {
  if (locale === "fr") return Promise.resolve();
  const lang = locale as Target;
  const since = loaded.get(lang);
  if (since && Date.now() - since.getTime() < RELOAD_MS) return Promise.resolve();
  let p = loading.get(lang);
  if (!p) {
    p = (async () => {
      const start = new Date();
      try {
        apply(await translations().find(since ? { lang, at: { $gte: since } } : { lang }).toArray());
        loaded.set(lang, start);
      } catch (e) {
        console.warn("Catalog translations not loaded", lang, e);
      } finally {
        loading.delete(lang);
      }
    })();
    loading.set(lang, p);
  }
  return p;
}

// ------------------------------------------------------------------ Translation jobs

const Out = z.object({ items: z.array(z.object({ key: z.string(), texts: z.array(z.string()) })) });

const LANGUAGE: Record<Target, string> = {
  en: "British English",
  de: "German (informal \"du\")",
  es: "Spanish from Spain (informal \"tú\")",
  it: "Italian (informal \"tu\")",
  pt: "Brazilian Portuguese (\"você\")",
};

const system = (lang: Target) => `You translate the French content of a meal-planning and fitness app into ${LANGUAGE[lang]}.
Each item has a key and a list of texts. Return every item with its key unchanged and exactly the same number of texts, in the same order; an empty text stays empty.
- Recipes: name, description, then the steps. Steps are friendly instructions addressed to the reader. Keep numbers and metric units. Use the usual local names of ingredients and dishes; keep French dish names that are used as such (ratatouille, quiche, crêpes).
- Ingredients: singular name, then the plural used for counted items (lower case is fine for the plural). Use the name shoppers see in a supermarket.
- Exercises: name, then steps, then tips, in the usual words of fitness coaching.
- Food groups: a short plural name ("Mushrooms").
Translate the meaning naturally; never add or drop information.`;

const CHUNK: Record<Kind, number> = { recipe: 10, exercise: 10, ingredient: 50, group: 60 };

async function storedHashes(): Promise<Map<string, string>> {
  const docs = await translations().find({}, { projection: { hash: 1 } }).toArray();
  return new Map(docs.map((d) => [d._id, d.hash]));
}

function missing(stored: Map<string, string>): { lang: Target; unit: Unit }[] {
  const out: { lang: Target; unit: Unit }[] = [];
  for (const u of unitMap().values()) {
    for (const lang of TARGETS) {
      if (needed(u, lang) && stored.get(`${lang}:${u.kind}:${u.id}`) !== hashOf(u)) out.push({ lang, unit: u });
    }
  }
  return out;
}

export interface TranslationStatus {
  languages: { lang: Target; done: number; total: number }[];
  batch: { status: string; processing: number; succeeded: number; errored: number; createdAt: Date } | null;
  configured: boolean;
}

export async function translationStatus(): Promise<TranslationStatus> {
  const todo = missing(await storedHashes());
  const languages = TARGETS.map((lang) => {
    const total = [...unitMap().values()].filter((u) => needed(u, lang)).length;
    return { lang, total, done: total - todo.filter((m) => m.lang === lang).length };
  });
  const job = await jobs().findOne({ _id: "catalog_i18n" });
  if (!job || !env.anthropicKey) return { languages, batch: null, configured: !!env.anthropicKey };
  const b = await new Anthropic({ apiKey: env.anthropicKey }).messages.batches.retrieve(job.batchId);
  return {
    languages,
    configured: true,
    batch: { status: b.processing_status, processing: b.request_counts.processing, succeeded: b.request_counts.succeeded, errored: b.request_counts.errored, createdAt: job.createdAt },
  };
}

/**
 * One step: collects a finished batch, otherwise starts a batch for every
 * text still missing. Safe to call repeatedly (nightly cron, admin page).
 */
export async function stepCatalogTranslation(): Promise<{ action: "started" | "waiting" | "collected" | "nothing" | "unconfigured"; count: number }> {
  if (!env.anthropicKey) return { action: "unconfigured", count: 0 };
  const client = new Anthropic({ apiKey: env.anthropicKey, maxRetries: 2 });
  const job = await jobs().findOne({ _id: "catalog_i18n" });
  const map = unitMap();

  if (job) {
    const b = await client.messages.batches.retrieve(job.batchId);
    if (b.processing_status !== "ended") return { action: "waiting", count: b.request_counts.processing };
    let saved = 0;
    for await (const res of await client.messages.batches.results(job.batchId)) {
      const chunk = job.chunks[res.custom_id];
      if (!chunk || res.result.type !== "succeeded") continue;
      const text = res.result.message.content.find((c) => c.type === "text");
      let parsed: z.infer<typeof Out> | null = null;
      try {
        parsed = text?.type === "text" ? Out.parse(JSON.parse(text.text)) : null;
      } catch {
        parsed = null;
      }
      if (!parsed) continue;
      const asked = new Set(chunk.keys);
      for (const item of parsed.items) {
        const u = map.get(item.key);
        if (!u || !asked.has(item.key) || item.texts.length !== u.texts.length || !item.texts[0]?.trim()) continue;
        await translations().updateOne(
          { _id: `${chunk.lang}:${item.key}` },
          { $set: { lang: chunk.lang, kind: u.kind, id: u.id, hash: hashOf(u), texts: item.texts.map((t, i) => (u.texts[i] ? t.trim() : "")), at: new Date() } },
          { upsert: true },
        );
        saved++;
      }
    }
    await jobs().deleteOne({ _id: "catalog_i18n" });
    return { action: "collected", count: saved };
  }

  const todo = missing(await storedHashes());
  if (!todo.length) return { action: "nothing", count: 0 };

  const chunks: Job["chunks"] = {};
  const requests = [];
  for (const lang of TARGETS) {
    for (const kind of ["recipe", "ingredient", "exercise", "group"] as const) {
      const part = todo.filter((m) => m.lang === lang && m.unit.kind === kind).map((m) => m.unit);
      for (let i = 0; i < part.length; i += CHUNK[kind]) {
        const items = part.slice(i, i + CHUNK[kind]).map((u) => ({ key: `${u.kind}:${u.id}`, texts: u.texts }));
        const id = `${lang}-${kind}-${i / CHUNK[kind]}`;
        chunks[id] = { lang, keys: items.map((x) => x.key) };
        requests.push({
          custom_id: id,
          params: {
            model: env.anthropicModel,
            max_tokens: 16000,
            system: [{ type: "text" as const, text: system(lang), cache_control: { type: "ephemeral" as const } }],
            messages: [{ role: "user" as const, content: JSON.stringify(items) }],
            output_config: { effort: "low" as const, format: zodOutputFormat(Out) },
          },
        });
      }
    }
  }
  const batch = await client.messages.batches.create({ requests });
  await jobs().insertOne({ _id: "catalog_i18n", batchId: batch.id, chunks, createdAt: new Date() });
  return { action: "started", count: todo.length };
}
