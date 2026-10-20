"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { m } from "@/i18n/m";
import { getT } from "@/i18n/server";
import { toActionError, type ActionResult } from "@/lib/errors";
import { CONSENT_KINDS, type ConsentKind } from "@/models/creator";
import { getOrCreateTwin, grantConsent, publishTwin, pauseTwin, revokeConsent, setLikenessFeature, submitTwinForReview, updateTwinDraft } from "@/services/ai-twins/lifecycle";
import { getPlatformSettings } from "@/services/platform/settings";
import { reopenRevokedTwin } from "@/services/studio/twin";
import { addVoiceSample, removeVoiceSample } from "@/services/studio/voice";
import { getTestMessages, getTestSession, type TestMessageView } from "@/services/studio/test-lab";
import { clientIp, creatorUserId } from "./server-helpers";

const refreshTwin = () => {
  revalidatePath("/studio", "layout");
};

/* ─── Durum geçişleri ─── */
export async function submitTwinReviewAction(input: unknown): Promise<ActionResult<{ version: number }>> {
  try {
    const t = await getT();
    const userId = await creatorUserId();
    const { summary } = z.object({ summary: z.string().trim().max(500).optional() }).parse(input ?? {});
    const r = await submitTwinForReview(userId, summary);
    refreshTwin();
    return { ok: true, data: r, message: t("Sürüm {version} incelemeye gönderildi.", { version: r.version }) };
  } catch (err) {
    return toActionError(err);
  }
}

