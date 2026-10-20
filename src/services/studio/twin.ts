import "server-only";
import { AppError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { assertTransition, TWIN_STATUS_LABELS, TWIN_TRANSITIONS } from "@/lib/state-machines";
import { AiTwin, AiTwinVersion, KnowledgeChunk, KnowledgeSource, type ITwin, type ITwinVersion } from "@/models/ai";
import { CreatorConsent, type ConsentKind, type ICreatorConsent, type ICreatorProfile } from "@/models/creator";
import { MediaAsset, type IMediaAsset } from "@/models/content";
import { Conversation } from "@/models/social";
import { activeConsents, getOrCreateTwin } from "@/services/ai-twins/lifecycle";
import { mediaUrl } from "@/services/media/media";
import { getPlatformSettings } from "@/services/platform/settings";
import { getT } from "@/i18n/server";

export interface TwinContext {
  creator: ICreatorProfile;
  twin: ITwin;
  consents: ConsentKind[];
  consentRows: Pick<ICreatorConsent, "kind" | "grantedAt" | "textVersion">[];
  identityVerified: boolean;
}

/** Studio AI sayfalarının ortak bağlamı: ikiz (taslak dahil), etkin rızalar, kimlik durumu. */
export async function getTwinContext(userId: string): Promise<TwinContext> {
  const { creator, twin } = await getOrCreateTwin(userId);
  const rows = await CreatorConsent.find({ creatorId: creator._id, granted: true, revokedAt: null }, { kind: 1, grantedAt: 1, textVersion: 1 }).lean<ICreatorConsent[]>();
  return {
    creator,
    twin: twin.toObject() as ITwin,
    consents: rows.map((r) => r.kind),
    consentRows: rows.map((r) => ({ kind: r.kind, grantedAt: r.grantedAt, textVersion: r.textVersion })),
    identityVerified: creator.verification.identity === "verified",
  };
}

/** /studio/ai-twin: sürüm geçmişi, bilgi tabanı özeti, sohbet istatistiği. */
export async function getTwinOverview(userId: string) {
  const ctx = await getTwinContext(userId);
  const [versions, ks, fanConvs] = await Promise.all([
    AiTwinVersion.find({ twinId: ctx.twin._id }, { snapshot: 0 }).sort({ version: -1 }).limit(10).lean<ITwinVersion[]>(),
    KnowledgeSource.aggregate<{ _id: string; n: number; chunks: number }>([{ $match: { creatorId: ctx.creator._id } }, { $group: { _id: "$status", n: { $sum: 1 }, chunks: { $sum: "$chunkCount" } } }]),
    Conversation.countDocuments({ creatorId: ctx.creator._id, kind: "fan", status: { $ne: "deleted" } }),
  ]);
  const settings = await getPlatformSettings();
  return {
    ...ctx,
    versions,
    knowledge: { sources: ks.reduce((a, r) => a + r.n, 0), indexed: ks.find((r) => r._id === "indexed")?.n ?? 0, chunks: ks.reduce((a, r) => a + r.chunks, 0) },
    fanConversations: fanConvs,
    maxMessageCredits: settings.chat.maxMessageCredits,
  };
}

/** Bilgi tabanı istatistikleri (kaynak sayısı, parça, token) + dosya adları. */
export async function getKnowledgeView(userId: string) {
  const ctx = await getTwinContext(userId);
  const sources = await KnowledgeSource.find({ creatorId: ctx.creator._id }, { text: 0 }).sort({ createdAt: -1 }).limit(300).lean();
  const assetIds = sources.flatMap((s) => (s.assetId ? [s.assetId] : []));
  const assets = assetIds.length ? await MediaAsset.find({ _id: { $in: assetIds } }, { originalName: 1, mime: 1 }).lean<Pick<IMediaAsset, "_id" | "originalName" | "mime">[]>() : [];
  const nameOf = new Map(assets.map((a) => [a._id.toString(), a.originalName ?? null]));
  const chunkAgg = await KnowledgeChunk.aggregate<{ _id: null; active: number; tokens: number }>([
    { $match: { creatorId: ctx.creator._id } },
    { $group: { _id: null, active: { $sum: { $cond: ["$active", 1, 0] } }, tokens: { $sum: "$tokenCount" } } },
  ]);
  return {
    ...ctx,
    sources: sources.map((s) => ({
      id: s._id.toString(),
      type: s.type,
      title: s.title,
      status: s.status,
      approved: s.approved,
      chunkCount: s.chunkCount,
      tokenCount: s.tokenCount,
      sizeBytes: s.sizeBytes ?? 0,
      url: s.url ?? null,
      fileName: s.assetId ? nameOf.get(s.assetId.toString()) ?? null : null,
      error: s.error ?? null,
      createdAt: s.createdAt,
      indexedAt: s.indexedAt ?? null,
    })),
    stats: {
      total: sources.length,
      indexed: sources.filter((s) => s.status === "indexed").length,
      approved: sources.filter((s) => s.approved && s.status === "indexed").length,
      processing: sources.filter((s) => ["uploaded", "validating", "extracting", "chunking", "embedding"].includes(s.status)).length,
      failed: sources.filter((s) => s.status === "failed").length,
      activeChunks: chunkAgg[0]?.active ?? 0,
      tokens: chunkAgg[0]?.tokens ?? 0,
    },
  };
}

/** Ses örnekleri (voice_sample varlıkları) — ikizin ses profilinde kayıtlı olanlar. */
export async function getVoiceSamples(ownerUserId: ITwin["userId"], ids: ITwin["draft"]["voice"]["voiceSampleAssetIds"]) {
  if (!ids.length) return [];
  const t = await getT();
  const assets = await MediaAsset.find({ _id: { $in: ids }, ownerId: ownerUserId, purpose: "voice_sample", status: "ready" }).lean<IMediaAsset[]>();
  return Promise.all(assets.map(async (a) => ({ assetId: a._id.toString(), name: a.originalName ?? t("Ses örneği"), sizeBytes: a.sizeBytes, url: await mediaUrl(a) })));
}

/**
 * Geri çekilmiş (revoked) ikizi yeniden taslağa alır. Durum makinesi revoked → draft geçişine izin verir;
 * paylaşılan yaşam döngüsü servisinde bunun için bir işlev olmadığından Studio tarafında yazıldı.
 * Persona rızası yeniden verilmeden taslağa alınamaz.
 */
export async function reopenRevokedTwin(userId: string) {
  const { creator, twin } = await getOrCreateTwin(userId);
  const consents = await activeConsents(creator._id);
  if (!consents.has("ai_twin_persona")) throw new AppError("Yeniden başlamak için önce AI ikizi açık rızasını ver.", "consent_required", 403);
  assertTransition(TWIN_TRANSITIONS, twin.status, "draft", TWIN_STATUS_LABELS);
  twin.statusHistory.push({ from: twin.status, to: "draft", by: creator.userId, note: "Creator yeniden taslağa aldı", at: new Date() }); // i18n-ignore (durum geçmişi notu)
  twin.status = "draft";
  twin.features.chat = true;
  await twin.save();
  await AiTwin.updateOne({ _id: twin._id }, { $set: { liveVersionId: null } });
  await audit({ actorId: userId, action: "twin.reopen", targetType: "AiTwin", targetId: twin._id.toString() });
}
