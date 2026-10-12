import type { Locale, Localized } from "@weeko/engine";
import { DISLIKE_GROUPS } from "./dislikes";
import { exercises } from "./exercises";
import { ingredients } from "./ingredients";
import { recipes } from "./index";
import de from "./i18n/de.json";
import en from "./i18n/en.json";
import es from "./i18n/es.json";
import it from "./i18n/it.json";
import pt from "./i18n/pt.json";

/**
 * The catalog in the other languages: one table per language, from the French
 * text to its translation (src/i18n/*.json, written once, no API involved).
 * A French text that changes has no translation until its table is updated:
 * it then shows in English, or in French (see `pnpm --filter @weeko/catalog i18n`).
 */
export const CATALOG_TEXTS: Record<Exclude<Locale, "fr">, Record<string, string>> = { en, de, es, it, pt };

/** Every translatable text of the catalog. */
export function catalogTexts(): Localized[] {
  const out: Localized[] = [];
  const add = (l: Localized | undefined) => l && out.push(l);
  for (const r of recipes) {
    add(r.name);
    add(r.description);
    r.steps.forEach(add);
  }
  for (const i of ingredients) {
    add(i.name);
    add(i.plural);
  }
  for (const x of exercises) {
    add(x.name);
    x.steps.forEach(add);
    x.tips.forEach(add);
  }
  for (const g of DISLIKE_GROUPS) add(g.name);
  return out;
}

let applied = false;

/** Lays the translations over the catalog objects (once; the English already written stays). */
export function applyCatalogTranslations(): void {
  if (applied) return;
  applied = true;
  for (const text of catalogTexts()) {
    for (const [lang, table] of Object.entries(CATALOG_TEXTS) as [Exclude<Locale, "fr">, Record<string, string>][]) {
      const t = table[text.fr];
      if (t && !text[lang]) text[lang] = t;
    }
  }
}
