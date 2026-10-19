"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { assertUser } from "@/lib/auth/session";
import { AppError, toActionError, type ActionResult } from "@/lib/errors";
import { creatorConnectSchema, creatorCustomizeSchema, creatorTwinSchema, creatorVerifySchema } from "@/features/auth/schemas";
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

const done = (message?: string): ActionResult => ({ ok: true, data: undefined, message });

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

/** Adım 1 · Bağla: temel hesap bilgileri (account) + sosyal hesaplar (social). */
export async function saveCreatorConnectAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    const v = creatorConnectSchema.parse(input);
    const view = await viewOrThrow(user.id);
    await saveOnboardingStep(user.id, "account", {
      displayName: v.displayName,
      username: v.username,
      headline: v.headline,
      bio: view.bio,
      location: view.location,
      categories: v.categories,
    });
    await saveOnboardingStep(user.id, "social", { links: v.links });
    return done("Hesap bilgilerin kaydedildi.");
  } catch (err) {
    return toActionError(err);
  }
}

/** Adım 2 · Doğrula: kimlik doğrulama talebi (belge SAKLANMAZ; sağlayıcı/admin incelemesine düşer). */
export async function saveCreatorVerifyAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    const v = creatorVerifySchema.parse(input);
    await viewOrThrow(user.id);
    await saveOnboardingStep(user.id, "verify", { legalName: v.legalName, birthYear: String(v.birthYear) });
    return done("Doğrulama talebin alındı.");
  } catch (err) {
    return toActionError(err);
  }
}

/** Adım 3 · AI İkizi: ad, kısa biyografi, karşılama + açık rıza (ai_twin_persona). */
export async function saveCreatorTwinAction(input: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    const v = creatorTwinSchema.parse(input);
    await viewOrThrow(user.id);
    await updateTwinDraft(user.id, { persona: { displayName: v.displayName, shortBio: v.shortBio, greeting: v.greeting } });
    await grantConsent(user.id, "ai_twin_persona", await requestIp());
    await saveOnboardingStep(user.id, "twin", { displayName: v.displayName, consent: true });
    return done("AI ikizinin temelleri kaydedildi.");
  } catch (err) {
    return toActionError(err);
  }
}

/** Adım 4 · Özelleştir: kişilik (persona) + bilgi rızası (knowledge) + ses rızası (likeness) + sınırlar (boundaries). */
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
    if (!v.knowledgeConsent && has.has("knowledge_use")) await revokeConsent(user.id, "knowledge_use", "Karşılama sırasında kapatıldı");
    await saveOnboardingStep(user.id, "knowledge", { consent: v.knowledgeConsent });

    // Ses/görünüm izni yalnız kimliği doğrulanmış creator için; grantConsent bunu servis katmanında da zorlar.
    if (v.voiceConsent && !has.has("voice_likeness")) await grantConsent(user.id, "voice_likeness", ip);
    if (!v.voiceConsent && has.has("voice_likeness")) await revokeConsent(user.id, "voice_likeness", "Karşılama sırasında kapatıldı");
    await saveOnboardingStep(user.id, "likeness", { voice: v.voiceConsent });

    await saveOnboardingStep(user.id, "boundaries", { allowedTopics: v.allowedTopics, blockedTopics: v.blockedTopics });
    return done("Kişilik ve sınır ayarların kaydedildi.");
  } catch (err) {
    return toActionError(err);
  }
}

/** Adım 5 · İncele: başvuruyu gönderir (AI ikizi sürümü de incelemeye alınır). */
export async function submitCreatorApplicationAction(): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    const view = await viewOrThrow(user.id);
    if (view.status !== "onboarding") throw new AppError("Başvurun zaten gönderilmiş veya sonuçlanmış.", "already_submitted", 409);
    if (view.missingRequired.length) throw new AppError("Başvuruyu göndermeden önce önceki adımları tamamlamalısın.", "steps_missing");
    await saveOnboardingStep(user.id, "preview", {});
    await submitTwinForReview(user.id, "Creator başvurusuyla birlikte gönderildi");
    await submitCreatorApplication(user.id);
    await saveOnboardingStep(user.id, "submit", {});
    revalidatePath("/onboarding/creator");
    return done("Başvurun incelemeye gönderildi.");
  } catch (err) {
    return toActionError(err);
  }
}
