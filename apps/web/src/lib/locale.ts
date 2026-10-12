import "server-only";
import { headers } from "next/headers";
import { LOCALES, type Locale } from "@weeko/engine";
import { ensureCatalogTranslations } from "./catalog-i18n";

export { LOCALES, type Locale };

export const isLocale = (v: string | null | undefined): v is Locale => !!v && (LOCALES as readonly string[]).includes(v);

/**
 * "pt-BR,pt;q=0.9,en;q=0.8" → "pt": the first supported language of the
 * header; English when none is supported (read by more people than French);
 * French when there is no header at all.
 */
export function localeFromHeader(value: string | null | undefined): Locale {
  if (!value?.trim()) return "fr";
  for (const part of value.split(",")) {
    const code = part.split(";")[0]!.trim().toLowerCase().split("-")[0];
    if (isLocale(code)) return code;
  }
  return "en";
}

/**
 * Language of the current request: the website's language (from the URL,
 * set by next-intl) or, for the app's API, the phone's language that the
 * app sends in Accept-Language.
 */
export async function requestLocale(): Promise<Locale> {
  const h = await headers();
  const site = h.get("x-next-intl-locale");
  const locale = isLocale(site) ? site : localeFromHeader(h.get("accept-language"));
  await ensureCatalogTranslations(locale);
  return locale;
}

type Text = { fr: string } & Partial<Record<Locale, string>>;

/** A catalog text in the language, else in English, else in French. */
export function tr(text: Text, locale: Locale): string;
export function tr(text: Text | undefined, locale: Locale): string | undefined;
export function tr(text: Text | undefined, locale: Locale): string | undefined {
  return text ? (text[locale] ?? (locale === "fr" ? undefined : text.en) ?? text.fr) : undefined;
}

const INTL: Record<Locale, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", es: "es-ES", it: "it-IT", pt: "pt-BR" };

/** For Intl in server code. */
export const intlLocale = (locale: Locale) => INTL[locale];

/** The language's name, in French (for the instructions given to the AI). */
export const LANGUAGE_NAME: Record<Locale, string> = { fr: "français", en: "anglais", de: "allemand", es: "espagnol", it: "italien", pt: "portugais du Brésil" };

/** The app's language, sent with each API request. */
export const localeOf = (req: Request): Locale => localeFromHeader(req.headers.get("accept-language"));

/** A few words the server writes itself (outside the website's message files). */
const WORDS = {
  warmup: { fr: "Échauffement", en: "Warm-up", de: "Aufwärmen", es: "Calentamiento", it: "Riscaldamento", pt: "Aquecimento" },
  serving: { fr: "portion", en: "serving", de: "Portion", es: "ración", it: "porzione", pt: "porção" },
  servings: { fr: "portions", en: "servings", de: "Portionen", es: "raciones", it: "porzioni", pt: "porções" },
  piece: { fr: "pièce", en: "piece", de: "Stück", es: "pieza", it: "pezzo", pt: "unidade" },
  pieces: { fr: "pièces", en: "pieces", de: "Stück", es: "piezas", it: "pezzi", pt: "unidades" },
} satisfies Record<string, Record<Locale, string>>;

export const word = (key: keyof typeof WORDS, locale: Locale) => WORDS[key][locale];

/** The word typed to confirm an account deletion, in each language (all accepted). */
export const DELETE_WORDS = ["SUPPRIMER", "DELETE", "LÖSCHEN", "ELIMINAR", "ELIMINA", "EXCLUIR"];
