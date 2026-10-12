import { getLocales } from "expo-localization";
import { de } from "@/i18n/de";
import { es } from "@/i18n/es";
import { it } from "@/i18n/it";
import { pt } from "@/i18n/pt";

export const LANGS = ["fr", "en", "de", "es", "it", "pt"] as const;
export type Lang = (typeof LANGS)[number];

/**
 * The phone's language when the app speaks it, English otherwise (read by
 * more people than French). iOS also lets people pick a language for the app
 * alone (Settings › Sorloo › Language).
 */
function detect(): Lang {
  try {
    const code = getLocales()[0]?.languageCode;
    if (!code) return "fr";
    return (LANGS as readonly string[]).includes(code) ? (code as Lang) : "en";
  } catch {
    return "fr";
  }
}

export const lang: Lang = detect();

const INTL: Record<Lang, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", es: "es-ES", it: "it-IT", pt: "pt-BR" };

/** For Intl (numbers, dates, euros). */
export const intlLocale = INTL[lang];

/** Translations of the French texts, one table per language (English is written inline). */
const DICT: Partial<Record<Lang, Record<string, string>>> = { de, es, it, pt };

const fill = (text: string, params?: readonly unknown[]) => (params ? text.replace(/\{(\d+)\}/g, (m, i: string) => (params[Number(i)] === undefined ? m : String(params[Number(i)]))) : text);

/**
 * The text in the app's language: t("Ajouter", "Add"), or with values:
 * t("Étape {0} sur {1}", "Step {0} of {1}", [2, 7]). The French text is the
 * key of the other languages' tables; English is the fallback.
 */
export function t(fr: string, en: string, params?: readonly unknown[]): string {
  const text = lang === "fr" ? fr : lang === "en" ? en : (DICT[lang]?.[fr] ?? en);
  return fill(text, params);
}

/** Singular or plural form (French: 0 and 1 are singular; the other languages: only 1). */
const one = (n: number) => (lang === "fr" ? n < 2 : n === 1);

/** A sentence with a count, {0} being the number: tn(3, ["{0} jour", "{0} jours"], ["{0} day", "{0} days"]). */
export function tn(n: number, fr: [string, string], en: [string, string], params: readonly unknown[] = []): string {
  const i = one(n) ? 0 : 1;
  return t(fr[i], en[i], [n, ...params]);
}

/** Just the word: plural(2, ["portion", "portions"], ["serving", "servings"]). */
export function plural(n: number, fr: [string, string], en: [string, string]): string {
  const i = one(n) ? 0 : 1;
  return t(fr[i], en[i]);
}
