/**
 * Çeviri çıkarıcı / denetleyici (TypeScript AST).
 *
 *   npm run i18n:extract            → katalogları eşitler (eksik anahtar "" olarak eklenir, kullanılmayan silinir),
 *                                     src/i18n/generated/{areas.json,loaders.ts} üretir
 *   npm run i18n:check [yol...]     → t()/m() ile sarılmamış arayüz metinlerini listeler (yol öneki ile süzülebilir)
 *   npm run i18n:status             → dil/parça başına eksik çeviri sayısı
 *
 * Kurallar docs/i18n.md'de. Kaynak dil Türkçe; anahtar = Türkçe metin.
 */
import ts from "typescript";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export const TARGET_LOCALES = ["en", "ar", "es", "fr", "pt", "de"] as const;
export const AREAS = ["public", "auth", "fan", "studio", "admin", "support"] as const;
export const CHUNKS = ["shared", "public", "auth", "fan", "studio", "admin", "support", "server", "content"] as const;
export type Chunk = (typeof CHUNKS)[number];

const ROOT = process.cwd();
const MESSAGES_DIR = path.join("src", "i18n", "messages");
const GENERATED_DIR = path.join("src", "i18n", "generated");
const CONTENT_FILES = ["scripts/db/seed-data.ts", "scripts/db/shared.ts"];
const EXCLUDE = [/^src\/i18n\/(generated|messages)\//, /\.d\.ts$/, /^src\/app\/\(auth\)\/dev\//];

/** Kullanıcıya gösterilen hata sınıfları: ilk argümanları kendiliğinden kataloğa alınır (toActionError çevirir). */
const USER_ERRORS = new Set(["AppError", "NotFoundError", "ConflictError", "FeatureUnavailableError", "ForbiddenError", "UnauthorizedError", "SampleProfileError", "InsufficientCreditsError", "RateLimitError"]);
const TEXT_ATTRS = new Set([
  "placeholder", "title", "alt", "aria-label", "aria-description", "aria-placeholder", "aria-roledescription", "aria-valuetext",
  "label", "description", "helperText", "hint", "emptyText", "emptyTitle", "emptyDescription", "subtitle", "heading", "caption", "tooltip",
  "confirmLabel", "cancelLabel", "ctaLabel", "actionLabel", "submitLabel", "loadingText", "content", "message", "note", "text", "eyebrow",
  "badge", "legend", "summary", "body", "question", "answer", "intro", "lead", "kicker", "prefix", "suffix", "unit", "error", "success",
]);
const TEXT_KEYS = new Set([
  "label", "title", "description", "placeholder", "message", "text", "hint", "helper", "helperText", "subtitle", "summary", "body", "heading",
  "caption", "tooltip", "note", "error", "cta", "ctaLabel", "emptyTitle", "emptyText", "eyebrow", "question", "answer", "short", "desc", "intro",
  "outro", "success", "confirm", "confirmLabel", "lead", "badge", "tagline", "unit", "detail", "reason", "headline", "action", "actionLabel",
]);
const TR_CHARS = /[çğıöşüÇĞİÖŞÜâîû]/;
const LETTER = /\p{L}/u;
const IDENTIFIER_LIKE = /^[a-z0-9_.:/#@?=&%+-]*$/;
/** Büyük harfle başlayıp boşluk içeren cümle ("Ana sayfa", "Bir hata oluştu"). */
const PROSE = /^[A-ZÇĞİÖŞÜ][^\s]*\s+\S/;
/** Büyük harfle başlayan Türkçe kelime ("Aktif", "Kaydet") — yalnız .tsx dosyalarında işaretlenir. */
const CAPITAL_WORD = /^[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}/;
const STYLE_CALLS = new Set(["cn", "clsx", "twMerge", "cva"]);
const MESSAGE_CALLS = /^(toast(\.\w+)?|set\w*(Error|Message|Notice|Status|Hint|Info|Warning|Success)|alert|confirm|onError|reject)$/;

export interface Issue {
  file: string;
  line: number;
  text: string;
  kind: string;
}

interface FileInfo {
  file: string;
  isClient: boolean;
  strings: Set<string>;
  imports: string[];
  issues: Issue[];
}

const rel = (p: string) => path.relative(ROOT, p).split(path.sep).join("/");

function listFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) listFiles(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel(full));
  }
  return out;
}

