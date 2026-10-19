"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertUser } from "@/lib/auth/session";
import { AppError, toActionError, type ActionResult } from "@/lib/errors";
import { paymentsConfigured } from "@/lib/payments/provider";
import { rateLimit } from "@/lib/security/rate-limit";
import { idempotencyKeySchema, objectIdSchema, usernameSchema } from "@/lib/validation/common";
import { cancelSubscription, resumeSubscription, startCheckout } from "@/services/billing/checkout";
import { completeMockPayment } from "@/services/billing/mock";
import { deleteConversation } from "@/services/conversations/chat";
import { createCustomRequest, fanUpdateRequest } from "@/services/experiences/custom-requests";
import { sendGift } from "@/services/experiences/gifts";
import { deleteNotification, markNotificationsRead } from "@/services/notifications/notifications";
import {
  createAccountRequest,
  deleteAllMemories,
  deleteCreatorMemories,
  deleteMemory,
  removeUserAvatar,
  setUserAvatar,
  updateMemoryFact,
  updatePreferences,
  updateProfileName,
} from "@/services/fan/account";
import { getChatStatus, startNewConversation } from "@/services/fan/chat";
import { startCheckoutInputSchema, toCheckoutItem } from "./checkout-schema";

/* ─── Ödeme ──────────────────────────────────────────────── */

export async function startCheckoutAction(input: unknown): Promise<ActionResult<{ redirectUrl: string; transactionId: string }>> {
  try {
    const { user } = await assertUser();
    const parsed = startCheckoutInputSchema.parse(input);
    if (!paymentsConfigured().configured) throw new AppError("Ödemeler şu anda alınamıyor: ödeme altyapısı yapılandırılmadı.", "payments_unavailable", 503);
    await rateLimit("checkout", user.id, 20, 3600);
    const res = await startCheckout({ id: user.id, email: user.email, name: user.name }, toCheckoutItem(parsed), parsed.clientKey);
    return { ok: true, data: { redirectUrl: res.redirectUrl, transactionId: res.transactionId } };
  } catch (err) {
    return toActionError(err);
  }
}