export async function publishTwinAction(): Promise<ActionResult> {
  try {
    const t = await getT();
    await publishTwin(await creatorUserId());
    refreshTwin();
    return { ok: true, data: undefined, message: t("AI ikizin yayında.") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function reopenTwinAction(): Promise<ActionResult> {
  try {
    const t = await getT();
    await reopenRevokedTwin(await creatorUserId());
    refreshTwin();
    return { ok: true, data: undefined, message: t("AI ikizin taslağa alındı. Ayarlarını gözden geçirip incelemeye gönderebilirsin.") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function pauseTwinAction(): Promise<ActionResult> {
  try {
    const t = await getT();
    await pauseTwin(await creatorUserId());
    refreshTwin();
    return { ok: true, data: undefined, message: t("AI ikizin duraklatıldı. Yeni sohbet başlatılamaz.") };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Rızalar ─── */
const consentSchema = z.object({ kind: z.enum(CONSENT_KINDS) });

export async function grantConsentAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const userId = await creatorUserId();
    const { kind } = consentSchema.parse(input);
    await grantConsent(userId, kind as ConsentKind, await clientIp());
    refreshTwin();
    return { ok: true, data: undefined, message: t("Açık rızan kaydedildi.") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function revokeConsentAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const userId = await creatorUserId();
    const { kind } = consentSchema.parse(input);
    await revokeConsent(userId, kind as ConsentKind);
    refreshTwin();
    const msg: Record<ConsentKind, string> = {
      ai_twin_persona: m("Rıza geri çekildi; AI ikizin derhal çevrimdışı."),
      knowledge_use: m("Rıza geri çekildi; bilgi tabanın yanıtlarda kullanılmıyor."),
      voice_likeness: m("Rıza geri çekildi; ses özellikleri durduruldu."),
      image_likeness: m("Rıza geri çekildi; görsel benzerlik durduruldu."),
      video_likeness: m("Rıza geri çekildi; görüntülü özellikler durduruldu."),
    };
    return { ok: true, data: undefined, message: t(msg[kind as ConsentKind]) };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Kişilik ─── */
const pct = z.number().int().min(0).max(100);
const personaSchema = z.object({
  displayName: z.string().trim().min(2, m("Ad en az 2 karakter")).max(80),
  shortBio: z.string().trim().max(500, m("En fazla 500 karakter")),
  greeting: z.string().trim().min(2, m("Karşılama mesajı zorunlu")).max(500, m("En fazla 500 karakter")),
  warmth: pct,
  formality: pct,
  humor: pct,
  energy: pct,
  messageLength: z.enum(["short", "medium", "long"]),
  pace: z.enum(["slow", "normal", "fast"]),
  language: z.string().regex(/^[a-z]{2}$/, m("Geçersiz dil")),
  emojiUsage: z.enum(["none", "low", "medium", "high"]),
  speakingStyle: z.string().trim().max(1000, m("En fazla 1000 karakter")),
  catchphrases: z.array(z.string().trim().min(1).max(80)).max(12, m("En fazla 12 ifade")),
  sampleReplies: z.array(z.string().trim().min(1).max(300)).max(6, m("En fazla 6 örnek yanıt")),
});

export async function savePersonaAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const userId = await creatorUserId();
    await updateTwinDraft(userId, { persona: personaSchema.parse(input) });
    revalidatePath("/studio/personality");
    revalidatePath("/studio/ai-twin");
    return { ok: true, data: undefined, message: t("Kişilik taslağı kaydedildi. Değişiklikler incelemeden sonra yayına alınır.") };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Sınırlar ─── */
const topic = z.string().trim().min(1).max(60);
const boundariesSchema = z.object({
  allowedTopics: z.array(topic).max(20, m("En fazla 20 konu")),
  blockedTopics: z.array(topic).max(30, m("En fazla 30 konu")),
  customRules: z.array(z.string().trim().min(3).max(300)).max(15, m("En fazla 15 kural")),
  allowFlirt: z.boolean(),
  allowPersonalQuestions: z.boolean(),
  allowMediaRequests: z.boolean(),
  allowCustomRequests: z.boolean(),
  escalateOnDistress: z.boolean(),
  maxMessagesPerFanPerDay: z.number().int().min(1, m("En az 1")).max(1000, m("En fazla 1000")),
});

export async function saveBoundariesAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const userId = await creatorUserId();
    const b = boundariesSchema.parse(input);
    const settings = await getPlatformSettings();
    // Platform politikası üst sınırdır: yetişkin içerik kapalıyken flört açılamaz; zor durumda yönlendirme kapatılamaz.
    await updateTwinDraft(userId, { boundaries: { ...b, allowFlirt: b.allowFlirt && settings.features.adultContent, escalateOnDistress: true } });
    revalidatePath("/studio/boundaries");
    revalidatePath("/studio/ai-twin");
    return { ok: true, data: undefined, message: t("Sınırlar kaydedildi.") };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Ses ve görünüm ─── */
const voiceSchema = z.object({ pitch: z.number().int().min(-10).max(10), speed: z.number().int().min(50).max(150), tone: z.enum(["soft", "neutral", "energetic"]) });

export async function saveVoiceSettingsAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    await updateTwinDraft(await creatorUserId(), { voice: voiceSchema.parse(input) });
    revalidatePath("/studio/voice");
    return { ok: true, data: undefined, message: t("Ses ayarları kaydedildi.") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setLikenessAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const userId = await creatorUserId();
    const { feature, enabled } = z.object({ feature: z.enum(["voice", "video", "image"]), enabled: z.boolean() }).parse(input);
    await setLikenessFeature(userId, feature, enabled);
    revalidatePath("/studio/voice");
    return { ok: true, data: undefined, message: enabled ? t("Özellik etkinleştirildi.") : t("Özellik kapatıldı.") };
  } catch (err) {
    return toActionError(err);
  }
}

const assetIdSchema = z.object({ assetId: z.string().regex(/^[a-f0-9]{24}$/i) });

export async function addVoiceSampleAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    await addVoiceSample(await creatorUserId(), assetIdSchema.parse(input).assetId);
    revalidatePath("/studio/voice");
    return { ok: true, data: undefined, message: t("Ses örneği eklendi.") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function removeVoiceSampleAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    await removeVoiceSample(await creatorUserId(), assetIdSchema.parse(input).assetId);
    revalidatePath("/studio/voice");
    return { ok: true, data: undefined, message: t("Ses örneği silindi.") };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Stüdyo ayarları: ikiz fiyatlandırma, talepler, duraklatma ─── */
const pricingSchema = z.object({
  messageCredits: z.number().int().min(0, m("En az 0")).max(100),
  freeMessagesPerDay: z.number().int().min(0).max(50, m("En fazla 50")),
  voicePerMinuteCredits: z.number().int().min(0).max(1000),
  videoPerMinuteCredits: z.number().int().min(0).max(1000),
});

export async function savePricingAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    await updateTwinDraft(await creatorUserId(), { pricing: pricingSchema.parse(input) });
    revalidatePath("/studio/settings");
    return { ok: true, data: undefined, message: t("Fiyatlandırma kaydedildi; yeni sohbetlerde hemen geçerli.") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setAllowCustomRequestsAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { enabled } = z.object({ enabled: z.boolean() }).parse(input);
    await updateTwinDraft(await creatorUserId(), { boundaries: { allowCustomRequests: enabled } });
    revalidatePath("/studio/settings");
    revalidatePath("/studio/boundaries");
    return { ok: true, data: undefined, message: enabled ? t("Özel talepler açıldı.") : t("Özel talepler kapatıldı.") };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Test alanı ─── */
export async function resetTestChatAction(): Promise<ActionResult<{ conversationId: string }>> {
  try {
    const t = await getT();
    const userId = await creatorUserId();
    await getOrCreateTwin(userId);
    const s = await getTestSession(userId, true);
    return { ok: true, data: { conversationId: s.conversationId }, message: t("Yeni test oturumu başlatıldı.") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function fetchTestMessagesAction(input: unknown): Promise<ActionResult<TestMessageView[]>> {
  try {
    const userId = await creatorUserId();
    const { conversationId, ids } = z.object({ conversationId: z.string().regex(/^[a-f0-9]{24}$/i), ids: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(20) }).parse(input);
    return { ok: true, data: await getTestMessages(userId, conversationId, ids) };
  } catch (err) {
    return toActionError(err);
  }
}
