import "server-only";
import { z } from "zod";
import { connectDb } from "@/lib/db/mongo";
import { audit } from "@/lib/security/audit";
import { oid } from "@/lib/validation/common";
import { Category } from "@/models/content";
import { UserPreferences } from "@/models/identity";
import { fanCompleteSchema, fanInterestsSchema, fanPersonalizeSchema, fanVibesSchema } from "@/features/auth/schemas";
import { ensureUserPreferences } from "@/services/users/lifecycle";

/**
 * Hayran karşılama (4 adım) durumu. `fanOnboarding.step`:
 *   0-3 → sıradaki adım · 4 → tamamlandı · -1 → "Şimdilik geç" ile atlandı (tekrar sorulmaz, sayfa yine açılabilir).
 */
export const FAN_ONBOARDING_DONE = 4;
export const FAN_ONBOARDING_SKIPPED = -1;

export interface FanOnboardingState {
  step: number;
  completed: boolean;
  skipped: boolean;
  interests: string[];
  vibes: string[];
  recommendationsEnabled: boolean;
  personalizationConsent: boolean;
  aiMemoryEnabled: boolean;
}

export async function getFanOnboarding(userId: string): Promise<FanOnboardingState> {
  const prefs = await ensureUserPreferences(userId);
  const step = prefs?.fanOnboarding?.step ?? 0;
  return {
    step,
    completed: !!prefs?.fanOnboarding?.completedAt,
    skipped: step === FAN_ONBOARDING_SKIPPED,
    interests: prefs?.interests ?? [],
    vibes: prefs?.vibes ?? [],
    recommendationsEnabled: prefs?.recommendationsEnabled ?? true,
    personalizationConsent: prefs?.personalizationConsent ?? false,
    aiMemoryEnabled: prefs?.aiMemoryEnabled ?? false,
  };
}

/** Yalnız etkin kategori slug'ları kabul edilir (rastgele metin kaydedilmez). */
async function onlyKnownCategories(slugs: string[]) {
  await connectDb();
  const known = await Category.find({ slug: { $in: [...new Set(slugs)] }, isActive: true }, { slug: 1 }).lean();
  const set = new Set(known.map((c) => c.slug));
  return [...new Set(slugs)].filter((s) => set.has(s));
}

/** AI hafızası kişiselleştirme izni olmadan açılamaz (hafıza bir kişiselleştirme biçimidir). */
function normalizeConsents<T extends z.infer<typeof fanPersonalizeSchema>>(c: T): T {
  return { ...c, aiMemoryEnabled: c.personalizationConsent ? c.aiMemoryEnabled : false };
}

export interface FanStepInput {
  step: 0 | 1 | 2;
  data: unknown;
}

/** Adım verisini kaydeder; ilerleme (`fanOnboarding.step`) geriye gitmez, böylece sonradan düzenleme tamamlanmayı bozmaz. */
export async function saveFanOnboardingStep(userId: string, input: FanStepInput) {
  await connectDb();
  const uid = oid(userId);
  await ensureUserPreferences(userId);
  const set: Record<string, unknown> = {};
  if (input.step === 0) {
    const { interests } = fanInterestsSchema.parse(input.data);
    set.interests = await onlyKnownCategories(interests);
  } else if (input.step === 1) {
    set.vibes = fanVibesSchema.parse(input.data).vibes;
  } else {
    const c = normalizeConsents(fanPersonalizeSchema.parse(input.data));
    set.recommendationsEnabled = c.recommendationsEnabled;
    set.personalizationConsent = c.personalizationConsent;
    set.aiMemoryEnabled = c.aiMemoryEnabled;
    await audit({ actorId: userId, action: "fan.consents_update", targetType: "UserPreferences", metadata: { ...c } });
  }
  await UserPreferences.updateOne({ userId: uid }, { $set: set, $max: { "fanOnboarding.step": input.step + 1 } });
  return getFanOnboarding(userId);
}

/** Karşılamayı bitirir: tüm tercihler + izinler + tamamlanma zamanı tek seferde yazılır. */
export async function completeFanOnboarding(userId: string, data: unknown) {
  await connectDb();
  const uid = oid(userId);
  await ensureUserPreferences(userId);
  const parsed = fanCompleteSchema.parse(data);
  const consents = normalizeConsents(parsed);
  await UserPreferences.updateOne(
    { userId: uid },
    {
      $set: {
        interests: await onlyKnownCategories(parsed.interests),
        vibes: parsed.vibes,
        recommendationsEnabled: consents.recommendationsEnabled,
        personalizationConsent: consents.personalizationConsent,
        aiMemoryEnabled: consents.aiMemoryEnabled,
        "fanOnboarding.step": FAN_ONBOARDING_DONE,
        "fanOnboarding.completedAt": new Date(),
      },
    },
  );
  await audit({
    actorId: userId,
    action: "fan.onboarding_complete",
    targetType: "UserPreferences",
    metadata: { recommendations: consents.recommendationsEnabled, personalization: consents.personalizationConsent, aiMemory: consents.aiMemoryEnabled },
  });
  return getFanOnboarding(userId);
}

/** "Şimdilik geç": hiçbir tercih yazılmaz, giriş sonrası yeniden yönlendirilmez. */
export async function skipFanOnboarding(userId: string) {
  await connectDb();
  const uid = oid(userId);
  await ensureUserPreferences(userId);
  const current = await UserPreferences.findOne({ userId: uid }, { fanOnboarding: 1 }).lean();
  if (current?.fanOnboarding?.completedAt) return; // tamamlanmışı atlama olarak işaretleme
  await UserPreferences.updateOne({ userId: uid }, { $set: { "fanOnboarding.step": FAN_ONBOARDING_SKIPPED } });
}
