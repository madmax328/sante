import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { MEAL_TYPES, type MealType, type PlanAction } from "@weeko/engine";
import { dayIndex } from "./dates";
import { env } from "./env";
import type { UserContext } from "./planning";
import type { StoredPlan } from "./types";

/**
 * The AI never computes nutrition or prices: it turns what the user says into
 * structured actions that the engine applies, and writes the explanations.
 */

let client: Anthropic | undefined;
function anthropic(): Anthropic {
  client ??= new Anthropic({ apiKey: env.anthropicKey, maxRetries: 2, timeout: 60_000 });
  return client;
}

// Flat schema (simple for structured outputs); converted and validated afterwards.
const ActionOut = z.object({
  type: z.enum(["replace_meal", "eat_out", "missing_ingredient", "time_limit", "guests", "skip_meal", "regenerate"]),
  day: z.number().int().nullable(),
  meal: z.enum(MEAL_TYPES).nullable(),
  label: z.string().nullable(),
  kcal: z.number().nullable(),
  ingredientId: z.string().nullable(),
  minutes: z.number().int().nullable(),
  total: z.number().int().nullable(),
});

const AnswerOut = z.object({
  reply: z.string(),
  actions: z.array(ActionOut),
});

export interface AiAnswer {
  reply: string;
  actions: PlanAction[];
  source: "ai" | "rules";
}

const SYSTEM = `Tu es le coach de Weeko, une application qui organise la semaine d'une personne : menus, recettes, courses, budget et sport.

Ton rôle :
- Comprendre ce que la personne écrit (imprévus, envies, contraintes) et proposer des modifications concrètes de son programme sous forme d'actions.
- Répondre à ses questions sur son programme, l'alimentation équilibrée et l'activité physique, de façon courte, chaleureuse et concrète, en français et en tutoyant.

Règles impératives :
- Tu n'inventes jamais de chiffres nutritionnels, de prix ou de quantités : ils sont calculés par le moteur de l'application. Tu peux citer ceux qui figurent dans le contexte.
- Les actions sont des propositions : la personne les validera. N'annonce jamais qu'une modification est faite.
- Jamais de culpabilisation. Un écart (pizza, restaurant, apéro) s'intègre : on ajuste en douceur les jours suivants, sans sauter de repas ni compenser par du sport.
- Pas de conseil médical. Pour une maladie, des médicaments, une grossesse, des troubles du comportement alimentaire ou des symptômes, recommande un professionnel de santé. Si la personne évoque une détresse ou des idées de se faire du mal, oriente-la vers le 3114 (numéro national de prévention du suicide) ou le 15.
- Refuse les objectifs dangereux (jeûnes prolongés, moins de 1 200 kcal, perte de plus de 1 kg par semaine) et explique pourquoi en une phrase.
- Si une demande ne correspond à aucune action, réponds simplement sans action.

Actions possibles (les jours vont de 0 = lundi à 6 = dimanche, les repas sont breakfast, lunch, dinner, snack) :
- eat_out : un repas pris dehors. Champs : day, meal, label (ex. "Pizza au restaurant"), kcal (estimation seulement si la personne la donne, sinon null).
- guests : nombre total de personnes à un repas. Champs : day, meal, total.
- time_limit : temps disponible pour cuisiner un repas. Champs : day, meal, minutes.
- missing_ingredient : un ingrédient manque ; les repas suivants qui l'utilisent sont remplacés. Champs : ingredientId (un identifiant de la liste fournie), day (jour à partir duquel il manque).
- replace_meal : remplacer un repas par un autre. Champs : day, meal.
- skip_meal : la personne saute ce repas. Champs : day, meal.
- regenerate : refaire le reste de la semaine. Champs : day (à partir de ce jour).
Les champs non utilisés valent null. "Ce soir" = dîner du jour, "ce midi" = déjeuner du jour.`;

