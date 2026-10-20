import "server-only";
import { createHash } from "node:crypto";
import type { Types } from "mongoose";
import { connectDb, withTransaction } from "@/lib/db/mongo";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { audit, hashIp } from "@/lib/security/audit";
import { assertTransition, TWIN_STATUS_LABELS, TWIN_TRANSITIONS } from "@/lib/state-machines";
import { oid } from "@/lib/validation/common";
import { AiTwin, AiTwinVersion, KnowledgeSource, type ITwin, type TwinBoundaries, type TwinPersona, type TwinStatus, type TwinVoiceLikeness } from "@/models/ai";
import { CreatorConsent, CreatorProfile, type ConsentKind, type ICreatorProfile } from "@/models/creator";
import { notify } from "@/services/notifications/notifications";
import { getPlatformSettings } from "@/services/platform/settings";
import { m } from "@/i18n/m";

export const CONSENT_TEXTS: Record<ConsentKind, { version: string; text: string }> = {
  ai_twin_persona: { version: "2026-10-draft", text: m("AI ikizimin, onayladığım kişilik ayarları ve sınırlarla hayranlarımla HEYFANS üzerinde sohbet etmesine izin veriyorum. Yanıtların 'AI İkizi' etiketiyle gösterileceğini ve iznimi her an geri çekebileceğimi biliyorum.") },
  knowledge_use: { version: "2026-10-draft", text: m("Bilgi tabanına eklediğim ve onayladığım içeriklerin, AI ikizimin yanıtlarında bağlam olarak kullanılmasına izin veriyorum.") },
  voice_likeness: { version: "2026-10-draft", text: m("Doğrulanmış kimliğimle, sesimin AI ikizim için ses profili oluşturmakta kullanılmasına açıkça izin veriyorum. İznimi geri çektiğimde ses özellikleri derhal durdurulur.") },
  image_likeness: { version: "2026-10-draft", text: m("Doğrulanmış kimliğimle, görünümümün AI ikizimin görsel benzerliği için kullanılmasına açıkça izin veriyorum.") },
  video_likeness: { version: "2026-10-draft", text: m("Doğrulanmış kimliğimle, görüntülü AI deneyimlerinde görünümümün kullanılmasına açıkça izin veriyorum.") },
};

async function creatorFor(userId: string) {
  await connectDb();
  const creator = await CreatorProfile.findOne({ userId: oid(userId) }).lean<ICreatorProfile>();
  if (!creator) throw new NotFoundError("Creator profili bulunamadı.");
  return creator;
}

export async function getOrCreateTwin(userId: string) {
  const creator = await creatorFor(userId);
  let twin = await AiTwin.findOne({ creatorId: creator._id });
  if (!twin) {
    twin = await AiTwin.create({ creatorId: creator._id, userId: creator.userId, draft: { persona: { displayName: creator.displayName, shortBio: creator.bio ?? "" } } });
  }
  return { creator, twin };
}

export async function activeConsents(creatorId: Types.ObjectId) {
  const rows = await CreatorConsent.find({ creatorId, granted: true, revokedAt: null }).lean();
  return new Set(rows.map((r) => r.kind));
}

/** Açık rıza verme (metin sürümü + özetiyle) — denetim kaydı yazılır. */
export async function grantConsent(userId: string, kind: ConsentKind, ip?: string | null) {
  const creator = await creatorFor(userId);
  if ((kind === "voice_likeness" || kind === "image_likeness" || kind === "video_likeness") && creator.verification.identity !== "verified") {
    throw new AppError("Ses/görünüm benzerliği için önce kimlik doğrulaması tamamlanmalı.", "identity_required", 403);
  }
  const t = CONSENT_TEXTS[kind];
  const existing = await CreatorConsent.findOne({ creatorId: creator._id, kind, granted: true, revokedAt: null });
  if (existing) return existing;
  const consent = await CreatorConsent.create({
    creatorId: creator._id,
    userId: creator.userId,
    kind,
    granted: true,
    textVersion: t.version,
    textHash: createHash("sha256").update(t.text).digest("hex"),
    ipHash: hashIp(ip),
  });
  if (kind === "knowledge_use") {
    // Rıza yeniden verildiğinde onaylı ve indekslenmiş kaynakların parçaları tekrar kullanıma alınır.
    const { KnowledgeChunk } = await import("@/models/ai");
    const sources = await KnowledgeSource.find({ creatorId: creator._id, approved: true, status: "indexed" }, { _id: 1 }).lean();
    await KnowledgeChunk.updateMany({ creatorId: creator._id, sourceId: { $in: sources.map((x) => x._id) } }, { $set: { active: true } });
  }
  await audit({ actorId: userId, action: "consent.grant", targetType: "CreatorConsent", targetId: consent._id.toString(), metadata: { kind } });
  return consent;
}

