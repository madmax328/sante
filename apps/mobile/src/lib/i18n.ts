import { getLocales } from "expo-localization";

export type Lang = "fr" | "en";

/**
 * The phone's language: French when it is set to French, English otherwise
 * (the app exists in these two languages, like the website). iOS also lets
 * people pick a language for the app alone (Settings › Sorloo › Language).
 */
function detect(): Lang {
  try {
    const code = getLocales()[0]?.languageCode;
    return !code || code === "fr" ? "fr" : "en";
  } catch {
    return "fr";
  }
}

export const lang: Lang = detect();

/** For Intl (numbers, dates): French formats in French, British-style in English (euros, 24 h). */
export const intlLocale = lang === "fr" ? "fr-FR" : "en-GB";

/** The text in the app's language: t("Ajouter", "Add"). */
export function t(fr: string, en: string): string {
  return lang === "en" ? en : fr;
}

/** "1 portion" / "2 portions": t-plural with the count. */
export function plural(n: number, fr: [string, string], en: [string, string]): string {
  const [one, many] = lang === "en" ? en : fr;
  return lang === "en" ? (n === 1 ? one : many) : n < 2 ? one : many;
}
