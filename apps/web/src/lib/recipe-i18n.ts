import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getCatalog } from "@weeko/catalog";
import type { Recipe } from "@weeko/engine";
import { db } from "./db";
import { env } from "./env";

/**
 * English recipes. The catalog is written in French; the English texts are
 * produced once by Claude (Message Batches API, half price) and stored in
 * MongoDB, then laid over the catalog in memory. A recipe whose French text
 * changes goes back to French until it is translated again.
 */

interface Translation {
  _id: string;
  /** Hash of the French text that was translated */
  hash: string;
  en: { name: string; description: string | null; steps: string[] };
  at: Date;
}

interface Job {
  _id: "recipe_i18n";
  batchId: string;
  chunks: Record<string, string[]>;
  createdAt: Date;
}

const translations = () => db.collection<Translation>("recipe_i18n");
const jobs = () => db.collection<Job>("jobs");

const CHUNK = 10;
const RELOAD_MS = 10 * 60_000;

function hashOf(r: Recipe): string {
  return createHash("sha1")
    .update(JSON.stringify([r.name.fr, r.description?.fr ?? null, r.steps.map((s) => s.fr)]))
    .digest("hex")
    .slice(0, 16);
}

// ------------------------------------------------------------------ Overlay

let loadedAt = 0;
let loading: Promise<void> | null = null;

function apply(docs: Translation[]): number {
  const catalog = getCatalog();
  let applied = 0;
  for (const d of docs) {
    if (!catalog.recipes.has(d._id)) continue;
    const r = catalog.recipe(d._id);
    if (hashOf(r) !== d.hash || d.en.steps.length !== r.steps.length) continue;
    r.name.en = d.en.name;
    if (r.description && d.en.description) r.description.en = d.en.description;
    r.steps.forEach((s, i) => (s.en = d.en.steps[i]));
    applied++;
  }
  return applied;
}

/** Lays the stored English texts over the catalog (at most every 10 minutes). Never throws. */
export function ensureRecipeTranslations(): Promise<void> {
  if (Date.now() - loadedAt < RELOAD_MS) return Promise.resolve();
  loading ??= (async () => {
    try {
      apply(await translations().find({}).toArray());
      loadedAt = Date.now();
    } catch (e) {
      console.warn("Recipe translations not loaded", e);
    } finally {
      loading = null;
    }
  })();
  return loading;
}

// ------------------------------------------------------------------ Translation jobs

const Out = z.object({
  recipes: z.array(z.object({ id: z.string(), name: z.string(), description: z.string().nullable(), steps: z.array(z.string()) })),
});

const SYSTEM = `You translate French home-cooking recipes into natural British English for a meal-planning app.
- Translate the name, the description (null stays null) and every step. Keep exactly the same number of steps, in the same order.
- Steps are friendly imperatives addressed to the reader ("Slice the onions…").
- Keep metric units and numbers as they are. Use common UK ingredient names (courgette, aubergine, coriander, spring onion).
- Keep French dish names that are used as such in English (ratatouille, quiche lorraine, crêpes, gratin dauphinois).
- Return every recipe you were given, with its id unchanged.`;

function missing(stored: Map<string, string>): Recipe[] {
  return getCatalog()
    .allRecipes()
    .filter((r) => stored.get(r.id) !== hashOf(r));
}

export interface TranslationStatus {
  total: number;
  done: number;
  batch: { id: string; status: string; succeeded: number; errored: number; processing: number; createdAt: Date } | null;
  configured: boolean;
}

export async function translationStatus(): Promise<TranslationStatus> {
  const total = getCatalog().allRecipes().length;
  const docs = await translations().find({}, { projection: { hash: 1 } }).toArray();
  const done = total - missing(new Map(docs.map((d) => [d._id, d.hash]))).length;
  const job = await jobs().findOne({ _id: "recipe_i18n" });
  if (!job || !env.anthropicKey) return { total, done, batch: null, configured: !!env.anthropicKey };
  const b = await new Anthropic({ apiKey: env.anthropicKey }).messages.batches.retrieve(job.batchId);
  return {
    total,
    done,
    configured: true,
    batch: { id: b.id, status: b.processing_status, succeeded: b.request_counts.succeeded, errored: b.request_counts.errored, processing: b.request_counts.processing, createdAt: job.createdAt },
  };
}

/**
 * One step of the translation: collects a finished batch, otherwise starts a
 * batch for the recipes still in French. Safe to call repeatedly (cron, admin).
 */
export async function stepRecipeTranslation(): Promise<{ action: "started" | "waiting" | "collected" | "nothing" | "unconfigured"; count: number }> {
  if (!env.anthropicKey) return { action: "unconfigured", count: 0 };
  const client = new Anthropic({ apiKey: env.anthropicKey, maxRetries: 2 });
  const job = await jobs().findOne({ _id: "recipe_i18n" });

  if (job) {
    const b = await client.messages.batches.retrieve(job.batchId);
    if (b.processing_status !== "ended") return { action: "waiting", count: b.request_counts.processing };
    const catalog = getCatalog();
    let saved = 0;
    for await (const res of await client.messages.batches.results(job.batchId)) {
      if (res.result.type !== "succeeded") continue;
      const text = res.result.message.content.find((c) => c.type === "text");
      const parsed = text?.type === "text" ? Out.safeParse(JSON.parse(text.text)) : null;
      if (!parsed?.success) continue;
      const asked = new Set(job.chunks[res.custom_id] ?? []);
      for (const t of parsed.data.recipes) {
        if (!asked.has(t.id) || !catalog.recipes.has(t.id)) continue;
        const r = catalog.recipe(t.id);
        if (t.steps.length !== r.steps.length || !t.name.trim()) continue;
        await translations().updateOne(
          { _id: t.id },
          { $set: { hash: hashOf(r), en: { name: t.name.trim(), description: r.description ? (t.description?.trim() ?? null) : null, steps: t.steps.map((s) => s.trim()) }, at: new Date() } },
          { upsert: true },
        );
        saved++;
      }
    }
    await jobs().deleteOne({ _id: "recipe_i18n" });
    loadedAt = 0;
    return { action: "collected", count: saved };
  }

  const docs = await translations().find({}, { projection: { hash: 1 } }).toArray();
  const todo = missing(new Map(docs.map((d) => [d._id, d.hash])));
  if (!todo.length) return { action: "nothing", count: 0 };

  const chunks: Record<string, string[]> = {};
  const requests = [];
  for (let i = 0; i < todo.length; i += CHUNK) {
    const part = todo.slice(i, i + CHUNK);
    const id = `chunk-${i / CHUNK}`;
    chunks[id] = part.map((r) => r.id);
    requests.push({
      custom_id: id,
      params: {
        model: env.anthropicModel,
        max_tokens: 16000,
        system: [{ type: "text" as const, text: SYSTEM, cache_control: { type: "ephemeral" as const } }],
        messages: [{ role: "user" as const, content: JSON.stringify(part.map((r) => ({ id: r.id, name: r.name.fr, description: r.description?.fr ?? null, steps: r.steps.map((s) => s.fr) }))) }],
        output_config: { effort: "low" as const, format: zodOutputFormat(Out) },
      },
    });
  }
  const batch = await client.messages.batches.create({ requests });
  await jobs().insertOne({ _id: "recipe_i18n", batchId: batch.id, chunks, createdAt: new Date() });
  return { action: "started", count: todo.length };
}
