import { describe, expect, it } from "vitest";
import { CATALOG_TEXTS, applyCatalogTranslations, catalogTexts } from "../src/i18n";
import { recipes } from "../src/index";

describe("catalog translations", () => {
  it("cover every text in every language", () => {
    const texts = catalogTexts();
    for (const [lang, table] of Object.entries(CATALOG_TEXTS)) {
      const missing = texts.filter((t) => !table[t.fr] && !(lang === "en" && t.en)).map((t) => t.fr);
      expect(missing, lang).toEqual([]);
    }
  });

  it("keep the numbers of the French text", () => {
    const nums = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", ".")).sort().join(" ");
    for (const t of catalogTexts()) {
      for (const [lang, table] of Object.entries(CATALOG_TEXTS)) {
        const tr = table[t.fr];
        // "2 fois son volume" may become "twice its volume"
        if (tr && !/fois/.test(t.fr)) expect(nums(tr), `${lang}: ${t.fr}`).toBe(nums(t.fr));
      }
    }
  });

  it("are laid over the catalog", () => {
    applyCatalogTranslations();
    const r = recipes.find((x) => x.name.fr === "Porridge à la banane")!;
    expect(r.name.pt).toBe("Mingau de aveia com banana");
    expect(r.name.en).toBe("Banana porridge");
    expect(r.steps.every((s) => s.de && s.es && s.it)).toBe(true);
  });
});
