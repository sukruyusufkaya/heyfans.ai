/**
 * Çeviri partisini kataloğa birleştirir.
 *
 *   node scripts/i18n/merge.mjs <dil> <parti.json> [...]
 *   node scripts/i18n/merge.mjs <dil> --todo <parça> [adet]   → o parçada çevirisi boş ilk N metni yazdırır (JSON)
 *
 * Parti: { "Türkçe kaynak": "çeviri", … }. Her anahtar ait olduğu parça dosyasına yazılır;
 * katalogda olmayan anahtarlar reddedilir (yazım farkı). Mevcut çevirinin üzerine yazar.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [locale, ...rest] = process.argv.slice(2);
const dir = path.join("src", "i18n", "messages", locale ?? "");
if (!locale || !existsSync(dir)) {
  console.error("Kullanım: node scripts/i18n/merge.mjs <en|ar|es|fr|pt|de> <parti.json>…");
  process.exit(1);
}
const chunks = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => [f, JSON.parse(readFileSync(path.join(dir, f), "utf8"))]));

if (rest[0] === "--todo") {
  const file = `${rest[1]}.json`;
  const n = Number(rest[2] ?? 200);
  const todo = Object.keys(chunks[file] ?? {}).filter((k) => !chunks[file][k]).slice(0, n);
  console.log(JSON.stringify(Object.fromEntries(todo.map((k) => [k, ""])), null, 2));
  console.error(`${todo.length} gösterildi · ${Object.values(chunks[file] ?? {}).filter((v) => !v).length} boş kaldı (${file})`);
  process.exit(0);
}

const owner = new Map();
for (const [f, data] of Object.entries(chunks)) for (const k of Object.keys(data)) owner.set(k, f);
let written = 0;
const unknown = [];
for (const batchFile of rest) {
  const batch = JSON.parse(readFileSync(batchFile, "utf8"));
  for (const [k, v] of Object.entries(batch)) {
    const f = owner.get(k);
    if (!f) {
      unknown.push(k);
      continue;
    }
    if (typeof v !== "string" || !v.trim()) continue;
    chunks[f][k] = v;
    written++;
  }
}
for (const [f, data] of Object.entries(chunks)) writeFileSync(path.join(dir, f), JSON.stringify(data, null, 2) + "\n", "utf8");
const empty = Object.fromEntries(Object.entries(chunks).map(([f, d]) => [f.replace(".json", ""), Object.values(d).filter((v) => !v).length]));
console.log(`✓ ${locale}: ${written} çeviri yazıldı · boş kalan: ${JSON.stringify(empty)}`);
if (unknown.length) {
  console.log(`✗ katalogda olmayan ${unknown.length} anahtar (birebir Türkçe metni kopyalayın):`);
  for (const k of unknown.slice(0, 15)) console.log(`  ${JSON.stringify(k.slice(0, 100))}`);
  process.exitCode = 1;
}
