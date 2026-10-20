"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { assertUser } from "@/lib/auth/session";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";
import { AppError, type ActionResult } from "@/lib/errors";
import { toActionError } from "@/lib/action-error";
import { creatorCustomizeSchema, creatorProfileSchema, creatorTwinSchema, creatorVerifySchema, usernameField } from "@/features/auth/schemas";
import { connectDb } from "@/lib/db/mongo";
import { CreatorProfile } from "@/models/creator";
import { grantConsent, revokeConsent, submitTwinForReview, updateTwinDraft } from "@/services/ai-twins/lifecycle";
import { saveOnboardingStep, startCreatorOnboarding, submitCreatorApplication } from "@/services/creators/onboarding";
import { getCreatorOnboardingView } from "@/services/auth/creator-onboarding";

async function requestIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}

async function viewOrThrow(userId: string) {
  const view = await getCreatorOnboardingView(userId);
  if (!view) throw new AppError("Önce içerik üreticisi yolculuğunu başlat.", "onboarding_not_started", 409);
  return view;
}

/** Başarı iletisi: `done(m("Türkçe metin"))` — istek diline burada çevrilir. */
const done = async (message?: string): Promise<ActionResult> => ({ ok: true, data: undefined, message: message ? (await getT())(message) : undefined });

/** İçerik üreticisi yolculuğunu başlatır (profil + creator rolü + boş AI ikizi taslağı). */
export async function startCreatorOnboardingAction(): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    await startCreatorOnboarding(user.id);
    revalidatePath("/onboarding/creator");
    return done();
  } catch (err) {
    return toActionError(err);
  }
}

/** Profil sorusu sırasında kullanıcı adının uygunluğu (kendi mevcut adı uygundur). */
export async function checkCreatorUsernameAction(raw: string): Promise<ActionResult<{ available: boolean; taken: boolean; message: string }>> {
  try {
    const { user } = await assertUser();
    const t = await getT();
    const parsed = usernameField.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message;
      return { ok: true, data: { available: false, taken: false, message: issue ? t(issue) : t("Geçersiz kullanıcı adı.") } };
    }
    await connectDb();
    const taken = await CreatorProfile.findOne({ username: parsed.data }, { userId: 1 }).lean();
    const available = !taken || taken.userId.toString() === user.id;
    return { ok: true, data: { available, taken: !available, message: available ? t("Bu kullanıcı adı uygun.") : t("Bu kullanıcı adı alınmış.") } };
  } catch (err) {
    return toActionError(err);
  }
}

/** Adım 1 · Profil: görünen ad, kullanıcı adı, kategoriler, tanıtım (account). */
export async function saveCreatorProfileAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    const v = creatorProfileSchema.parse(input);
    await viewOrThrow(user.id);
    await saveOnboardingStep(user.id, "account", v);
    return done(m("Profil bilgilerin kaydedildi."));
  } catch (err) {
    return toActionError(err);
  }
}

/** Adım 2 · İletişim: telefon (şifreli saklanır) + iletişim tercihi + KVKK onayı (contact). */
export async function saveCreatorContactAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    await viewOrThrow(user.id);
    await saveOnboardingStep(user.id, "contact", (input ?? {}) as Record<string, unknown>);
    return done(m("İletişim bilgilerin kaydedildi."));
  } catch (err) {
    return toActionError(err);
  }
}

/** Adım 3 · Sosyal medya: platform hesapları + kitle büyüklüğü + ana platform (social). */
export async function saveCreatorSocialAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    await viewOrThrow(user.id);
    await saveOnboardingStep(user.id, "social", (input ?? {}) as Record<string, unknown>);
    return done(m("Sosyal hesapların kaydedildi."));
  } catch (err) {
    return toActionError(err);
  }
}

/** Adım 4 · Doğrula: kimlik doğrulama talebi (belge SAKLANMAZ; sağlayıcı/admin incelemesine düşer). */
export async function saveCreatorVerifyAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    const v = creatorVerifySchema.parse(input);
    await viewOrThrow(user.id);
    await saveOnboardingStep(user.id, "verify", { legalName: v.legalName, birthYear: String(v.birthYear) });
    return done(m("Doğrulama talebin alındı."));
  } catch (err) {
    return toActionError(err);
  }
}

