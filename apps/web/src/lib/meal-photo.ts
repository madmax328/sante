import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getCatalog } from "@weeko/catalog";
import { env } from "./env";
import { LANGUAGE_NAME, tr, type Locale } from "./locale";

/**
 * Meal photo → the foods on the plate with an estimated weight. The person
 * checks and corrects the list before anything is added to the journal.
 * Foods found in the catalog get the catalog's nutrition (CIQUAL); the AI's
 * own estimate is only used for the others.
 */

export interface PhotoFood {
  name: string;
  /** Weight on the plate, as eaten */
  grams: number;
  /** Catalog ingredient when it is the same food in the same state */
  ingredientId: string | null;
  /** Nutrition per 100 g (from the catalog when ingredientId is set) */
  per100: { kcal: number; protein: number; carbs: number; fat: number };
  confidence: "high" | "medium" | "low";
}

export type PhotoResult = { ok: true; foods: PhotoFood[]; note: string | null } | { ok: false; error: "not_food" | "unavailable" | "unclear" };

const Out = z.object({
  is_food: z.boolean(),
  foods: z
    .array(
      z.object({
        name: z.string(),
        grams: z.number(),
        ingredient_id: z.string().nullable(),
        kcal_per_100g: z.number(),
        protein_per_100g: z.number(),
        carbs_per_100g: z.number(),
        fat_per_100g: z.number(),
        confidence: z.enum(["high", "medium", "low"]),
      }),
    ),
  note: z.string().nullable(),
});

let client: Anthropic | undefined;
function anthropic(): Anthropic {
  client ??= new Anthropic({ apiKey: env.anthropicKey, maxRetries: 1, timeout: 45_000 });
  return client;
}

let system: string | undefined;
function systemPrompt(): string {
  // Built once: the catalog does not change while the server runs (and the prompt stays cacheable).
  system ??= `Tu analyses la photo d'un repas pour un journal alimentaire.

Pour chaque aliment visible, donne :
- name : un nom court et courant (ex. « Riz blanc cuit », « Poulet rôti », « Salade verte »), dans la langue demandée ;
- grams : le poids estimé de la portion telle qu'elle est mangée, d'après la taille de l'assiette, des couverts et des aliments ;
- ingredient_id : l'identifiant du catalogue ci-dessous seulement si c'est le même aliment dans le même état (cru/cuit, sec/cuit) ; sinon null. Le riz, les pâtes ou les légumineuses du catalogue sont crus/secs : pour une portion cuite, mets null ;
- la valeur nutritionnelle pour 100 g de l'aliment tel qu'il est mangé (estimation réaliste, type tables CIQUAL) ;
- confidence : ta confiance dans l'identification et le poids.

Un plat composé (lasagnes, pizza, couscous…) peut être un seul aliment si ses ingrédients ne sont pas séparables. Ne compte pas ce qui n'est pas mangé (os, emballage, décor). Si la photo ne montre pas de nourriture, mets is_food à false et foods vide. note : une phrase courte et utile si quelque chose est incertain (ex. sauce cachée, quantité d'huile), sinon null. Pas de jugement sur le repas.

Catalogue (identifiant = nom) :
${[...getCatalog().ingredients.values()].map((i) => `${i.id} = ${i.name.fr}`).join("\n")}`;
  return system;
}

const MEDIA = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoMedia = (typeof MEDIA)[number];
export const isPhotoMedia = (m: string): m is PhotoMedia => (MEDIA as readonly string[]).includes(m);

const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v * 10) / 10));

export async function analyzeMealPhoto(base64: string, mediaType: PhotoMedia, locale: Locale): Promise<PhotoResult> {
  if (!env.anthropicKey) return { ok: false, error: "unavailable" };
  try {
    const response = await anthropic().beta.messages.parse({
      model: env.anthropicModel,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: systemPrompt(), cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: `Écris les noms des aliments en ${LANGUAGE_NAME[locale]}.` },
          ],
        },
      ],
      output_config: { effort: "low", format: betaZodOutputFormat(Out) },
    });
    const out = response.parsed_output;
    if (response.stop_reason === "refusal" || !out) return { ok: false, error: "unclear" };
    if (!out.is_food) return { ok: false, error: "not_food" };
    const catalog = getCatalog();
    const foods = out.foods
      .slice(0, 12)
      .filter((f) => f.name.trim() && f.grams > 0)
      .map((f): PhotoFood => {
        const id = f.ingredient_id && catalog.ingredients.has(f.ingredient_id) ? f.ingredient_id : null;
        const ing = id ? catalog.ingredient(id) : null;
        return {
          name: (ing ? tr(ing.name, locale) : f.name).trim().slice(0, 80),
          grams: Math.round(Math.min(2000, f.grams)),
          ingredientId: id,
          per100: ing
            ? { kcal: ing.nutrition.kcal, protein: ing.nutrition.protein, carbs: ing.nutrition.carbs, fat: ing.nutrition.fat }
            : { kcal: clamp(f.kcal_per_100g, 900), protein: clamp(f.protein_per_100g, 100), carbs: clamp(f.carbs_per_100g, 100), fat: clamp(f.fat_per_100g, 100) },
          confidence: f.confidence,
        };
      });
    if (!foods.length) return { ok: false, error: "unclear" };
    return { ok: true, foods, note: out.note?.trim().slice(0, 200) || null };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) console.warn("Meal photo: rate limited");
    else if (e instanceof Anthropic.APIError) console.error("Meal photo error", e.status, e.message);
    else console.error("Meal photo error", e);
    return { ok: false, error: "unavailable" };
  }
}
