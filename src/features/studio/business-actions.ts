"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { m } from "@/i18n/m";
import { getT } from "@/i18n/server";
import { type ActionResult } from "@/lib/errors";
import { toActionError } from "@/lib/action-error";
import { creatorUpdateRequest } from "@/services/experiences/custom-requests";
import { requestPayout, savePayoutAccount } from "@/services/payouts/payouts";
import { savePlan, setPlanStatus } from "@/services/studio/plans";
import { updateCreatorProfile } from "@/services/studio/profile";
import { saveNotificationPrefs } from "@/services/studio/settings";
import { creatorUserId } from "./server-helpers";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/i, m("Geçersiz kimlik"));

/* ─── Üyelik planları ─── */
export async function savePlanAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const userId = await creatorUserId();
    const { id, plan } = z.object({ id: idSchema.nullable().optional(), plan: z.unknown() }).parse(input);
    await savePlan(userId, plan, id ?? undefined);
    revalidatePath("/studio/memberships");
    return { ok: true, data: undefined, message: id ? t("Plan güncellendi. Fiyat değişikliği yalnız yeni aboneliklere uygulanır.") : t("Plan oluşturuldu.") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setPlanStatusAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const userId = await creatorUserId();
    const { id, status } = z.object({ id: idSchema, status: z.enum(["active", "archived"]) }).parse(input);
    await setPlanStatus(userId, id, status);
    revalidatePath("/studio/memberships");
    return { ok: true, data: undefined, message: status === "archived" ? t("Plan arşivlendi; yeni abonelik alınmaz.") : t("Plan yeniden etkinleştirildi.") };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Özel talepler ─── */
export async function requestActionAction(input: unknown): Promise<ActionResult<{ status: string }>> {
  try {
    const t = await getT();
    const userId = await creatorUserId();
    const { id, action, note, deliverableAssetIds } = z
      .object({
        id: idSchema,
        action: z.enum(["review", "approve", "reject", "start", "complete"]),
        note: z.string().trim().max(2000).optional(),
        deliverableAssetIds: z.array(idSchema).max(10).optional(),
      })
      .parse(input);
    const doc = await creatorUpdateRequest(userId, id, action, { note, deliverableAssetIds });
    revalidatePath("/studio/requests");
    revalidatePath("/studio", "layout");
    revalidatePath("/studio/earnings");
    const msg = { review: m("Talep incelemeye alındı."), approve: m("Talep onaylandı."), reject: m("Talep reddedildi; kredi hayrana iade edildi."), start: m("Talep işleme alındı."), complete: m("Talep teslim edildi ve kazancın hesabına yansıdı.") } as const;
    return { ok: true, data: { status: doc.status }, message: t(msg[action]) };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Ödemeler ─── */
export async function savePayoutAccountAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const userId = await creatorUserId();
    const v = z
      .object({
        holderName: z.string().trim().min(3, m("Hesap sahibi adını girin")).max(120),
        iban: z.string().trim().min(10, m("IBAN girin")).max(42),
        bankName: z.string().trim().max(80).optional(),
      })
      .parse(input);
    await savePayoutAccount(userId, v);
    revalidatePath("/studio/payouts");
    return { ok: true, data: undefined, message: t("Ödeme hesabın kaydedildi. Doğrulama sonrası ödeme talep edebilirsin.") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function requestPayoutAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const userId = await creatorUserId();
    const v = z.object({ amountMinor: z.number().int().positive(), idempotencyKey: z.string().trim().min(8).max(100).regex(/^[A-Za-z0-9:_-]+$/) }).parse(input);
    await requestPayout(userId, v.amountMinor, v.idempotencyKey);
    revalidatePath("/studio/payouts");
    revalidatePath("/studio/earnings");
    return { ok: true, data: undefined, message: t("Ödeme talebin alındı.") };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Profil ve ayarlar ─── */
export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    await updateCreatorProfile(await creatorUserId(), input);
    revalidatePath("/studio/profile");
    revalidatePath("/studio", "layout");
    return { ok: true, data: undefined, message: t("Profilin güncellendi.") };
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveNotificationPrefsAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    await saveNotificationPrefs(await creatorUserId(), input);
    revalidatePath("/studio/settings");
    return { ok: true, data: undefined, message: t("Bildirim tercihlerin kaydedildi.") };
  } catch (err) {
    return toActionError(err);
  }
}
