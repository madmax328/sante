/**
 * Lists the catalog texts that have no translation yet (a new recipe, a French
 * text that changed). Add them to src/i18n/<lang>.json, keyed by the French text.
 */
import { CATALOG_TEXTS, catalogTexts } from "../src/i18n";

const texts = [...new Set(catalogTexts().map((t) => t.fr))];
let missing = 0;
for (const [lang, table] of Object.entries(CATALOG_TEXTS)) {
  const already = new Set(catalogTexts().filter((t) => t.en).map((t) => t.fr));
  const todo = texts.filter((fr) => !table[fr] && !(lang === "en" && already.has(fr)));
  missing += todo.length;
  if (todo.length) console.log(`\n${lang}: ${todo.length} missing\n` + todo.map((t) => `  ${t}`).join("\n"));
}
console.log(missing ? `\n${missing} translations missing.` : `All ${texts.length} catalog texts are translated.`);
process.exitCode = missing ? 1 : 0;