function lineOf(sf: ts.SourceFile, node: ts.Node) {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

function ignored(lines: string[], line: number) {
  return (lines[line - 1] ?? "").includes("i18n-ignore") || (lines[line - 2] ?? "").includes("i18n-ignore");
}

function literalText(node: ts.Node | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function calleeName(expr: ts.LeftHandSideExpression): string | null {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text === "t" && expr.name.text === "rich") return "t.rich";
  return null;
}

function parseFile(file: string): FileInfo {
  const text = readFileSync(path.join(ROOT, file), "utf8");
  const lines = text.split(/\r?\n/);
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const info: FileInfo = { file, isClient: false, strings: new Set(), imports: [], issues: [] };
  const first = sf.statements[0];
  if (first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === "use client") info.isClient = true;

  const covered = new Set<ts.Node>();
  const issue = (node: ts.Node, kind: string, s: string) => {
    const line = lineOf(sf, node);
    if (!ignored(lines, line)) info.issues.push({ file, line, text: s.replace(/\s+/g, " ").trim().slice(0, 90), kind });
  };
  const collect = (node: ts.Node, kind: "t" | "m" | "error") => {
    const s = literalText(node);
    if (s !== null) {
      if (s.trim()) info.strings.add(s);
      covered.add(node);
      return;
    }
    if (ts.isTemplateExpression(node)) issue(node, `${kind}() içinde \${…} — ICU {değişken} + params kullanın`, node.getText(sf));
    else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken && kind !== "error") issue(node, `${kind}() içinde birleştirme — tek kalıp kullanın`, node.getText(sf));
    else if (ts.isConditionalExpression(node)) {
      collect(node.whenTrue, kind);
      collect(node.whenFalse, kind);
    }
  };

  const visit = (node: ts.Node, ctx: { inConsole: boolean; attr: string | null; key: string | null }) => {
    // içe aktarmalar
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      if (!(ts.isImportDeclaration(node) && node.importClause?.isTypeOnly)) info.imports.push(node.moduleSpecifier.text);
      return;
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const s = literalText(node.arguments[0]);
      if (s) info.imports.push(s);
    }
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) ctx = { ...ctx, attr: null, key: null };
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sf);
      if (!STYLE_CALLS.has(callee)) ctx = { ...ctx, attr: null };
      const name = calleeName(node.expression);
      if (name === "t" || name === "m" || name === "t.rich") collect(node.arguments[0]!, name === "m" ? "m" : "t");
      const isConsole = ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "console";
      if (isConsole) ctx = { ...ctx, inConsole: true };
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && USER_ERRORS.has(node.expression.text) && node.arguments?.[0]) {
      collect(node.arguments[0], "error");
    }
    // tür düzeyi metinler (literal tipler) ve nesne anahtarları denetlenmez
    if (ts.isLiteralTypeNode(node) || ts.isTypeNode(node)) return;

    if (ts.isJsxText(node)) {
      const s = node.text.replace(/\s+/g, " ").trim();
      if (s && LETTER.test(s)) issue(node, "JSX metni", s);
    } else if (ts.isJsxAttribute(node)) {
      const attr = node.name.getText(sf);
      ctx = { ...ctx, attr };
    } else if (ts.isPropertyAssignment(node)) {
      const key = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : null;
      if (node.initializer) visit(node.initializer, { ...ctx, key });
      return;
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) && !covered.has(node) && !ctx.inConsole) {
      const s = ts.isTemplateExpression(node) ? node.getText(sf).slice(1, -1) : node.text;
      const parent = node.parent;
      const isModuleLike = parent && (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isExternalModuleReference(parent));
      const isDirective = parent && ts.isExpressionStatement(parent);
      const isElementAccessKey = parent && ts.isElementAccessExpression(parent);
      const isComparison = parent && ts.isBinaryExpression(parent) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(parent.operatorToken.kind);
      const isCase = parent && ts.isCaseClause(parent);
      if (!isModuleLike && !isDirective && !isElementAccessKey && !isComparison && !isCase && LETTER.test(s)) {
        const attrIsText = ctx.attr !== null && (TEXT_ATTRS.has(ctx.attr) || TR_CHARS.test(s));
        const attrIsCode = ctx.attr !== null && !attrIsText;
        const keyIsText = ctx.key !== null && TEXT_KEYS.has(ctx.key) && !IDENTIFIER_LIKE.test(s);
        const messageArg = parent && ts.isCallExpression(parent) && MESSAGE_CALLS.test(parent.expression.getText(sf));
        const looksLikeCopy = PROSE.test(s) || (file.endsWith(".tsx") && CAPITAL_WORD.test(s));
        if (!attrIsCode && (attrIsText || keyIsText || messageArg || TR_CHARS.test(s) || looksLikeCopy)) issue(node, ctx.attr ? `özellik ${ctx.attr}` : ctx.key ? `alan ${ctx.key}` : "metin", s);
      }
    }
    ts.forEachChild(node, (child) => visit(child, ctx));
  };
  visit(sf, { inConsole: false, attr: null, key: null });
  return info;
}

