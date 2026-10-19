import "server-only";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { connectDb } from "@/lib/db/mongo";
import { AppError, NotFoundError } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { oid } from "@/lib/validation/common";
import { Category, MediaAsset } from "@/models/content";
import { CreatorProfile } from "@/models/creator";
import { User, UserPreferences, type IUserPreferences } from "@/models/identity";
import { SupportTicket } from "@/models/platform";
import { Conversation, ConversationMemory, Favorite, Follow } from "@/models/social";
import { Subscription } from "@/models/monetization";
import { mediaUrl } from "@/services/media/media";
import { ensureUserPreferences } from "@/services/users/lifecycle";

/* ─── Profil ──────────────────────────────────────────────── */

export async function getProfilePage(userId: string) {
  await connectDb();
  const uid = oid(userId);
  const [user, prefs, following, favoriteCreators, favoriteContents, activeSubs, categories] = await Promise.all([
    User.findById(uid, { name: 1, email: 1, username: 1, image: 1, createdAt: 1, roles: 1, emailVerified: 1 }).lean(),
    ensureUserPreferences(userId),
    Follow.countDocuments({ followerId: uid }),
    Favorite.countDocuments({ userId: uid, targetType: "creator" }),
    Favorite.countDocuments({ userId: uid, targetType: "content" }),
    Subscription.countDocuments({ userId: uid, status: { $in: ["active", "past_due"] }, currentPeriodEnd: { $gt: new Date() } }),
    Category.find({ isActive: true, parentSlug: null }, { slug: 1, name: 1 }).sort({ order: 1 }).lean(),
  ]);
  if (!user) throw new NotFoundError("Kullanıcı bulunamadı.");
  return {
    user: {
      name: user.name,
      email: user.email,
      username: user.username ?? null,
      image: user.image ?? null,
      createdAt: new Date(user.createdAt).toISOString(),
      isCreator: (user.roles ?? []).includes("creator"),
      emailVerified: Boolean(user.emailVerified),
    },
    interests: prefs?.interests ?? [],
    categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
    stats: { following, favorites: favoriteCreators + favoriteContents, activeSubs },
  };
}

const nameSchema = z.string().trim().min(2, "Ad en az 2 karakter olmalı").max(120, "Ad en fazla 120 karakter olabilir");

export async function updateProfileName(userId: string, name: unknown) {
  const value = nameSchema.parse(name);
  await connectDb();
  await User.updateOne({ _id: oid(userId) }, { $set: { name: value } });
  return { name: value };
}

/** Avatar: yalnız kullanıcının kendi yüklediği, hazır ve herkese açık "avatar" varlığı kabul edilir. */
export async function setUserAvatar(userId: string, assetId: string) {
  await connectDb();
  const asset = await MediaAsset.findOne({ _id: oid(assetId), ownerId: oid(userId), purpose: "avatar", status: "ready", kind: "image" });
  if (!asset) throw new AppError("Yüklenen görsel bulunamadı veya geçersiz.", "asset_invalid");
  const url = await mediaUrl(asset);
  await User.updateOne({ _id: oid(userId) }, { $set: { image: url } });
  return { image: url };
}

export async function removeUserAvatar(userId: string) {
  await connectDb();
  await User.updateOne({ _id: oid(userId) }, { $set: { image: null } });
}

/* ─── Tercihler ───────────────────────────────────────────── */

export const preferencesPatchSchema = z
  .object({
    personalizationConsent: z.boolean(),
    aiMemoryEnabled: z.boolean(),
    recommendationsEnabled: z.boolean(),
    marketingConsent: z.boolean(),
    interests: z.array(z.string().regex(/^[a-z0-9-]{2,60}$/)).max(12, "En fazla 12 ilgi alanı seçebilirsin"),
    notifications: z
      .object({ email: z.boolean(), push: z.boolean(), newContent: z.boolean(), messages: z.boolean(), promotions: z.boolean() })
      .partial(),
  })
  .partial();
export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;

export async function getPreferences(userId: string) {
  const prefs = (await ensureUserPreferences(userId)) as IUserPreferences | null;
  return {
    interests: prefs?.interests ?? [],
    recommendationsEnabled: prefs?.recommendationsEnabled ?? true,
    personalizationConsent: prefs?.personalizationConsent ?? false,
    aiMemoryEnabled: prefs?.aiMemoryEnabled ?? false,
    marketingConsent: prefs?.marketingConsent ?? false,
    notifications: {
      email: prefs?.notifications?.email ?? true,
      push: prefs?.notifications?.push ?? false,
      newContent: prefs?.notifications?.newContent ?? true,
      messages: prefs?.notifications?.messages ?? true,
      promotions: prefs?.notifications?.promotions ?? false,
    },
  };
}

/**
 * Tercih güncelleme. AI hafızası yalnız kişiselleştirme izniyle çalışır: izin kapanırsa hafıza da kapanır.
 * Hafıza açılıp kapandığında açık konuşmaların bayrağı da eşitlenir (aksi halde eski konuşmalar hafızayı kullanamaz).
 */