export async function completeMockPaymentAction(input: { sessionId: string; outcome: "succeed" | "fail" }): Promise<ActionResult<{ transactionId: string; status: string }>> {
  try {
    const { user } = await assertUser();
    const parsed = z.object({ sessionId: z.string().regex(/^mock_cs_[a-f0-9]{32}$/), outcome: z.enum(["succeed", "fail"]) }).parse(input);
    const res = await completeMockPayment(user.id, parsed.sessionId, parsed.outcome);
    revalidatePath("/app/wallet");
    revalidatePath("/app/subscriptions");
    return { ok: true, data: res };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Abonelik ───────────────────────────────────────────── */

export async function cancelSubscriptionAction(subscriptionId: string): Promise<ActionResult<{ endsAt: string | null }>> {
  try {
    const { user } = await assertUser();
    objectIdSchema.parse(subscriptionId);
    const res = await cancelSubscription(user.id, subscriptionId);
    revalidatePath("/app/subscriptions");
    return { ok: true, data: { endsAt: res.endsAt ? new Date(res.endsAt).toISOString() : null }, message: "Üyelik dönem sonunda sona erecek. O tarihe kadar erişimin sürer." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function resumeSubscriptionAction(subscriptionId: string): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    objectIdSchema.parse(subscriptionId);
    await resumeSubscription(user.id, subscriptionId);
    revalidatePath("/app/subscriptions");
    return { ok: true, data: undefined, message: "Üyeliğin devam edecek." };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Özel talepler ──────────────────────────────────────── */

export async function createRequestAction(input: unknown): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    const { user } = await assertUser();
    await rateLimit("custom_request", user.id, 10, 3600);
    const req = await createCustomRequest(user.id, input);
    revalidatePath("/app/experiences");
    revalidatePath("/app/wallet");
    return {
      ok: true,
      data: { id: req._id.toString(), status: req.status },
      message: req.status === "pending" ? "Talebin içerik üreticisine iletildi. Kredi, talep sonuçlanana kadar bloke edildi." : "Talep taslak olarak kaydedildi.",
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function fanRequestAction(input: { id: string; action: "submit" | "cancel" }): Promise<ActionResult<{ status: string }>> {
  try {
    const { user } = await assertUser();
    const parsed = z.object({ id: objectIdSchema, action: z.enum(["submit", "cancel"]) }).parse(input);
    const doc = await fanUpdateRequest(user.id, parsed.id, parsed.action);
    revalidatePath("/app/experiences");
    revalidatePath("/app/wallet");
    return { ok: true, data: { status: doc.status }, message: parsed.action === "submit" ? "Talep gönderildi." : "Talep iptal edildi; bloke edilen kredi iade edildi." };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Hediye / bahşiş ────────────────────────────────────── */

const giftSchema = z.object({
  username: usernameSchema,
  kind: z.enum(["gift", "tip"]),
  giftKey: z.string().regex(/^[a-z0-9_-]{1,40}$/).optional(),
  credits: z.number().int().min(5, "Bahşiş en az 5 kredi olmalı").max(50_000).optional(),
  message: z.string().trim().max(300, "Not en fazla 300 karakter olabilir").optional(),
  anonymous: z.boolean().optional(),
  clientKey: idempotencyKeySchema,
});

export async function sendGiftAction(input: unknown): Promise<ActionResult<{ credits: number }>> {
  try {
    const { user } = await assertUser();
    const parsed = giftSchema.parse(input);
    if (parsed.kind === "gift" && !parsed.giftKey) throw new AppError("Bir hediye seç.", "gift_required");
    if (parsed.kind === "tip" && !parsed.credits) throw new AppError("Bahşiş miktarını gir.", "tip_required");
    await rateLimit("gift", user.id, 30, 3600);
    const gift = await sendGift(user.id, parsed);
    revalidatePath("/app/gifts");
    revalidatePath("/app/wallet");
    return { ok: true, data: { credits: gift.credits }, message: parsed.kind === "gift" ? "Hediyen gönderildi." : "Bahşişin gönderildi. Teşekkürler!" };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Bildirimler ────────────────────────────────────────── */

export async function markNotificationsReadAction(ids?: string[]): Promise<ActionResult<{ updated: number }>> {
  try {
    const { user } = await assertUser();
    const parsed = z.array(objectIdSchema).max(100).optional().parse(ids);
    if (parsed && !parsed.length) return { ok: true, data: { updated: 0 } };
    const updated = await markNotificationsRead(user.id, parsed);
    revalidatePath("/app/notifications");
    return { ok: true, data: { updated } };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteNotificationAction(id: string): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    objectIdSchema.parse(id);
    await deleteNotification(user.id, id);
    revalidatePath("/app/notifications");
    return { ok: true, data: undefined, message: "Bildirim silindi." };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Sohbet ─────────────────────────────────────────────── */

export async function deleteConversationAction(conversationId: string): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    objectIdSchema.parse(conversationId);
    await deleteConversation(user.id, conversationId);
    revalidatePath("/chat");
    return { ok: true, data: undefined, message: "Sohbet silindi." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function newConversationAction(username: string): Promise<ActionResult<{ conversationId: string }>> {
  try {
    const { user } = await assertUser();
    const res = await startNewConversation(user.id, usernameSchema.parse(username));
    revalidatePath("/chat");
    return { ok: true, data: res, message: "Yeni sohbet başlatıldı. Önceki konuşma arşivlendi." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function chatStatusAction(username: string, conversationId?: string) {
  try {
    const { user } = await assertUser();
    return { ok: true as const, data: await getChatStatus(user.id, usernameSchema.parse(username), conversationId ? objectIdSchema.parse(conversationId) : undefined) };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Kişiselleştirme / hafıza ───────────────────────────── */

export async function updatePreferencesAction(patch: unknown): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    await updatePreferences(user.id, patch);
    revalidatePath("/app/personalization");
    revalidatePath("/app/settings");
    revalidatePath("/app/profile");
    revalidatePath("/app");
    return { ok: true, data: undefined, message: "Tercihlerin kaydedildi." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateMemoryAction(input: { id: string; fact: string }): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    await updateMemoryFact(user.id, objectIdSchema.parse(input.id), input.fact);
    revalidatePath("/app/personalization");
    return { ok: true, data: undefined, message: "Hafıza kaydı güncellendi." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteMemoryAction(id: string): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    await deleteMemory(user.id, objectIdSchema.parse(id));
    revalidatePath("/app/personalization");
    return { ok: true, data: undefined, message: "Hafıza kaydı silindi." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteCreatorMemoriesAction(creatorId: string): Promise<ActionResult<{ deleted: number }>> {
  try {
    const { user } = await assertUser();
    const deleted = await deleteCreatorMemories(user.id, objectIdSchema.parse(creatorId));
    revalidatePath("/app/personalization");
    return { ok: true, data: { deleted }, message: `${deleted} hafıza kaydı silindi.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteAllMemoriesAction(): Promise<ActionResult<{ deleted: number }>> {
  try {
    const { user } = await assertUser();
    const deleted = await deleteAllMemories(user.id);
    revalidatePath("/app/personalization");
    return { ok: true, data: { deleted }, message: "Tüm AI hafızan silindi." };
  } catch (err) {
    return toActionError(err);
  }
}

/* ─── Profil / hesap ─────────────────────────────────────── */

export async function updateProfileNameAction(name: string): Promise<ActionResult<{ name: string }>> {
  try {
    const { user } = await assertUser();
    const res = await updateProfileName(user.id, name);
    revalidatePath("/app/profile");
    return { ok: true, data: res, message: "Profilin güncellendi." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setAvatarAction(assetId: string): Promise<ActionResult<{ image: string }>> {
  try {
    const { user } = await assertUser();
    const res = await setUserAvatar(user.id, objectIdSchema.parse(assetId));
    revalidatePath("/app/profile");
    return { ok: true, data: res, message: "Profil fotoğrafın güncellendi." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function removeAvatarAction(): Promise<ActionResult> {
  try {
    const { user } = await assertUser();
    await removeUserAvatar(user.id);
    revalidatePath("/app/profile");
    return { ok: true, data: undefined, message: "Profil fotoğrafın kaldırıldı." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function accountRequestAction(kind: "delete_account" | "export_data"): Promise<ActionResult<{ ticketNo: string; existing: boolean }>> {
  try {
    const { user } = await assertUser();
    const res = await createAccountRequest({ id: user.id, name: user.name, email: user.email }, z.enum(["delete_account", "export_data"]).parse(kind));
    revalidatePath("/app/settings");
    return {
      ok: true,
      data: res,
      message: res.existing ? `Bu talep zaten açık (${res.ticketNo}). Destek ekibi inceliyor.` : `Talebin alındı (${res.ticketNo}). Destek ekibimiz kimliğini doğrulayarak işleme alacak.`,
    };
  } catch (err) {
    return toActionError(err);
  }
}