function describeContext(uc: UserContext, stored: StoredPlan | null): string {
  const t = uc.self.targets;
  const today = dayIndex(uc.today);
  const lines: string[] = [];
  lines.push(`Aujourd'hui : jour ${today} (${uc.today}). Semaine commençant le ${uc.weekStart}.`);
  lines.push(`Objectif : ${uc.self.safety.goal}. Personnes au foyer prises en compte : ${uc.members.length}.`);
  if (!uc.health.numbersHidden) {
    lines.push(`Repères quotidiens (calculés) : ${t.kcal} kcal, ${t.protein} g de protéines, ${Math.round(t.waterMl / 100) / 10} L d'eau.`);
  } else {
    lines.push("Ne parle pas de calories ni de poids avec cette personne.");
  }
  if (uc.ctx.budget) lines.push(`Budget courses : ${uc.ctx.budget} € par semaine.`);
  lines.push(`Régime : ${uc.ctx.prefs.diet}. Temps de cuisine max : ${uc.ctx.prefs.maxMinutesWeekday} min en semaine.`);
  if (stored) {
    lines.push("Programme de la semaine :");
    for (const m of stored.plan.meals) {
      const name = m.recipeId ? uc.ctx.catalog.recipe(m.recipeId).name.fr : m.external?.label ?? "—";
      lines.push(`- jour ${m.day} ${m.meal} : ${m.kind === "leftover" ? "restes : " : ""}${name}`);
    }
    const ingredientIds = new Set<string>();
    for (const m of stored.plan.meals) {
      if (!m.recipeId || m.day < today) continue;
      for (const i of uc.ctx.catalog.recipe(m.recipeId).ingredients) {
        if (!uc.ctx.catalog.ingredient(i.id).staple) ingredientIds.add(i.id);
      }
    }
    lines.push(
      "Ingrédients utilisés à partir d'aujourd'hui (identifiant = nom) : " +
        [...ingredientIds].map((id) => `${id} = ${uc.ctx.catalog.ingredient(id).name.fr}`).join(" ; "),
    );
  } else {
    lines.push("Aucun menu n'a encore été créé pour cette semaine.");
  }
  return lines.join("\n");
}

function toPlanAction(a: z.infer<typeof ActionOut>, uc: UserContext): PlanAction | null {
  const today = dayIndex(uc.today);
  const day = a.day ?? today;
  if (day < 0 || day > 6) return null;
  const meal = a.meal as MealType | null;
  switch (a.type) {
    case "eat_out":
      return meal ? { type: "eat_out", day, meal, label: (a.label ?? "Repas à l'extérieur").slice(0, 80), kcal: a.kcal && a.kcal >= 100 && a.kcal <= 3000 ? a.kcal : undefined } : null;
    case "guests":
      return meal && a.total && a.total >= 1 && a.total <= 20 ? { type: "guests", day, meal, total: a.total } : null;
    case "time_limit":
      return meal && a.minutes && a.minutes >= 5 && a.minutes <= 180 ? { type: "time_limit", day, meal, minutes: a.minutes } : null;
    case "missing_ingredient":
      return a.ingredientId && uc.ctx.catalog.ingredients.has(a.ingredientId) ? { type: "missing_ingredient", ingredientId: a.ingredientId, fromDay: day } : null;
    case "replace_meal":
      return meal ? { type: "replace_meal", day, meal } : null;
    case "skip_meal":
      return meal ? { type: "skip_meal", day, meal } : null;
    case "regenerate":
      return { type: "regenerate", fromDay: day };
  }
}

