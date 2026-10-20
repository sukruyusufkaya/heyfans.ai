"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";
import { assertAdmin } from "@/lib/auth/session";
import { type ActionResult } from "@/lib/errors";
import { toActionError } from "@/lib/action-error";
import { replyToTicket, setTicketStatus, updateReportStatus } from "@/services/admin/reports";
import { decideAppeal } from "@/services/moderation/moderation";
import { actorOf, idSchema, reasonSchema } from "./guard";

function refresh() {
  revalidatePath("/admin/reports");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin");
}

const reportSchema = z.object({ reportId: idSchema, to: z.enum(["triaged", "resolved", "rejected"]), reason: reasonSchema });

export async function updateReportStatusAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("reports.manage");
    const v = reportSchema.parse(input);
    await updateReportStatus(actorOf(user), v.reportId, v.to, v.reason);
    refresh();
    return { ok: true, data: undefined, message: v.to === "triaged" ? t("Rapor incelemeye alındı.") : v.to === "resolved" ? t("Rapor çözüldü olarak işaretlendi.") : t("Rapor reddedildi.") };
  } catch (err) {
    return toActionError(err);
  }
}

const appealSchema = z.object({ appealId: idSchema, decision: z.enum(["upheld", "overturned"]), reason: reasonSchema });

export async function decideAppealAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("appeals.manage");
    const v = appealSchema.parse(input);
    await decideAppeal(actorOf(user), v.appealId, v.decision, v.reason);
    refresh();
    return { ok: true, data: undefined, message: v.decision === "overturned" ? t("İtiraz kabul edildi; moderasyon kararı kaldırıldı.") : t("İtiraz reddedildi; karar korundu.") };
  } catch (err) {
    return toActionError(err);
  }
}

const replySchema = z.object({ ticketId: idSchema, body: z.string().trim().min(2, m("Yanıt boş olamaz.")).max(5000, m("Yanıt en çok 5000 karakter olabilir.")) });

export async function replyTicketAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("support.manage");
    const v = replySchema.parse(input);
    await replyToTicket(actorOf(user), v.ticketId, v.body);
    refresh();
    return { ok: true, data: undefined, message: t("Yanıt gönderildi.") };
  } catch (err) {
    return toActionError(err);
  }
}

const ticketStatusSchema = z.object({ ticketId: idSchema, status: z.enum(["open", "pending", "resolved", "closed"]) });

export async function setTicketStatusAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("support.manage");
    const v = ticketStatusSchema.parse(input);
    await setTicketStatus(actorOf(user), v.ticketId, v.status);
    refresh();
    return { ok: true, data: undefined, message: t("Talep durumu güncellendi.") };
  } catch (err) {
    return toActionError(err);
  }
}