export async function updatePreferences(userId: string, raw: unknown) {
  const patch = preferencesPatchSchema.parse(raw);
  await connectDb();
  const uid = oid(userId);
  const current = await getPreferences(userId);
  const set: Record<string, unknown> = {};
  for (const key of ["personalizationConsent", "aiMemoryEnabled", "recommendationsEnabled", "marketingConsent"] as const) {
    if (patch[key] !== undefined) set[key] = patch[key];
  }
  if (patch.interests) {
    const valid = await Category.find({ slug: { $in: patch.interests }, isActive: true }, { slug: 1 }).lean();
    set.interests = patch.interests.filter((s) => valid.some((v) => v.slug === s));
  }
  if (patch.notifications) {
    for (const [k, v] of Object.entries(patch.notifications)) if (v !== undefined) set[`notifications.${k}`] = v;
  }
  if (set.personalizationConsent === false) set.aiMemoryEnabled = false;
  if (set.aiMemoryEnabled === true && !(set.personalizationConsent ?? current.personalizationConsent)) {
    throw new AppError("AI hafızasını açmak için önce kişiselleştirme iznini vermelisin.", "consent_required");
  }
  if (!Object.keys(set).length) return getPreferences(userId);
  await UserPreferences.updateOne({ userId: uid }, { $set: set }, { upsert: true });
  if (typeof set.aiMemoryEnabled === "boolean") {
    await Conversation.updateMany({ userId: uid, kind: "fan", status: { $in: ["active", "archived"] } }, { $set: { memoryEnabled: set.aiMemoryEnabled } });
  }
  return getPreferences(userId);
}

/* ─── AI hafızası (user × creator kapsamlı) ───────────────── */

export interface MemoryGroup {
  creator: { id: string; username: string | null; displayName: string; avatarUrl: string | null };
  memories: { id: string; fact: string; category: string; source: "auto" | "user"; createdAt: string }[];
}

export async function listMemoryGroups(userId: string): Promise<{ groups: MemoryGroup[]; total: number }> {
  await connectDb();
  const rows = await ConversationMemory.find({ userId: oid(userId) }).sort({ createdAt: -1 }).limit(500).lean();
  const creators = await CreatorProfile.find({ _id: { $in: [...new Set(rows.map((r) => r.creatorId.toString()))].map((i) => oid(i)) } }, { username: 1, displayName: 1, avatarUrl: 1 }).lean();
  const map = new Map(creators.map((c) => [c._id.toString(), c]));
  const groups = new Map<string, MemoryGroup>();
  for (const r of rows) {
    const key = r.creatorId.toString();
    let g = groups.get(key);
    if (!g) {
      const c = map.get(key);
      g = { creator: { id: key, username: c?.username ?? null, displayName: c?.displayName ?? "Kaldırılmış içerik üreticisi", avatarUrl: c?.avatarUrl ?? null }, memories: [] };
      groups.set(key, g);
    }
    g.memories.push({ id: r._id.toString(), fact: r.fact, category: r.category, source: r.source, createdAt: new Date(r.createdAt).toISOString() });
  }
  return { groups: [...groups.values()], total: rows.length };
}

const factSchema = z.string().trim().min(2, "Bilgi en az 2 karakter olmalı").max(300, "Bilgi en fazla 300 karakter olabilir");

export async function updateMemoryFact(userId: string, memoryId: string, fact: unknown) {
  const value = factSchema.parse(fact);
  await connectDb();
  const res = await ConversationMemory.updateOne({ _id: oid(memoryId), userId: oid(userId) }, { $set: { fact: value, source: "user" } });
  if (!res.matchedCount) throw new NotFoundError("Hafıza kaydı bulunamadı.");
}

export async function deleteMemory(userId: string, memoryId: string) {
  await connectDb();
  await ConversationMemory.deleteOne({ _id: oid(memoryId), userId: oid(userId) });
}

export async function deleteCreatorMemories(userId: string, creatorId: string) {
  await connectDb();
  const res = await ConversationMemory.deleteMany({ userId: oid(userId), creatorId: oid(creatorId) });
  return res.deletedCount ?? 0;
}

export async function deleteAllMemories(userId: string) {
  await connectDb();
  const res = await ConversationMemory.deleteMany({ userId: oid(userId) });
  return res.deletedCount ?? 0;
}

/* ─── Hesap talepleri (destek kaydı; anında silme/indirme yok) ─ */

const REQUEST_KINDS = {
  delete_account: { subject: "Hesap silme talebi", message: "Kullanıcı, hesabının ve ilişkili kişisel verilerinin silinmesini talep ediyor. Yasal saklama yükümlülükleri (ör. finansal kayıtlar) kapsamındaki veriler dışındakiler silinmelidir.", priority: "high" as const },
  export_data: { subject: "Kişisel veri kopyası talebi", message: "Kullanıcı, KVKK/GDPR kapsamında hesabına ait kişisel verilerin bir kopyasını talep ediyor.", priority: "normal" as const },
};

/** "Hesabımı sil" / "verilerimi indir": SupportTicket (kategori: account) açar — işlem destek ekibince yürütülür. */
export async function createAccountRequest(user: { id: string; name: string; email: string }, kind: keyof typeof REQUEST_KINDS) {
  await connectDb();
  await rateLimit("account_request", user.id, 3, 24 * 3600);
  const def = REQUEST_KINDS[kind];
  const open = await SupportTicket.findOne({ userId: oid(user.id), category: "account", subject: def.subject, status: { $in: ["open", "pending"] } }).lean();
  if (open) return { ticketNo: open.ticketNo, existing: true };
  const doc = await SupportTicket.create({
    ticketNo: `DST-${Date.now().toString(36).toUpperCase().slice(-4)}${randomInt(1000, 9999)}`,
    userId: oid(user.id),
    name: user.name,
    email: user.email,
    category: "account",
    subject: def.subject,
    message: def.message,
    priority: def.priority,
    status: "open",
  });
  return { ticketNo: doc.ticketNo, existing: false };
}

export async function listAccountRequests(userId: string) {
  await connectDb();
  const rows = await SupportTicket.find({ userId: oid(userId), category: "account", subject: { $in: Object.values(REQUEST_KINDS).map((k) => k.subject) } })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  return rows.map((t) => ({ ticketNo: t.ticketNo, subject: t.subject, status: t.status, createdAt: new Date(t.createdAt).toISOString() }));
}
