import "server-only";
import { z } from "zod";
import { connectDb } from "@/lib/db/mongo";
import { AppError, NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { assertTransition, CONTENT_STATUS_LABELS, CONTENT_TRANSITIONS } from "@/lib/state-machines";
import { oid } from "@/lib/validation/common";
import { ContentItem, MediaAsset, type ContentStatus, type IContentItem } from "@/models/content";
import { CreatorProfile, type ICreatorProfile } from "@/models/creator";
import { ModerationCase } from "@/models/safety";
import { Follow } from "@/models/social";
import { notify } from "@/services/notifications/notifications";
import { m } from "@/i18n/m";

export const contentInputSchema = z
  .object({
    type: z.enum(["photo", "video", "audio", "text", "collection"]),
    title: z.string().trim().min(2, m("Başlık en az 2 karakter")).max(140),
    caption: z.string().trim().max(4000).optional().default(""),
    access: z.enum(["public", "followers", "subscribers", "purchase"]),
    minPlanTier: z.enum(["basic", "premium", "vip"]).nullable().optional(),
    priceMinor: z.number().int().min(0).max(10_000_000).nullable().optional(),
    mediaAssetIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(30).default([]),
    previewAssetId: z.string().regex(/^[a-f0-9]{24}$/i).nullable().optional(),
    categories: z.array(z.string().max(60)).max(5).default([]),
    tags: z.array(z.string().max(40)).max(15).default([]),
    isAiGenerated: z.boolean().default(false),
    scheduledAt: z.coerce.date().nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.access === "purchase" && (!v.priceMinor || v.priceMinor < 100)) ctx.addIssue({ code: "custom", path: ["priceMinor"], message: m("Satın alma için en az ₺1 fiyat girin") });
    if (v.access === "subscribers" && !v.minPlanTier) ctx.addIssue({ code: "custom", path: ["minPlanTier"], message: m("Abonelere özel içerik için plan seviyesi seçin") });
  });
export type ContentInput = z.infer<typeof contentInputSchema>;

async function ownerCreator(userId: string) {
  await connectDb();
  const creator = await CreatorProfile.findOne({ userId: oid(userId) }).lean<ICreatorProfile>();
  if (!creator) throw new NotFoundError("Creator profili bulunamadı.");
  return creator;
}

async function assertOwnedAssets(userId: string, ids: string[]) {
  if (!ids.length) return;
  const count = await MediaAsset.countDocuments({ _id: { $in: ids.map((i) => oid(i)) }, ownerId: oid(userId), status: "ready" });
  if (count !== new Set(ids).size) throw new AppError("Medya dosyalarından biri bulunamadı veya henüz hazır değil.", "asset_invalid");
}

export async function createContent(userId: string, raw: unknown, intent: "draft" | "publish") {
  const input = contentInputSchema.parse(raw);
  const creator = await ownerCreator(userId);
  await assertOwnedAssets(userId, [...input.mediaAssetIds, ...(input.previewAssetId ? [input.previewAssetId] : [])]);
  if (input.type !== "text" && !input.mediaAssetIds.length && intent === "publish") throw new AppError("Yayınlamak için en az bir medya dosyası ekleyin.", "media_required");
  // Creator onaylanmamışsa veya medya taranamadıysa içerik incelemeye düşer.
  const needsReview = creator.status !== "approved";
  const status: ContentStatus = intent === "draft" ? "draft" : needsReview ? "in_review" : "published";
  const doc = await ContentItem.create({
    creatorId: creator._id,
    type: input.type,
    title: input.title,
    caption: input.caption,
    status,
    statusHistory: [{ from: null, to: status, by: oid(userId), at: new Date() }],
    access: input.access,
    minPlanTier: input.access === "subscribers" ? input.minPlanTier : null,
    price: input.access === "purchase" ? { amountMinor: input.priceMinor!, currency: "TRY" } : null,
    mediaAssetIds: input.mediaAssetIds.map((i) => oid(i)),
    previewAssetId: input.previewAssetId ? oid(input.previewAssetId) : null,
    categories: input.categories.length ? input.categories : creator.categories,
    tags: input.tags,
    isAiGenerated: input.isAiGenerated,
    scheduledAt: input.scheduledAt ?? null,
    publishedAt: status === "published" ? new Date() : null,
    moderation: { state: status === "in_review" ? "pending" : "none" },
  });
  if (status === "published") await onPublished(creator, doc.toObject());
  return doc.toObject();
}

