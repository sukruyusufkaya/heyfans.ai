import "server-only";
import type { Types } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import { UserPreferences } from "@/models/identity";
import { ConversationMemory } from "@/models/social";

/**
 * Memory Engine — yalnız kullanıcının izin verdiği (aiMemoryEnabled) durumda ve her zaman
 * user × creator kapsamında çalışır. Bir creator'ın ikizi başka creator'ın hafızasını göremez.
 */
export async function memoryEnabledFor(userId: Types.ObjectId) {
  await connectDb();
  const prefs = await UserPreferences.findOne({ userId }, { aiMemoryEnabled: 1, personalizationConsent: 1 }).lean();
  return Boolean(prefs?.aiMemoryEnabled && prefs?.personalizationConsent);
}

export async function loadMemories(userId: Types.ObjectId, creatorId: Types.ObjectId, limit = 20) {
  await connectDb();
  const rows = await ConversationMemory.find({ userId, creatorId }).sort({ createdAt: -1 }).limit(limit).lean();
  return rows.map((r) => r.fact);
}

const EXTRACTORS: { re: RegExp; category: "preference" | "personal" | "context"; format: (m: RegExpMatchArray) => string }[] = [
  { re: /\b(?:benim adım|adım)\s+([A-ZÇĞİÖŞÜ][\p{L}]{1,20})/u, category: "personal", format: (m) => `Adı ${m[1]}` }, // i18n-ignore
  { re: /\b([\p{L} ]{3,40})\s+(?:çok\s+)?(?:severim|seviyorum|bayılırım)\b/u, category: "preference", format: (m) => `${m[1]!.trim()} seviyor` },
  { re: /\b([\p{L} ]{3,40})\s+(?:sevmem|sevmiyorum|nefret ederim)\b/u, category: "preference", format: (m) => `${m[1]!.trim()} sevmiyor` },
  { re: /\b(\d{1,2}\s+(?:ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık))\b.*\bdoğum günüm\b|\bdoğum günüm\b.*\b(\d{1,2}\s+\p{L}+)/iu, category: "personal", format: (m) => `Doğum günü ${m[1] ?? m[2]}` }, // i18n-ignore
  { re: /\b(?:([\p{L}]+)'(?:da|de|ta|te)\s+yaşıyorum)\b/u, category: "context", format: (m) => `${m[1]} şehrinde yaşıyor` }, // i18n-ignore
];

/** Hafıza kayıtları Türkçe kalıplardan çıkarılan veridir (çevrilmez; i18n-ignore işaretleri bu yüzden). Basit kural tabanlı çıkarım (LLM çağrısı yok, maliyetsiz). Kullanıcı hafızayı her zaman düzenleyebilir/silebilir. */
export async function extractAndStoreMemories(userId: Types.ObjectId, creatorId: Types.ObjectId, message: string, messageId: Types.ObjectId) {
  const facts: { fact: string; category: "preference" | "personal" | "context" }[] = [];
  for (const ex of EXTRACTORS) {
    const m = message.match(ex.re);
    if (m) facts.push({ fact: ex.format(m).slice(0, 200), category: ex.category });
  }
  if (!facts.length) return 0;
  await connectDb();
  let added = 0;
  for (const f of facts.slice(0, 3)) {
    const exists = await ConversationMemory.exists({ userId, creatorId, fact: f.fact });
    if (exists) continue;
    await ConversationMemory.create({ userId, creatorId, fact: f.fact, category: f.category, source: "auto", sourceMessageId: messageId });
    added++;
  }
  // Kapsam başına en fazla 100 kayıt — en eskiler silinir.
  const count = await ConversationMemory.countDocuments({ userId, creatorId });
  if (count > 100) {
    const old = await ConversationMemory.find({ userId, creatorId }).sort({ createdAt: 1 }).limit(count - 100).select({ _id: 1 }).lean();
    await ConversationMemory.deleteMany({ _id: { $in: old.map((o) => o._id) } });
  }
  return added;
}