/** Rıza geri çekme: ilgili özellikler DERHAL durdurulur. Persona rızası geri çekilirse ikiz "revoked" olur. */
export async function revokeConsent(userId: string, kind: ConsentKind, reason = "Creator tarafından geri çekildi" /* i18n-ignore (kayıt notu) */) {
  const creator = await creatorFor(userId);
  await withTransaction(async (session) => {
    await CreatorConsent.updateMany({ creatorId: creator._id, kind, revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: reason } }, { session });
    const twin = await AiTwin.findOne({ creatorId: creator._id }).session(session);
    if (!twin) return;
    if (kind === "voice_likeness") {
      twin.draft.voice.voiceEnabled = false;
      twin.draft.voice.voiceProfileStatus = "disabled";
      twin.features.voice = false;
    }
    if (kind === "video_likeness" || kind === "image_likeness") {
      twin.draft.voice.videoEnabled = false;
      twin.draft.voice.imageLikenessEnabled = false;
      twin.features.video = false;
    }
    if (kind === "ai_twin_persona" && twin.status !== "revoked") {
      twin.statusHistory.push({ from: twin.status, to: "revoked", by: creator.userId, note: reason, at: new Date() });
      twin.status = "revoked";
      twin.features.chat = false;
    }
    if (kind === "knowledge_use") {
      const { KnowledgeChunk } = await import("@/models/ai");
      await KnowledgeChunk.updateMany({ creatorId: creator._id }, { $set: { active: false } }, { session });
    }
    await twin.save({ session });
  });
  await audit({ actorId: userId, action: "consent.revoke", targetType: "CreatorProfile", targetId: creator._id.toString(), severity: "notice", metadata: { kind, reason } });
}

export async function updateTwinDraft(
  userId: string,
  patch: { persona?: Partial<TwinPersona>; boundaries?: Partial<TwinBoundaries>; voice?: Partial<Pick<TwinVoiceLikeness, "pitch" | "speed" | "tone">>; pricing?: Partial<ITwin["pricing"]> },
) {
  const { twin } = await getOrCreateTwin(userId);
  if (twin.status === "revoked") throw new ConflictError("Geri çekilmiş ikiz düzenlenemez; önce yeniden taslağa alın.");
  const settings = await getPlatformSettings();
  if (patch.persona) Object.assign(twin.draft.persona, patch.persona);
  if (patch.boundaries) Object.assign(twin.draft.boundaries, patch.boundaries);
  if (patch.voice) Object.assign(twin.draft.voice, patch.voice);
  if (patch.pricing) {
    if (patch.pricing.messageCredits != null && patch.pricing.messageCredits > settings.chat.maxMessageCredits) {
      throw new AppError("Mesaj ücreti en fazla {max} kredi olabilir.", "price_cap", 400, { params: { max: settings.chat.maxMessageCredits } });
    }
    Object.assign(twin.pricing, patch.pricing);
  }
  twin.markModified("draft");
  await twin.save();
  return twin.toObject();
}

async function setStatus(twinId: Types.ObjectId, to: TwinStatus, actorId: Types.ObjectId | string, note?: string) {
  const twin = await AiTwin.findById(twinId);
  if (!twin) throw new NotFoundError("AI ikizi bulunamadı.");
  assertTransition(TWIN_TRANSITIONS, twin.status, to, TWIN_STATUS_LABELS);
  twin.statusHistory.push({ from: twin.status, to, by: oid(actorId), note, at: new Date() });
  twin.status = to;
  if (to === "live") twin.features.chat = true;
  if (to === "paused" || to === "revoked") twin.features.chat = to === "paused" ? twin.features.chat : false;
  await twin.save();
  return twin;
}

