/**
 * Sağdan sola (Arapça) uyumu: fiziksel yön sınıflarını mantıksal karşılıklarına çevirir (LTR'de görünüm değişmez).
 *   ml/mr → ms/me · pl/pr → ps/pe · left/right → start/end · text-left/right → text-start/end
 *   rounded-l/r/tl/tr/bl/br → rounded-s/e/ss/se/es/ee · border-l/r → border-s/e · float/clear-left/right → start/end
 * Ortalama kalıbı (`left-1/2 -translate-x-1/2`) simetrik olduğu için o satırlarda left/right dokunulmaz.
 * Yön bildiren ikonlara (ok, chevron) `rtl:-scale-x-100` eklenir.
 *
 *   node scripts/i18n/rtl-codemod.mjs [--dry]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const dry = process.argv.includes("--dry");
const files = [];
(function walk(dir) {
  for (const n of readdirSync(dir)) {
    const f = path.join(dir, n);
    if (statSync(f).isDirectory()) walk(f);
    else if (/\.(tsx|ts)$/.test(n) && !f.includes(`${path.sep}i18n${path.sep}generated`)) files.push(f);
  }
})("src");

// Belirteç başı: boşluk, tırnak, ters tırnak, parantez veya varyant iki noktası; ardından isteğe bağlı ! ve - öneki.
const B = String.raw`(^|[\s"'\`{(:])(!?)(-?)`;
const END = String.raw`(?=[\s"'\`)}!]|$)`;
const rules = [
  [new RegExp(`${B}m([lr])-(\\S+?)${END}`, "g"), (_, a, i, n, s, v) => `${a}${i}${n}m${s === "l" ? "s" : "e"}-${v}`],
  [new RegExp(`${B}p([lr])-(\\S+?)${END}`, "g"), (_, a, i, n, s, v) => `${a}${i}${n}p${s === "l" ? "s" : "e"}-${v}`],
  [new RegExp(`${B}scroll-([mp])([lr])-(\\S+?)${END}`, "g"), (_, a, i, n, k, s, v) => `${a}${i}${n}scroll-${k}${s === "l" ? "s" : "e"}-${v}`],
  [new RegExp(`${B}text-(left|right)${END}`, "g"), (_, a, i, n, s) => `${a}${i}${n}text-${s === "left" ? "start" : "end"}`],
  [new RegExp(`${B}(float|clear)-(left|right)${END}`, "g"), (_, a, i, n, k, s) => `${a}${i}${n}${k}-${s === "left" ? "start" : "end"}`],
  [new RegExp(`${B}rounded-(tl|tr|bl|br)(-\\S+?)?${END}`, "g"), (_, a, i, n, c, v = "") => `${a}${i}${n}rounded-${{ tl: "ss", tr: "se", bl: "es", br: "ee" }[c]}${v}`],
  [new RegExp(`${B}rounded-([lr])(-\\S+?)?${END}`, "g"), (_, a, i, n, s, v = "") => `${a}${i}${n}rounded-${s === "l" ? "s" : "e"}${v}`],
  [new RegExp(`${B}border-([lr])(-\\S+?)?${END}`, "g"), (_, a, i, n, s, v = "") => `${a}${i}${n}border-${s === "l" ? "s" : "e"}${v}`],
];
const insetRule = [new RegExp(`${B}(left|right)-(\\S+?)${END}`, "g"), (_, a, i, n, s, v) => `${a}${i}${n}${s === "left" ? "start" : "end"}-${v}`];

const DIRECTIONAL_ICONS = ["ChevronRight", "ChevronLeft", "ChevronsRight", "ChevronsLeft", "ArrowRight", "ArrowLeft", "ArrowUpRight", "ArrowUpLeft", "ArrowDownRight", "ArrowDownLeft", "MoveRight", "MoveLeft", "CornerDownRight", "CornerDownLeft", "Undo2", "Redo2", "Send", "SendHorizontal", "LogOut", "LogIn", "Reply", "Forward", "ArrowRightLeft", "ChevronFirst", "ChevronLast", "PanelLeft", "PanelRight"];
const iconRe = new RegExp(`<(${DIRECTIONAL_ICONS.join("|")})(\\s[^<>]*?)?(\\/?)>`, "g");
const FLIP = "rtl:-scale-x-100";

let changedFiles = 0;
let classEdits = 0;
let iconEdits = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const out = src
    .split("\n")
    .map((line) => {
      let l = line;
      if (/^\s*(import|export \* from|\/\/|\*|\/\*)/.test(l)) return l;
      for (const [re, fn] of rules) l = l.replace(re, (...m) => (classEdits++, fn(...m)));
      if (!/translate-x/.test(l)) l = l.replace(insetRule[0], (...m) => (classEdits++, insetRule[1](...m)));
      l = l.replace(iconRe, (whole, name, attrs = "", selfClose) => {
        if (whole.includes(FLIP)) return whole;
        iconEdits++;
        if (/className="/.test(attrs)) return `<${name}${attrs.replace(/className="/, `className="${FLIP} `)}${selfClose}>`;
        if (/className=\{cn\(\s*"/.test(attrs)) return `<${name}${attrs.replace(/className=\{cn\(\s*"/, `className={cn("${FLIP} `)}${selfClose}>`;
        if (/className=\{`/.test(attrs)) return `<${name}${attrs.replace(/className=\{`/, `className={\`${FLIP} `)}${selfClose}>`;
        if (/className=/.test(attrs)) {
          iconEdits--;
          console.warn(`! elle bakın (dinamik className): ${f}: <${name}`);
          return whole;
        }
        return `<${name} className="${FLIP}"${attrs}${selfClose}>`;
      });
      return l;
    })
    .join("\n");
  if (out !== src) {
    changedFiles++;
    if (!dry) writeFileSync(f, out, "utf8");
  }
}
console.log(`${dry ? "(deneme) " : ""}${changedFiles} dosya · ${classEdits} sınıf · ${iconEdits} ikon`);
