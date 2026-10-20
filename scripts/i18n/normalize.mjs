/**
 * Çeviri kataloglarını düzeltir: kaynak metnin baştaki/sondaki boşluğu çeviride aynen korunur
 * (yan yana birleştirilen metinler ayrık kalsın). Güvenli; tekrar çalıştırılabilir.
 *
 *   node scripts/i18n/normalize.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.join("src", "i18n", "messages");
let fixed = 0;
for (const locale of readdirSync(root)) {
  for (const f of readdirSync(path.join(root, locale)).filter((x) => x.endsWith(".json"))) {
    const file = path.join(root, locale, f);
    const data = JSON.parse(readFileSync(file, "utf8"));
    let changed = false;
    for (const [k, v] of Object.entries(data)) {
      if (!v) continue;
      const lead = k.match(/^\s*/)[0];
      const trail = k.match(/\s*$/)[0];
      const next = `${lead}${v.trim()}${trail}`;
      if (next !== v) {
        data[k] = next;
        changed = true;
        fixed++;
      }
    }
    if (changed) writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  }
}
console.log(`✓ ${fixed} çevirinin kenar boşluğu kaynakla eşitlendi`);