/** Dosyanın çeviri parçası (kataloğun hangi dosyasında duracağı). */
export function chunkOf(file: string): Chunk {
  if (file.startsWith("scripts/")) return "content";
  const m = file.match(/^src\/(?:app\/\(([a-z]+)\)|features\/([a-z]+)|components\/([a-z]+))\//);
  const area = m?.[1] ?? m?.[2] ?? m?.[3];
  if (area && (AREAS as readonly string[]).includes(area)) return area as Chunk;
  if (area === "social") return "fan";
  if (area === "creator") return "public";
  if (/^src\/(services|models|lib)\//.test(file)) return "server";
  return "shared";
}

function resolveImport(from: string, spec: string, known: Set<string>): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith(".")) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else return null;
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) if (known.has(cand)) return cand;
  return null;
}

export function scan() {
  const files = [...listFiles(path.join(ROOT, "src")), ...CONTENT_FILES.filter((f) => existsSync(path.join(ROOT, f)))].filter((f) => !EXCLUDE.some((r) => r.test(f)));
  const infos = new Map<string, FileInfo>();
  for (const f of files) infos.set(f, parseFile(f));
  const known = new Set(infos.keys());
  const deps = new Map<string, string[]>();
  for (const [f, info] of infos) deps.set(f, info.imports.map((s) => resolveImport(f, s, known)).filter((x): x is string => Boolean(x)));

  // Parça ataması: tek parçada geçen metin o parçada, birden fazla parçada geçen "shared"da.
  const chunkSets = new Map<string, Set<Chunk>>();
  for (const info of infos.values()) for (const s of info.strings) (chunkSets.get(s) ?? chunkSets.set(s, new Set()).get(s)!).add(chunkOf(info.file));
  const byChunk = new Map<Chunk, string[]>(CHUNKS.map((c) => [c, []]));
  for (const [s, set] of chunkSets) byChunk.get(set.size === 1 ? [...set][0]! : "shared")!.push(s);
  for (const list of byChunk.values()) list.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  // İstemci alt katalogları: bölge girişlerinden erişilen "use client" dosyaları ve onların içe aktardığı her şey.
  const clientStrings = (entries: string[]) => {
    const seen = new Set<string>();
    const clientRoots: string[] = [];
    const stack = [...entries];
    while (stack.length) {
      const f = stack.pop()!;
      if (seen.has(f)) continue;
      seen.add(f);
      if (infos.get(f)?.isClient) clientRoots.push(f);
      else stack.push(...(deps.get(f) ?? []));
    }
    const bundle = new Set<string>();
    const st2 = [...clientRoots];
    while (st2.length) {
      const f = st2.pop()!;
      if (bundle.has(f)) continue;
      bundle.add(f);
      st2.push(...(deps.get(f) ?? []));
    }
    const out = new Set<string>();
    for (const f of bundle) for (const s of infos.get(f)!.strings) out.add(s);
    return out;
  };
  const rootEntries = files.filter((f) => /^src\/app\/[^/(]+\.tsx?$/.test(f));
  const root = clientStrings(rootEntries);
  const areas: Record<string, string[]> = { root: [...root].sort() };
  for (const a of AREAS) {
    const own = clientStrings(files.filter((f) => f.startsWith(`src/app/(${a})/`)));
    areas[a] = [...own].filter((s) => !root.has(s)).sort();
  }
  const issues = [...infos.values()].flatMap((i) => i.issues);
  return { byChunk, areas, issues, total: chunkSets.size };
}

function readJson(file: string): Record<string, string> {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

export function loadLocale(locale: string): Record<string, string> {
  const dir = path.join(ROOT, MESSAGES_DIR, locale);
  if (!existsSync(dir)) return {};
  return Object.assign({}, ...readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => readJson(path.join(dir, f))));
}

function writeJson(file: string, data: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function extract() {
  const { byChunk, areas, issues, total } = scan();
  for (const locale of TARGET_LOCALES) {
    const existing = loadLocale(locale);
    for (const chunk of CHUNKS) {
      const list = byChunk.get(chunk)!;
      const file = path.join(ROOT, MESSAGES_DIR, locale, `${chunk}.json`);
      writeJson(file, Object.fromEntries(list.map((s) => [s, existing[s] ?? ""])));
    }
  }
  writeJson(path.join(ROOT, GENERATED_DIR, "areas.json"), areas);
  const loaders = [
    "// Otomatik üretildi: npm run i18n:extract — elle düzenlemeyin.",
    "export const CATALOG_LOADERS: Record<string, () => Promise<Record<string, string>[]>> = {",
    ...TARGET_LOCALES.map(
      (l) => `  ${l}: () => Promise.all([${CHUNKS.map((c) => `import("../messages/${l}/${c}.json")`).join(", ")}]).then((parts) => parts.map((p) => p.default as Record<string, string>)),`,
    ),
    "};",
    "",
  ].join("\n");
  writeFileSync(path.join(ROOT, GENERATED_DIR, "loaders.ts"), loaders, "utf8");
  const sizes = Object.entries(areas).map(([k, v]) => `${k}=${v.length}`).join(" ");
  console.log(`✓ ${total} metin · parçalar: ${CHUNKS.map((c) => `${c}=${byChunk.get(c)!.length}`).join(" ")}`);
  console.log(`  istemci bölgeleri: ${sizes}`);
  if (issues.length) console.log(`  ! ${issues.length} sarılmamış metin (npm run i18n:check)`);
}

function check(prefixes: string[]) {
  const { issues } = scan();
  const list = prefixes.length ? issues.filter((i) => prefixes.some((p) => i.file.startsWith(p.replace(/\\/g, "/")))) : issues;
  const byFile = new Map<string, Issue[]>();
  for (const i of list) (byFile.get(i.file) ?? byFile.set(i.file, []).get(i.file)!).push(i);
  for (const [file, items] of [...byFile].sort()) {
    console.log(file);
    for (const i of items) console.log(`  ${i.line}: [${i.kind}] ${i.text}`);
  }
  console.log(list.length ? `\n✗ ${list.length} sarılmamış metin, ${byFile.size} dosya` : "✓ sarılmamış metin yok");
  process.exitCode = list.length ? 1 : 0;
}

function status() {
  const { byChunk } = scan();
  for (const locale of TARGET_LOCALES) {
    const cat = loadLocale(locale);
    const parts = CHUNKS.map((c) => {
      const list = byChunk.get(c)!;
      const missing = list.filter((s) => !cat[s]).length;
      return `${c}:${missing}/${list.length}`;
    });
    console.log(`${locale}  eksik → ${parts.join("  ")}`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).includes(path.join("scripts", "i18n", "extract"));
if (isMain) {
  const [cmd = "extract", ...rest] = process.argv.slice(2);
  if (cmd === "check") check(rest);
  else if (cmd === "status") status();
  else extract();
}
