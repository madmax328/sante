import fs from "node:fs";
import path from "node:path";
const msgs = JSON.parse(fs.readFileSync("src/messages/fr.json", "utf8"));
const get = (p) => p.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), msgs);
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|mjs)$/.test(f)) files.push(p); } };
walk("src");
let missing = 0;
for (const f of files) {
  const whole = fs.readFileSync(f, "utf8");
  for (const src of whole.split(/\n(?=(?:export )?(?:default )?(?:async )?function |const \w+ = \(\{)/)) {
  const decl = /const\s+(\w+)\s*=\s*(?:await\s+)?(?:getTranslations|useTranslations)\(\s*(?:"([^"]*)"|\{[^}]*namespace:\s*"([^"]*)"[^}]*\})?\s*\)/g;
  let m;
  while ((m = decl.exec(src))) {
    const name = m[1], ns = m[2] ?? m[3] ?? "";
    const use = new RegExp(`\\b${name}(?:\\.rich)?\\(\\s*(?:"([^"]+)"|\`([^\`$]*)\\$\\{)`, "g");
    let u;
    while ((u = use.exec(src))) {
      const key = u[1] ?? u[2];
      const full = ns ? `${ns}.${key}` : key;
      const target = u[1] ? get(full) : get(full.replace(/\.$/, ""));
      if (target === undefined) { console.log(`${f}: missing ${full}`); missing++; }
    }
  }
  }
}
console.log(missing ? `${missing} missing` : "all keys present");