export async function updateContent(userId: string, contentId: string, raw: unknown) {
  const input = contentInputSchema.parse(raw);
  const creator = await ownerCreator(userId);
  const doc = await ContentItem.findOne({ _id: oid(contentId), creatorId: creator._id });
  if (!doc) throw new NotFoundError("İçerik bulunamadı.");
  if (doc.status === "removed") throw new AppError("Kaldırılmış içerik düzenlenemez.", "removed");
  await assertOwnedAssets(userId, [...input.mediaAssetIds, ...(input.previewAssetId ? [input.previewAssetId] : [])]);
  doc.set({
    type: input.type,
    title: input.title,
    caption: input.caption,
    access: input.access,
    minPlanTier: input.access === "subscribers" ? input.minPlanTier : null,
    price: input.access === "purchase" ? { amountMinor: input.priceMinor!, currency: "TRY" } : null,
    mediaAssetIds: input.mediaAssetIds.map((i) => oid(i)),
    previewAssetId: input.previewAssetId ? oid(input.previewAssetId) : null,
    categories: input.categories,
    tags: input.tags,
    isAiGenerated: input.isAiGenerated,
    scheduledAt: input.scheduledAt ?? null,
  });
  await doc.save();
  return doc.toObject();
}

/** Creator durum değişikliği (yayınla/gizle/taslağa al/kaldır). Admin "removed" kararı moderasyondan gelir. */
export async function setContentStatus(userId: string, contentId: string, to: ContentStatus) {
  const creator = await ownerCreator(userId);
  const doc = await ContentItem.findOne({ _id: oid(contentId), creatorId: creator._id });
  if (!doc) throw new NotFoundError("İçerik bulunamadı.");
  if (doc.moderation.state === "removed" && to === "published") throw new AppError("Moderasyon tarafından kaldırılan içerik yayınlanamaz.", "moderation_removed", 403);
  let target = to;
  if (to === "published" && creator.status !== "approved") target = "in_review";
  assertTransition(CONTENT_TRANSITIONS, doc.status, target, CONTENT_STATUS_LABELS);
  doc.statusHistory.push({ from: doc.status, to: target, by: oid(userId), at: new Date() });
  const wasPublished = Boolean(doc.publishedAt);
  doc.status = target;
  if (target === "published" && !doc.publishedAt) doc.publishedAt = new Date();
  await doc.save();
  if (target === "published" && !wasPublished) await onPublished(creator, doc.toObject());
  if (target === "removed") await CreatorProfile.updateOne({ _id: creator._id, "stats.posts": { $gt: 0 } }, { $inc: { "stats.posts": -1 } });
  return doc.toObject();
}

async function onPublished(creator: ICreatorProfile, content: IContentItem) {
  await CreatorProfile.updateOne({ _id: creator._id }, { $inc: { "stats.posts": 1 } });
  // Takipçilere bildirim (ilk 500; büyük kitleler için iş kuyruğu)
  const followers = await Follow.find({ creatorId: creator._id, notify: true }, { followerId: 1 }).limit(500).lean();
  for (const f of followers) {
    await notify(f.followerId.toString(), { type: "new_content", title: m("{creator} yeni içerik paylaştı"), params: { creator: creator.displayName }, body: content.title, link: `/content/${content._id.toString()}`, actorImage: creator.avatarUrl ?? null });
  }
}

/** Admin moderasyon kararıyla içerik kaldırma/gizleme. */
export async function moderateContent(actor: { id: string; adminRole: string | null }, contentId: string, action: "hide" | "remove" | "restore", reason: string, caseId?: string) {
  await connectDb();
  const doc = await ContentItem.findById(oid(contentId));
  if (!doc) throw new NotFoundError("İçerik bulunamadı.");
  const to: ContentStatus = action === "remove" ? "removed" : action === "hide" ? "hidden" : "published";
  if (doc.status !== to) {
    doc.statusHistory.push({ from: doc.status, to, by: oid(actor.id), note: reason, at: new Date() });
    doc.status = to;
  }
  doc.moderation = { state: action === "restore" ? "approved" : action === "remove" ? "removed" : "flagged", caseId: caseId ? oid(caseId) : doc.moderation.caseId };
  await doc.save();
  const creator = await CreatorProfile.findById(doc.creatorId, { userId: 1 }).lean();
  if (creator) await notify(creator.userId.toString(), { type: "moderation", title: action === "restore" ? m("İçeriğin yeniden yayında") : m("İçeriğin hakkında moderasyon kararı"), body: m("{title}: {reason}"), params: { title: doc.title, reason }, link: "/studio/content" });
  // i18n-ignore (denetim anahtarı)
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: `content.${action}`, targetType: "ContentItem", targetId: contentId, reason, severity: action === "remove" ? "critical" : "notice" });
  if (caseId) await ModerationCase.updateOne({ _id: oid(caseId) }, { $set: { status: "actioned" } });
}

export async function listCreatorContent(userId: string, opts: { status?: ContentStatus | "all"; type?: string; q?: string; page?: number; pageSize?: number } = {}) {
  const creator = await ownerCreator(userId);
  const q: Record<string, unknown> = { creatorId: creator._id };
  if (opts.status && opts.status !== "all") q.status = opts.status;
  if (opts.type && opts.type !== "all") q.type = opts.type;
  if (opts.q) q.title = { $regex: opts.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 24;
  const [items, total] = await Promise.all([
    ContentItem.find(q).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean<IContentItem[]>(),
    ContentItem.countDocuments(q),
  ]);
  return { creator, items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