/** İncelemeye gönder: rıza + zorunlu alanlar denetlenir, değiştirilemez sürüm oluşturulur. */
export async function submitTwinForReview(userId: string, changeSummary?: string) {
  const { creator, twin } = await getOrCreateTwin(userId);
  const consents = await activeConsents(creator._id);
  if (!consents.has("ai_twin_persona")) throw new AppError("İncelemeye göndermeden önce AI ikizi açık rızasını vermelisin.", "consent_required", 403);
  const p = twin.draft.persona;
  if (!p.displayName || !p.greeting) throw new AppError("Kişilik Stüdyosu'nda ad ve karşılama mesajı zorunlu.", "persona_incomplete");
  const sources = await KnowledgeSource.find({ creatorId: creator._id, status: "indexed", approved: true }, { _id: 1 }).lean();
  const versionNo = twin.currentVersion + 1;
  await withTransaction(async (session) => {
    await AiTwinVersion.updateMany({ twinId: twin._id, status: "pending_review" }, { $set: { status: "superseded" } }, { session });
    await AiTwinVersion.create(
      [
        {
          twinId: twin._id,
          creatorId: creator._id,
          version: versionNo,
          snapshot: { persona: twin.draft.persona, boundaries: twin.draft.boundaries, voice: twin.draft.voice, knowledgeSourceIds: sources.map((s) => s._id) },
          status: "pending_review",
          submittedBy: creator.userId,
          changeSummary: changeSummary?.slice(0, 500),
        },
      ],
      { session },
    );
    await AiTwin.updateOne({ _id: twin._id }, { $set: { currentVersion: versionNo } }, { session });
  });
  // Yayındaki ikiz, yeni sürüm incelenirken yayında kalır (canlı sürüm değişmez). İncelemedeki ikize
  // yeni sürüm gönderilirse önceki bekleyen sürüm "superseded" olur, durum aynı kalır.
  if (!["live", "paused", "pending_review"].includes(twin.status)) await setStatus(twin._id, "pending_review", creator.userId, `Sürüm ${versionNo} incelemeye gönderildi`); // i18n-ignore (durum geçmişi notu)
  await audit({ actorId: userId, action: "twin.submit", targetType: "AiTwin", targetId: twin._id.toString(), metadata: { version: versionNo } });
  return { version: versionNo };
}

/** Admin incelemesi: onay/ret. Onay, creator yayına almadan önce "approved" durumuna geçirir. */
export async function reviewTwinVersion(actor: { id: string; adminRole: string | null }, versionId: string, decision: "approve" | "reject", note: string) {
  await connectDb();
  const version = await AiTwinVersion.findById(oid(versionId));
  if (!version || version.status !== "pending_review") throw new NotFoundError("İncelemede bekleyen sürüm bulunamadı.");
  const twin = await AiTwin.findById(version.twinId);
  const creator = await CreatorProfile.findById(version.creatorId).lean<ICreatorProfile>();
  if (!twin || !creator) throw new NotFoundError("İkiz veya creator bulunamadı.");
  if (decision === "approve" && creator.status !== "approved") throw new ConflictError("Creator hesabı onaylanmadan AI ikizi onaylanamaz.");

  version.status = decision === "approve" ? "approved" : "rejected";
  version.reviewedBy = oid(actor.id);
  version.reviewNote = note;
  await version.save();
  twin.reviewNote = note;
  await twin.save();

  if (decision === "approve") {
    if (twin.status === "live" || twin.status === "paused") {
      // Yayındaki ikizin yeni sürümü: doğrudan canlı sürüm olur.
      await AiTwinVersion.updateMany({ twinId: twin._id, status: "live" }, { $set: { status: "superseded" } });
      version.status = "live";
      await version.save();
      await AiTwin.updateOne({ _id: twin._id }, { $set: { liveVersionId: version._id } });
    } else {
      await setStatus(twin._id, "approved", actor.id, note); // i18n-ignore
    }
  } else if (twin.status === "pending_review") {
    await setStatus(twin._id, "rejected", actor.id, note); // i18n-ignore
  }
  await notify(creator.userId.toString(), {
    type: "twin_review",
    title: decision === "approve" ? m("AI ikizin onaylandı") : m("AI ikizin için düzenleme gerekiyor"),
    body: note,
    link: "/studio/ai-twin",
  });
  // i18n-ignore (denetim anahtarı)
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: `twin.${decision}`, targetType: "AiTwinVersion", targetId: versionId, reason: note, severity: "notice" });
}

