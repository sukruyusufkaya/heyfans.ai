"use server";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth/auth";
import { assertUser } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/errors";
import { birthDateSchema, fanCompleteSchema, fanInterestsSchema, fanPersonalizeSchema, fanVibesSchema } from "@/features/auth/schemas";
import { safeNext } from "@/features/auth/next-url";
import { recordSelfDeclaredAge } from "@/services/auth/age";
import { completeFanOnboarding, saveFanOnboardingStep, skipFanOnboarding } from "@/services/auth/onboarding";
import { resolvePostLoginDestination } from "@/services/auth/post-login";

const nextSchema = z.string().max(500).nullish();

/**
 * Giriş / e-posta doğrulaması sonrası yönlendirme kararı. İstemci dönen yola gider.
 * Sıra: admin → /admin · yaş beyanı yok → /age-verification · creator başvurusu açık → /onboarding/creator
 *       · hayran karşılaması bitmedi → /onboarding/fan · creator → /studio · aksi halde `next` veya /app.
 */
export async function postLoginRedirect(next?: string | null): Promise<ActionResult<{ to: string }>> {
  try {
    const { user } = await assertUser();
    const to = await resolvePostLoginDestination(user, safeNext(nextSchema.parse(next)));
    return { ok: true, data: { to } };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Hayran karşılama ──────────────────────────────────── */
export async function saveFanStepAction(step: 0 | 1 | 2, data: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    if (![0, 1, 2].includes(step)) throw new Error("Geçersiz adım");
    // Şemalar servis içinde de uygulanır; burada erken, anlaşılır doğrulama hatası için bir kez daha çalıştırılır.
    if (step === 0) fanInterestsSchema.parse(data);
    if (step === 1) fanVibesSchema.parse(data);
    if (step === 2) fanPersonalizeSchema.parse(data);
    await saveFanOnboardingStep(user.id, { step, data });
    return { ok: true, data: undefined };
  } catch (err) {
    return toActionError(err);
  }
}

export async function completeFanOnboardingAction(data: unknown, next?: string | null): Promise<ActionResult<{ to: string }>> {
  try {
    const { user } = await assertUser();
    fanCompleteSchema.parse(data);
    await completeFanOnboarding(user.id, data);
    const to = await resolvePostLoginDestination(user, safeNext(nextSchema.parse(next)));
    return { ok: true, data: { to }, message: "Tercihlerin kaydedildi." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function skipFanOnboardingAction(next?: string | null): Promise<ActionResult<{ to: string }>> {
  try {
    const { user } = await assertUser();
    await skipFanOnboarding(user.id);
    const to = await resolvePostLoginDestination(user, safeNext(nextSchema.parse(next)));
    return { ok: true, data: { to } };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Yaş beyanı ────────────────────────────────────────── */
const SESSION_COOKIES = ["hf.session_token", "__Secure-hf.session_token", "hf.session_data", "__Secure-hf.session_data", "hf.dont_remember", "__Secure-hf.dont_remember"];

/**
 * Doğum tarihi beyanı. 18 yaşından küçükse hesap askıya alınır ve oturum kapatılır; sonuç istemciye `over18: false` ile bildirilir.
 * Beyan, güçlü yaş doğrulaması DEĞİLDİR (assuranceLevel: low).
 */
export async function submitBirthDateAction(input: unknown): Promise<ActionResult<{ over18: boolean }>> {
  try {
    const { user } = await assertUser();
    const { birthDate } = birthDateSchema.parse(input);
    const result = await recordSelfDeclaredAge(user.id, birthDate);
    if (!result.over18) {
      try {
        const auth = await getAuth();
        await auth.api.signOut({ headers: await headers() });
      } catch {
        // Oturum zaten silinmiş olabilir; çerezleri aşağıda yine de temizliyoruz.
      }
      const jar = await cookies();
      for (const name of SESSION_COOKIES) jar.delete(name);
    }
    return { ok: true, data: { over18: result.over18 } };
  } catch (err) {
    return toActionError(err);
  }
}
