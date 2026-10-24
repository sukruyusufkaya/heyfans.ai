"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { assertUser } from "@/lib/auth/session";
import { getT } from "@/i18n/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { toActionError } from "@/lib/action-error";
import { usernameField } from "@/features/auth/schemas";
import { isAssistantStep } from "@/features/auth/constants";
import { connectDb } from "@/lib/db/mongo";
import { CreatorProfile } from "@/models/creator";
import { startCreatorOnboarding } from "@/services/creators/onboarding";
import { answerAssistantStep, getCreatorAssistantView, submitAssistantApplication, type CreatorAssistantView } from "@/services/auth/creator-assistant";

async function requestIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}

async function viewOrThrow(userId: string) {
  const view = await getCreatorAssistantView(userId);
  if (!view) throw new AppError("Önce içerik üreticisi yolculuğunu başlat.", "onboarding_not_started", 409);
  return view;
}

/** İçerik üreticisi yolculuğunu başlatır (profil + creator rolü + boş AI ikizi taslağı). */
export async function startCreatorOnboardingAction(): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    await startCreatorOnboarding(user.id);
    revalidatePath("/onboarding/creator");
    return { ok: true, data: undefined };
  } catch (err) {
    return toActionError(err);
  }
}

/** Kullanıcı adı sorusu sırasında uygunluk (kendi mevcut adı uygundur). */
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

/** Asistan görünümünü yeniden okur (ör. yaş beyanından sonra). */
export async function refreshCreatorAssistantAction(): Promise<ActionResult<CreatorAssistantView>> {
  try {
    const { user } = await assertUser();
    return { ok: true, data: await viewOrThrow(user.id) };
  } catch (err) {
    return toActionError(err);
  }
}

/** Asistanın bir sorusunu yanıtlar; güncel görünümü döndürür (sohbet sıradaki soruyla devam eder). */
export async function answerCreatorAssistantAction(step: string, payload: unknown): Promise<ActionResult<CreatorAssistantView>> {
  try {
    const { user } = await assertUser();
    if (!isAssistantStep(step) || step === "birthDate") throw new Error("Geçersiz adım"); // i18n-ignore (iç savunma; kullanıcıya gösterilmez)
    await answerAssistantStep(user.id, step, payload, await requestIp());
    return { ok: true, data: await viewOrThrow(user.id) };
  } catch (err) {
    return toActionError(err);
  }
}

/** Özet kartındaki "Başvuruyu Gönder": başvuru ve AI ikizi sürümü incelemeye gider. */
export async function submitCreatorAssistantAction(): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    const t = await getT();
    await submitAssistantApplication(user.id);
    revalidatePath("/onboarding/creator");
    return { ok: true, data: undefined, message: t("Başvurun incelemeye gönderildi.") };
  } catch (err) {
    return toActionError(err);
  }
}