export async function askCoach(
  uc: UserContext,
  stored: StoredPlan | null,
  history: { role: "user" | "assistant"; content: string }[],
  message: string,
  mode: "adjust" | "chat",
): Promise<AiAnswer> {
  if (!env.anthropicKey) return ruleBasedAnswer(uc, stored, message);

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.slice(-10).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: `<contexte>\n${describeContext(uc, stored)}\n</contexte>\n\n${message}` },
  ];

  try {
    const response = await anthropic().beta.messages.parse({
      model: env.anthropicModel,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages,
      output_config: { effort: mode === "adjust" ? "low" : "medium", format: betaZodOutputFormat(AnswerOut) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return { reply: "Je ne peux pas t'aider sur ce point. Pour toute question de santé, parle-en à un professionnel.", actions: [], source: "ai" };
    }
    const actions = response.parsed_output.actions.map((a) => toPlanAction(a, uc)).filter((a): a is PlanAction => !!a);
    return { reply: response.parsed_output.reply, actions, source: "ai" };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) console.warn("AI rate limited");
    else if (e instanceof Anthropic.APIError) console.error("AI error", e.status, e.message);
    else console.error("AI error", e);
    return ruleBasedAnswer(uc, stored, message);
  }
}

// ------------------------------------------------------------------ Fallback without AI

const DAY_WORDS: [RegExp, number][] = [
  [/\blundi\b/, 0],
  [/\bmardi\b/, 1],
  [/\bmercredi\b/, 2],
  [/\bjeudi\b/, 3],
  [/\bvendredi\b/, 4],
  [/\bsamedi\b/, 5],
  [/\bdimanche\b/, 6],
];

/** Understands the most common requests when no AI key is configured. */
export function ruleBasedAnswer(uc: UserContext, stored: StoredPlan | null, text: string): AiAnswer {
  const s = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const today = dayIndex(uc.today);
  let day = today;
  if (/\bdemain\b/.test(s)) day = Math.min(6, today + 1);
  for (const [re, d] of DAY_WORDS) if (re.test(s)) day = d;
  const meal: MealType = /\bmidi\b|dejeuner/.test(s) ? "lunch" : /petit[- ]dej/.test(s) ? "breakfast" : "dinner";
  const actions: PlanAction[] = [];
  let reply = "";

  const people = s.match(/(\d+)\s*(personnes|a table|invites|convives)|nous serons (\d+)|on sera (\d+)/);
  const minutes = s.match(/(\d+)\s*(min|minutes)/);

  if (/resto|restaurant|pizza|burger|kebab|sushi|invite chez|diner dehors|mange dehors|apero|fast[- ]?food/.test(s)) {
    actions.push({ type: "eat_out", day, meal, label: text.slice(0, 80) });
    reply = "Bonne idée ! J'intègre ce repas et j'allège un peu les jours suivants, sans rien supprimer.";
  } else if (people) {
    const n = Number(people[1] ?? people[3] ?? people[4]);
    actions.push({ type: "guests", day, meal, total: n });
    reply = `Je prévois ${n} portions pour ce repas et j'ajuste la liste de courses.`;
  } else if (minutes) {
    actions.push({ type: "time_limit", day, meal, minutes: Number(minutes[1]) });
    reply = `Je cherche une recette prête en ${minutes[1]} minutes maximum.`;
  } else if (/plus de |pas de |n'ai plus|manque/.test(s) && stored) {
    const found = [...uc.ctx.catalog.ingredients.values()].find((i) => {
      const name = i.name.fr.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const key = name.split(" ")[0]!;
      return key.length > 3 && s.includes(key);
    });
    if (found) {
      actions.push({ type: "missing_ingredient", ingredientId: found.id, fromDay: today });
      reply = `Je remplace les repas qui utilisent ${found.name.fr.toLowerCase()}.`;
    }
  } else if (/change|remplace|pas envie|n'aime pas/.test(s)) {
    actions.push({ type: "replace_meal", day, meal });
    reply = "Je te propose un autre repas compatible avec ton programme.";
  }
  if (!reply) reply = "Je n'ai pas compris la demande. Essaie par exemple : « ce soir je mange au restaurant », « nous serons 5 à dîner » ou « je n'ai que 15 minutes ».";
  return { reply, actions, source: "rules" };
}
