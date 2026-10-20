"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";
import { assertAdmin } from "@/lib/auth/session";
import { type ActionResult } from "@/lib/errors";
import { toActionError } from "@/lib/action-error";
import { retryFailedJob, updateAiSettings } from "@/services/admin/ai-ops";
import { actorOf, idSchema, reasonSchema } from "./guard";

const retrySchema = z.object({ jobId: idSchema, reason: reasonSchema });

export async function retryJobAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("ai_ops.manage");
    const v = retrySchema.parse(input);
    await retryFailedJob(actorOf(user), v.jobId, v.reason);
    revalidatePath("/admin/ai-operations");
    revalidatePath("/admin");
    return { ok: true, data: undefined, message: t("İş yeniden kuyruğa alındı.") };
  } catch (err) {
    return toActionError(err);
  }
}

const aiSettingsSchema = z.object({
  maxOutputTokens: z.number({ error: m("Geçerli bir sayı girin.") }).int(m("Tamsayı olmalı.")).min(16, m("En az 16 olmalı.")).max(4096, m("En çok 4096 olabilir.")),
  temperature: z.number({ error: m("Geçerli bir sayı girin.") }).min(0, m("0 ile 2 arasında olmalı.")).max(2, m("0 ile 2 arasında olmalı.")),
  monthlyBudgetUsd: z.number({ error: m("Geçerli bir sayı girin.") }).min(0, m("Negatif olamaz.")).max(10_000_000, m("Çok büyük.")),
  reason: reasonSchema,
});

export async function updateAiSettingsAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("ai_ops.manage");
    const v = aiSettingsSchema.parse(input);
    await updateAiSettings(actorOf(user), { maxOutputTokens: v.maxOutputTokens, temperature: v.temperature, monthlyBudgetUsd: v.monthlyBudgetUsd }, v.reason);
    revalidatePath("/admin/ai-operations");
    revalidatePath("/admin/settings");
    return { ok: true, data: undefined, message: t("AI ayarları güncellendi.") };
  } catch (err) {
    return toActionError(err);
  }
}