/** Creator onaylanmış ikizi yayına alır (veya duraklatılmışı devam ettirir). */
export async function publishTwin(userId: string) {
  const { creator, twin } = await getOrCreateTwin(userId);
  if (creator.status !== "approved") throw new ConflictError("Creator hesabın onaylanmadan AI ikizin yayına alınamaz.");
  const consents = await activeConsents(creator._id);
  if (!consents.has("ai_twin_persona")) throw new AppError("AI ikizi rızası geri çekilmiş; yayına alınamaz.", "consent_required", 403);
  if (twin.status === "approved") {
    const version = await AiTwinVersion.findOne({ twinId: twin._id, status: "approved" }).sort({ version: -1 });
    if (!version) throw new ConflictError("Onaylı sürüm bulunamadı.");
    await AiTwinVersion.updateMany({ twinId: twin._id, status: "live" }, { $set: { status: "superseded" } });
    version.status = "live";
    await version.save();
    await AiTwin.updateOne({ _id: twin._id }, { $set: { liveVersionId: version._id } });
  }
  await setStatus(twin._id, "live", creator.userId, twin.status === "paused" ? "Devam ettirildi" : "Yayına alındı"); // i18n-ignore (durum geçmişi notu)
  await audit({ actorId: userId, action: "twin.publish", targetType: "AiTwin", targetId: twin._id.toString() });
}

export async function pauseTwin(userId: string) {
  const { creator, twin } = await getOrCreateTwin(userId);
  await setStatus(twin._id, "paused", creator.userId, "Creator tarafından duraklatıldı"); // i18n-ignore (durum geçmişi notu)
}

const ADMIN_TWIN_NOTICES = { paused: m("AI ikizin duraklatıldı"), revoked: m("AI ikizin geri çekildi"), live: m("AI ikizin yayında") } as const;

/** Admin müdahalesi: duraklat veya geri çek (moderasyon). */
export async function adminSetTwinStatus(actor: { id: string; adminRole: string | null }, twinId: string, to: "paused" | "revoked" | "live", reason: string) {
  const twin = await setStatus(oid(twinId), to, actor.id, reason);
  if (to === "revoked") await AiTwin.updateOne({ _id: twin._id }, { $set: { "features.chat": false, "features.voice": false, "features.video": false } });
  const creator = await CreatorProfile.findById(twin.creatorId, { userId: 1 }).lean();
  if (creator) await notify(creator.userId.toString(), { type: "moderation", title: ADMIN_TWIN_NOTICES[to], body: reason, link: "/studio/ai-twin" });
  // i18n-ignore (denetim anahtarı)
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: `twin.admin_${to}`, targetType: "AiTwin", targetId: twinId, reason, severity: "critical" });
}

/** Ses/görünüm özelliklerini aç/kapat: kimlik doğrulaması + ilgili açık rıza zorunlu. */
export async function setLikenessFeature(userId: string, feature: "voice" | "video" | "image", enabled: boolean) {
  const { creator, twin } = await getOrCreateTwin(userId);
  const settings = await getPlatformSettings();
  const kind: ConsentKind = feature === "voice" ? "voice_likeness" : feature === "video" ? "video_likeness" : "image_likeness";
  if (enabled) {
    if (!settings.features.likenessGeneration && feature !== "voice") throw new AppError("Görsel benzerlik üretimi platform genelinde kapalı.", "feature_flag_off", 403);
    if (creator.verification.identity !== "verified") throw new AppError("Önce kimlik doğrulamasını tamamla.", "identity_required", 403);
    const consents = await activeConsents(creator._id);
    if (!consents.has(kind)) throw new AppError("Bu özellik için açık rıza vermelisin.", "consent_required", 403);
  }
  if (feature === "voice") {
    twin.draft.voice.voiceEnabled = enabled;
    twin.features.voice = enabled && settings.features.voiceCalls;
    if (enabled && twin.draft.voice.voiceProfileStatus === "disabled") twin.draft.voice.voiceProfileStatus = "none";
  } else if (feature === "video") {
    twin.draft.voice.videoEnabled = enabled;
    twin.features.video = enabled && settings.features.videoCalls;
  } else {
    twin.draft.voice.imageLikenessEnabled = enabled;
  }
  twin.markModified("draft");
  await twin.save();
  // i18n-ignore (denetim anahtarı)
  await audit({ actorId: userId, action: `twin.likeness_${feature}_${enabled ? "on" : "off"}`, targetType: "AiTwin", targetId: twin._id.toString() });
}
