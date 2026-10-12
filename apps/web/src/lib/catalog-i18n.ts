import "server-only";
import { applyCatalogTranslations, CATALOG_TEXTS, catalogTexts } from "@weeko/catalog/i18n";

/**
 * The catalog (recipes, ingredients, exercises, food groups) in the other
 * languages. The translations are files of the catalog package
 * (packages/catalog/src/i18n), laid over the catalog once when the server starts.
 */
applyCatalogTranslations();

/** Share of the catalog texts translated, per language (admin page). */
export function translationCoverage(): { lang: string; done: number; total: number }[] {
  const texts = catalogTexts();
  return Object.entries(CATALOG_TEXTS).map(([lang, table]) => ({
    lang,
    total: texts.length,
    done: texts.filter((t) => table[t.fr] || (lang === "en" && t.en)).length,
  }));
}
