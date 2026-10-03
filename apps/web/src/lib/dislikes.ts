import "server-only";
import { DISLIKE_GROUPS, getCatalog } from "@weeko/catalog";
import { t as tr, type Locale } from "@weeko/engine";

export interface DislikeOptions {
  groups: { id: string; label: string; ingredients: string[] }[];
  ingredients: { id: string; label: string }[];
}

/** Choices for the "foods I don't eat" picker, small enough to send to the browser. */
export function dislikeOptions(locale: string): DislikeOptions {
  const loc = (locale === "en" ? "en" : "fr") as Locale;
  const catalog = getCatalog();
  return {
    groups: DISLIKE_GROUPS.map((g) => ({ id: g.id, label: tr(g.name, loc), ingredients: g.ingredients })),
    ingredients: [...catalog.ingredients.values()]
      .filter((i) => !i.staple || i.omittable)
      .map((i) => ({ id: i.id, label: tr(i.name, loc) }))
      .sort((a, b) => a.label.localeCompare(b.label, loc)),
  };
}

/** Keeps only real catalog ingredients (form input is untrusted). */
export function cleanDislikes(ids: string[]): string[] {
  const catalog = getCatalog();
  return [...new Set(ids)].filter((id) => catalog.ingredients.has(id)).slice(0, 150);
}
