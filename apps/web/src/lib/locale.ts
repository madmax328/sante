import "server-only";
import { headers } from "next/headers";

export type Locale = "fr" | "en";

/** "en", "en-GB,en;q=0.9"… → "en"; anything else → French (the default language). */
export function localeFromHeader(value: string | null | undefined): Locale {
  return value?.trim().toLowerCase().startsWith("en") ? "en" : "fr";
}

/**
 * Language of the current request: the website's language (from the URL,
 * set by next-intl) or, for the app's API, the phone's language that the
 * app sends in Accept-Language.
 */
export async function requestLocale(): Promise<Locale> {
  const h = await headers();
  const site = h.get("x-next-intl-locale");
  if (site) return site === "en" ? "en" : "fr";
  return localeFromHeader(h.get("accept-language"));
}

/** A catalog text in the language (French when there is no translation). */
export function tr(text: { fr: string; en?: string }, locale: Locale): string;
export function tr(text: { fr: string; en?: string } | undefined, locale: Locale): string | undefined;
export function tr(text: { fr: string; en?: string } | undefined, locale: Locale): string | undefined {
  return text ? (text[locale] ?? text.fr) : undefined;
}

/** For Intl in server code. */
export const intlLocale = (locale: Locale) => (locale === "en" ? "en-GB" : "fr-FR");

/** The app's language, sent with each API request. */
export const localeOf = (req: Request): Locale => localeFromHeader(req.headers.get("accept-language"));
