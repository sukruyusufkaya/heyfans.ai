"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";
import { assertAdmin } from "@/lib/auth/session";
import { type ActionResult } from "@/lib/errors";
import { toActionError } from "@/lib/action-error";
import { decideCase, readConversationForCase } from "@/services/moderation/moderation";
import { actorOf, idSchema } from "./guard";

const caseSchema = z
  .object({
    caseId: idSchema,
    action: z.enum(["dismiss", "warn", "hide", "remove", "suspend_user", "pause_twin", "revoke_twin", "escalate", "assign_me"]),
    reason: z.string().trim().max(1000).optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (v.action !== "assign_me" && v.reason.length < 5) ctx.addIssue({ code: "custom", path: ["reason"], message: m("Karar gerekçesi en az 5 karakter olmalı.") });
  });

export async function decideCaseAction(input: unknown): Promise<ActionResult> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("moderation.act");
    const v = caseSchema.parse(input);
    await decideCase(actorOf(user), v.caseId, v.action, v.reason);
    revalidatePath("/admin/moderation");
    revalidatePath("/admin/reports");
    revalidatePath("/admin");
    const message =
      v.action === "assign_me" ? t("Vaka üzerinize alındı.") : v.action === "escalate" ? t("Vaka eskale edildi.") : v.action === "dismiss" ? t("Vaka reddedildi (ihlal yok).") : t("Moderasyon kararı uygulandı.");
    return { ok: true, data: undefined, message };
  } catch (err) {
    return toActionError(err);
  }
}

const sensitiveSchema = z.object({
  caseNo: z.string().trim().min(3, m("Vaka numarası gerekli.")).max(40),
  conversationId: idSchema,
  reason: z.string().trim().min(10, m("Erişim gerekçesi en az 10 karakter olmalı.")).max(1000),
});

export interface SensitiveMessage {
  id: string;
  senderType: string;
  body: string;
  status: string;
  createdAt: string;
  flagged: boolean;
}

/** Hassas sohbet erişimi — her çağrı denetim kaydına yazılır (servis katmanı). */
export async function readSensitiveConversationAction(input: unknown): Promise<ActionResult<{ messages: SensitiveMessage[]; caseNo: string }>> {
  try {
    const t = await getT();
    const { user } = await assertAdmin("conversations.read_sensitive");
    const v = sensitiveSchema.parse(input);
    const rows = await readConversationForCase(actorOf(user), v.caseNo, v.conversationId, v.reason);
    const messages: SensitiveMessage[] = rows.map((row) => ({
      id: row._id.toString(),
      senderType: row.senderType,
      body: row.body,
      status: row.status,
      createdAt: new Date(row.createdAt).toISOString(),
      flagged: Boolean(row.safety?.inputFlagged || row.safety?.outputFlagged),
    }));
    return { ok: true, data: { messages, caseNo: v.caseNo }, message: t("{count} mesaj açıldı. Bu erişim denetim kaydına yazıldı.", { count: messages.length }) };
  } catch (err) {
    return toActionError(err);
  }
}
