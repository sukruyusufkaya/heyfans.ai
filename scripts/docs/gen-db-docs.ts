/**
 * Mongoose şemalarından docs/database.md üretir (alanlar, tipler, zorunluluk, enum, indeksler).
 *   npx tsx --conditions=react-server scripts/docs/gen-db-docs.ts
 */
import { writeFileSync } from "node:fs";
import mongoose, { type Schema } from "mongoose";
import "@/models";

const DOMAINS: Record<string, string[]> = {
  "Kimlik ve hesap": ["users", "userPreferences", "ageVerificationRecords"],
  Creator: ["creatorProfiles", "creatorApplications", "creatorVerificationRequests", "creatorConsents"],
  "AI ikizi": ["aiTwins", "aiTwinVersions", "knowledgeSources", "knowledgeChunks", "ingestionJobs", "aiUsageRecords"],
  "İçerik ve medya": ["categories", "mediaAssets", "contentItems", "contentAccessGrants"],
  "Sosyal etkileşim": ["follows", "favorites", "conversations", "messages", "conversationMemories", "notifications", "callSessions"],
  Monetizasyon: ["membershipPlans", "subscriptions", "wallets", "walletLedger", "paymentTransactions", "paymentWebhookEvents", "refunds", "creatorEarnings", "payoutAccounts", "payoutRequests", "giftCatalog", "gifts", "customRequests"],
  Güvenlik: ["moderationCases", "reports", "appeals", "auditLogs"],
  "Platform yönetimi": ["cmsPages", "homepageSections", "campaigns", "platformSettings", "supportTickets", "helpArticles", "cookieConsents", "newsletterSubscriptions", "analyticsEvents", "rateLimits", "devOutbox"],
};

function describePath(schema: Schema, prefix = ""): string[] {
  const rows: string[] = [];
  schema.eachPath((p, type) => {
    if (p === "__v") return;
    const t = type as unknown as { instance: string; options: Record<string, unknown>; schema?: Schema; caster?: { instance?: string } };
    const opts = t.options ?? {};
    const enumVals = (opts.enum as unknown[] | undefined)?.filter((v) => v !== null);
    const req = opts.required ? "✓" : "";
    let typeName = t.instance;
    if (typeName === "Array") typeName = `[${t.caster?.instance ?? (t.schema ? "Belge" : "Mixed")}]`;
    const ref = opts.ref ? ` → ${String(opts.ref)}` : "";
    rows.push(`| \`${prefix}${p}\` | ${typeName}${ref} | ${req} | ${enumVals?.length ? enumVals.map((e) => `\`${String(e)}\``).join(", ") : ""} |`);
    if (t.schema && typeName.startsWith("[")) rows.push(...describePath(t.schema, `${prefix}${p}[].`));
  });
  return rows;
}

const out: string[] = [
  "# Veritabanı Şeması",
  "",
  "> Bu dosya `scripts/docs/gen-db-docs.ts` ile Mongoose şemalarından üretilir. Elle düzenlemeyin.",
  "",
  "Genel kurallar: tüm belgelerde `createdAt/updatedAt`; para alanları `{ amountMinor (kuruş, tamsayı), currency }`; `isDemo` seed verisini işaretler; `walletLedger`, `creatorEarnings` ve `auditLogs` **değişmezdir** (güncelleme/silme şema kancasıyla engellenir, düzeltme ters kayıtla); durum alanlarının geçişleri `src/lib/state-machines.ts` ve servislerde denetlenir; yetki gereksinimleri `docs/api.md` ve servis katmanında.",
  "",
];
const models = Object.values(mongoose.models);
const byCollection = new Map(models.map((m) => [m.collection.collectionName, m]));
for (const [domain, cols] of Object.entries(DOMAINS)) {
  out.push(`## ${domain}`, "");
  for (const col of cols) {
    const model = byCollection.get(col);
    if (!model) continue;
    out.push(`### \`${col}\` (${model.modelName})`, "", "| Alan | Tip | Zorunlu | Değerler |", "|---|---|---|---|", ...describePath(model.schema), "");
    const idx = model.schema.indexes();
    if (idx.length) {
      out.push("İndeksler:", "");
      for (const [fields, opts] of idx) {
        const flags = [opts?.unique ? "tekil" : "", opts?.partialFilterExpression ? "kısmi" : "", opts?.expireAfterSeconds != null ? `TTL ${opts.expireAfterSeconds}s` : ""].filter(Boolean).join(", ");
        out.push(`- \`${JSON.stringify(fields)}\`${flags ? ` (${flags})` : ""}`);
      }
      out.push("");
    }
  }
}
writeFileSync("docs/database.md", out.join("\n"), "utf8");
console.log(`docs/database.md yazıldı (${models.length} model)`);
process.exit(0);