/** Adım 5 · AI İkizi: ad, kısa biyografi, karşılama + açık rıza (ai_twin_persona). */
export async function saveCreatorTwinAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    const v = creatorTwinSchema.parse(input);
    await viewOrThrow(user.id);
    await updateTwinDraft(user.id, { persona: { displayName: v.displayName, shortBio: v.shortBio, greeting: v.greeting } });
    await grantConsent(user.id, "ai_twin_persona", await requestIp());
    await saveOnboardingStep(user.id, "twin", { displayName: v.displayName, consent: true });
    return done(m("AI ikizinin temelleri kaydedildi."));
  } catch (err) {
    return toActionError(err);
  }
}

/** Adım 6 · Özelleştir: kişilik (persona) + bilgi rızası (knowledge) + ses rızası (likeness) + sınırlar (boundaries). */
export async function saveCreatorCustomizeAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    const v = creatorCustomizeSchema.parse(input);
    const view = await viewOrThrow(user.id);
    const has = new Set(view.consents);

    await updateTwinDraft(user.id, {
      persona: { warmth: v.warmth, formality: v.formality, humor: v.humor, energy: v.energy, emojiUsage: v.emojiUsage, messageLength: v.messageLength },
      boundaries: {
        allowedTopics: v.allowedTopics,
        blockedTopics: v.blockedTopics,
        allowPersonalQuestions: v.allowPersonalQuestions,
        allowMediaRequests: v.allowMediaRequests,
        allowCustomRequests: v.allowCustomRequests,
        escalateOnDistress: true, // güvenlik: zor durumda insan desteğine yönlendirme kapatılamaz
      },
    });
    await saveOnboardingStep(user.id, "persona", { warmth: v.warmth, formality: v.formality, humor: v.humor, energy: v.energy, emojiUsage: v.emojiUsage, messageLength: v.messageLength });

    const ip = await requestIp();
    if (v.knowledgeConsent && !has.has("knowledge_use")) await grantConsent(user.id, "knowledge_use", ip);
    if (!v.knowledgeConsent && has.has("knowledge_use")) await revokeConsent(user.id, "knowledge_use", "Karşılama sırasında kapatıldı"); // i18n-ignore (denetim kaydı notu)
    await saveOnboardingStep(user.id, "knowledge", { consent: v.knowledgeConsent });

    // Ses/görünüm izni yalnız kimliği doğrulanmış creator için; grantConsent bunu servis katmanında da zorlar.
    if (v.voiceConsent && !has.has("voice_likeness")) await grantConsent(user.id, "voice_likeness", ip);
    if (!v.voiceConsent && has.has("voice_likeness")) await revokeConsent(user.id, "voice_likeness", "Karşılama sırasında kapatıldı"); // i18n-ignore (denetim kaydı notu)
    await saveOnboardingStep(user.id, "likeness", { voice: v.voiceConsent });

    await saveOnboardingStep(user.id, "boundaries", { allowedTopics: v.allowedTopics, blockedTopics: v.blockedTopics });
    return done(m("Kişilik ve sınır ayarların kaydedildi."));
  } catch (err) {
    return toActionError(err);
  }
}

/** Adım 7 · İncele: başvuruyu gönderir (AI ikizi sürümü de incelemeye alınır). */
export async function submitCreatorApplicationAction(): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    const view = await viewOrThrow(user.id);
    if (view.status !== "onboarding") throw new AppError("Başvurun zaten gönderilmiş veya sonuçlanmış.", "already_submitted", 409);
    if (view.missingRequired.length) throw new AppError("Başvuruyu göndermeden önce önceki adımları tamamlamalısın.", "steps_missing");
    await saveOnboardingStep(user.id, "preview", {});
    await submitTwinForReview(user.id, "Creator başvurusuyla birlikte gönderildi"); // i18n-ignore (denetim kaydı notu)
    await submitCreatorApplication(user.id);
    await saveOnboardingStep(user.id, "submit", {});
    revalidatePath("/onboarding/creator");
    return done(m("Başvurun incelemeye gönderildi."));
  } catch (err) {
    return toActionError(err);
  }
}
