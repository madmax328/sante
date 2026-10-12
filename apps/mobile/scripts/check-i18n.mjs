// Checks that every French text passed to t() / tn() / plural() has its
// translation in each language table (src/i18n/*.ts), with the same {0} placeholders.
// Usage: node scripts/check-i18n.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const S = String.raw`"((?:[^"\\]|\\.)*)"`;
const files = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : /\.tsx?$/.test(f) ? [join(dir, f)] : []));
const unq = (s) => JSON.parse(`"${s}"`);
const keys = new Set();
for (const f of files("src")) {
  if (f.includes("/i18n/")) continue;
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(new RegExp(String.raw`(?<![\w.])t\(\s*` + S + String.raw`,\s*` + S, "g"))) keys.add(unq(m[1]));
  for (const m of src.matchAll(new RegExp(String.raw`(?<![\w.])(?:tn|plural)\([^;]*?\[\s*` + S + String.raw`,\s*` + S + String.raw`\s*\]`, "g"))) {
    keys.add(unq(m[1]));
    keys.add(unq(m[2]));
  }
}
const holes = (s) => (s.match(/\{\d\}/g) ?? []).sort().join();
let problems = 0;
for (const lang of ["de", "es", "it", "pt"]) {
  const text = readFileSync(`src/i18n/${lang}.ts`, "utf8");
  const table = JSON.parse(text.slice(text.indexOf("= {") + 2, text.lastIndexOf("}") + 1));
  for (const k of keys) {
    if (!(k in table)) (problems++, console.log(`${lang}: missing ${JSON.stringify(k)}`));
    else if (holes(k) !== holes(table[k])) (problems++, console.log(`${lang}: placeholders differ for ${JSON.stringify(k)}`));
  }
}
console.log(problems ? `${problems} problem(s)` : `All ${keys.size} texts are translated in de, es, it, pt.`);
process.exit(problems ? 1 : 0);
