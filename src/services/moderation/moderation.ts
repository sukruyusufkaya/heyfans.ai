import "server-only";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { connectDb } from "@/lib/db/mongo";
import { AppError, NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { rateLimit } from "@/lib/security/rate-limit";
import { oid } from "@/lib/validation/common";
import { User } from "@/models/identity";
import { ContentItem } from "@/models/content";
import { CreatorProfile } from "@/models/creator";
import { AiTwin } from "@/models/ai";
import { Conversation, Message } from "@/models/social";
import { Appeal, ModerationCase, Report, REPORT_REASONS, type IModerationCase, type ModerationTarget } from "@/models/safety";
import { adminSetTwinStatus } from "@/services/ai-twins/lifecycle";
import { moderateContent } from "@/services/content/manage";
import { notify } from "@/services/notifications/notifications";

const code = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}${randomInt(10, 99)}`;

export const reportSchema = z.object({
  targetType: z.enum(["content", "message", "twin", "profile", "user", "custom_request"]),
  targetId: z.string().regex(/^[a-f0-9]{24}$/i),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(3000).optional().default(""),
});

const PRIORITY: Record<string, IModerationCase["priority"]> = { minor_safety: "critical", self_harm: "critical", impersonation: "high", harassment: "high", sexual_content: "high", hate: "high", privacy: "high", copyright: "medium", ai_misbehavior: "medium", spam: "low", other: "low" };

/** Kullanıcı bildirimi: rapor + (yoksa) moderasyon vakası. Aynı hedefe tekrar bildirim mevcut vakaya bağlanır. */
export async function createReport(reporter: { id: string } | { email: string }, raw: unknown) {
  const input = reportSchema.parse(raw);
  await connectDb();
  const key = "id" in reporter ? reporter.id : reporter.email;
  await rateLimit("report", key, 10, 3600);
  const targetId = oid(input.targetId);
  let creatorId = null as null | import("mongoose").Types.ObjectId;
  let subjectUserId = null as null | import("mongoose").Types.ObjectId;
  if (input.targetType === "content") creatorId = (await ContentItem.findById(targetId, { creatorId: 1 }).lean())?.creatorId ?? null;
  if (input.targetType === "profile") {
    const c = await CreatorProfile.findById(targetId, { userId: 1 }).lean();
    creatorId = c?._id ?? null;
    subjectUserId = c?.userId ?? null;
  }
  if (input.targetType === "twin") creatorId = (await AiTwin.findById(targetId, { creatorId: 1 }).lean())?.creatorId ?? null;
  if (input.targetType === "message") {
    const msg = await Message.findById(targetId, { creatorId: 1, conversationId: 1, userId: 1 }).lean();
    if ("id" in reporter && msg && !msg.userId.equals(oid(reporter.id))) throw new AppError("Yalnız kendi sohbetindeki mesajları bildirebilirsin.", "forbidden", 403);
    creatorId = msg?.creatorId ?? null;
    if (msg) await Conversation.updateOne({ _id: msg.conversationId }, { $set: { status: "reported" } });
  }
  if (input.targetType === "user") subjectUserId = targetId;

  let caseDoc = await ModerationCase.findOne({ targetType: input.targetType, targetId, status: { $in: ["open", "in_review", "escalated"] } });
  if (!caseDoc) {
    caseDoc = await ModerationCase.create({
      caseNo: code("MOD"),
      targetType: input.targetType as ModerationTarget,
      targetId,
      creatorId,
      subjectUserId,
      source: "report",
      reason: `Kullanıcı bildirimi: ${input.reason}`,
      categories: [input.reason],
      riskScore: PRIORITY[input.reason] === "critical" ? 95 : PRIORITY[input.reason] === "high" ? 70 : 40,
      priority: PRIORITY[input.reason] ?? "medium",
    });
  } else if (PRIORITY[input.reason] === "critical") {
    caseDoc.priority = "critical";
    await caseDoc.save();
  }
  const report = await Report.create({
    reportNo: code("RPT"),
    reporterId: "id" in reporter ? oid(reporter.id) : null,
    reporterEmail: "email" in reporter ? reporter.email : null,
    targetType: input.targetType,
    targetId,
    creatorId,
    reason: input.reason,
    details: input.details,
    caseId: caseDoc._id,
  });
  await ModerationCase.updateOne({ _id: caseDoc._id }, { $addToSet: { reportIds: report._id } });
  return { reportNo: report.reportNo, caseNo: caseDoc.caseNo };
}

export type CaseAction = "dismiss" | "warn" | "hide" | "remove" | "suspend_user" | "pause_twin" | "revoke_twin" | "escalate" | "assign_me";

/** Moderasyon kararı: içerik/ikiz/kullanıcıya uygulanır, vaka geçmişi + denetim kaydı yazılır. */
export async function decideCase(actor: { id: string; adminRole: string | null }, caseId: string, action: CaseAction, note: string) {
  await connectDb();
  const c = await ModerationCase.findById(oid(caseId));
  if (!c) throw new NotFoundError("Vaka bulunamadı.");
  if (action !== "assign_me" && note.trim().length < 5) throw new AppError("Karar gerekçesi en az 5 karakter olmalı.", "reason_required");
  const from = c.status;
  if (action === "assign_me") {
    c.assignedTo = oid(actor.id);
    c.status = "in_review";
  } else if (action === "escalate") {
    c.status = "escalated";
    c.priority = "critical";
  } else {
    if (action === "hide" || action === "remove") {
      if (c.targetType !== "content") throw new AppError("Gizleme/kaldırma yalnız içerik vakalarında kullanılır.", "invalid_action");
      await moderateContent(actor, c.targetId.toString(), action, note, c._id.toString());
    }
    if (action === "pause_twin" || action === "revoke_twin") {
      const twinId = c.targetType === "twin" ? c.targetId : (await AiTwin.findOne({ creatorId: c.creatorId }, { _id: 1 }).lean())?._id;
      if (!twinId) throw new AppError("İlgili AI ikizi bulunamadı.", "no_twin");
      await adminSetTwinStatus(actor, twinId.toString(), action === "pause_twin" ? "paused" : "revoked", note);
    }
    if (action === "suspend_user") {
      const uid = c.subjectUserId ?? (c.creatorId ? (await CreatorProfile.findById(c.creatorId, { userId: 1 }).lean())?.userId : null);
      if (!uid) throw new AppError("İlgili kullanıcı bulunamadı.", "no_user");
      await User.updateOne({ _id: uid }, { $set: { status: "suspended", statusReason: note } });
      const { getNativeDb } = await import("@/lib/db/mongo");
      await (await getNativeDb()).collection("sessions").deleteMany({ userId: uid });
    }
    c.status = action === "dismiss" ? "dismissed" : "actioned";
    c.decision = { action: action === "dismiss" ? "none" : (action as "warn"), note, by: oid(actor.id), at: new Date() };
    await Report.updateMany({ caseId: c._id, status: { $in: ["open", "triaged"] } }, { $set: { status: action === "dismiss" ? "rejected" : "resolved", resolutionNote: note } });
    if (action === "warn" && c.creatorId) {
      const cr = await CreatorProfile.findById(c.creatorId, { userId: 1 }).lean();
      if (cr) await notify(cr.userId.toString(), { type: "moderation", title: "Topluluk kuralları uyarısı", body: note, link: "/community-guidelines" });
    }
  }
  c.history.push({ from, to: c.status, by: oid(actor.id), note: `${action}: ${note}`.slice(0, 2000), at: new Date() });
  await c.save();
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: `moderation.${action}`, targetType: "ModerationCase", targetId: caseId, reason: note, severity: ["suspend_user", "revoke_twin", "remove"].includes(action) ? "critical" : "notice" });
  return c.toObject();
}

export async function createAppeal(userId: string, caseNo: string, reason: string) {
  await connectDb();
  if (reason.trim().length < 20) throw new AppError("İtiraz gerekçesi en az 20 karakter olmalı.", "reason_short");
  const c = await ModerationCase.findOne({ caseNo }).lean();
  if (!c || !["actioned", "dismissed"].includes(c.status)) throw new NotFoundError("İtiraz edilebilir vaka bulunamadı.");
  const owner = c.subjectUserId?.equals(oid(userId)) || (c.creatorId && (await CreatorProfile.exists({ _id: c.creatorId, userId: oid(userId) })));
  if (!owner) throw new AppError("Bu vakaya yalnız ilgili kişi itiraz edebilir.", "forbidden", 403);
  const appeal = await Appeal.create({ appealNo: code("APL"), userId: oid(userId), caseId: c._id, reason: reason.trim(), history: [{ from: null, to: "open", by: oid(userId), at: new Date() }] });
  return appeal.toObject();
}

export async function decideAppeal(actor: { id: string; adminRole: string | null }, appealId: string, decision: "upheld" | "overturned", note: string) {
  await connectDb();
  const a = await Appeal.findById(oid(appealId));
  if (!a || !["open", "in_review"].includes(a.status)) throw new NotFoundError("Açık itiraz bulunamadı.");
  a.history.push({ from: a.status, to: decision, by: oid(actor.id), note, at: new Date() });
  a.status = decision;
  a.decidedBy = oid(actor.id);
  a.decisionNote = note;
  await a.save();
  if (decision === "overturned") {
    const c = await ModerationCase.findById(a.caseId).lean();
    if (c?.targetType === "content" && c.decision && ["hide", "remove"].includes(c.decision.action)) await moderateContent(actor, c.targetId.toString(), "restore", `İtiraz kabul edildi: ${note}`);
  }
  await notify(a.userId.toString(), { type: "moderation", title: decision === "overturned" ? "İtirazın kabul edildi" : "İtirazın değerlendirildi", body: note, link: "/help" });
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: `appeal.${decision}`, targetType: "Appeal", targetId: appealId, reason: note, severity: "notice" });
  return a.toObject();
}

/**
 * Hassas sohbet erişimi: yalnız `conversations.read_sensitive` izni + vaka numarası + gerekçe ile,
 * her okuma denetim kaydına yazılır. Creator'lar hayran sohbetlerini bu yolla göremez.
 */
export async function readConversationForCase(actor: { id: string; adminRole: string | null }, caseNo: string, conversationId: string, reason: string) {
  await connectDb();
  if (reason.trim().length < 10) throw new AppError("Erişim gerekçesi en az 10 karakter olmalı.", "reason_required");
  const c = await ModerationCase.findOne({ caseNo, status: { $in: ["open", "in_review", "escalated"] } }).lean();
  if (!c) throw new NotFoundError("Açık vaka bulunamadı.");
  const conv = await Conversation.findById(oid(conversationId)).lean();
  if (!conv) throw new NotFoundError("Sohbet bulunamadı.");
  const related = (c.targetType === "message" && (await Message.exists({ _id: c.targetId, conversationId: conv._id }))) || (c.creatorId && conv.creatorId.equals(c.creatorId));
  if (!related) throw new AppError("Sohbet bu vakayla ilişkili değil.", "unrelated", 403);
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "conversation.sensitive_read", targetType: "Conversation", targetId: conversationId, reason, severity: "critical", metadata: { caseNo } });
  return Message.find({ conversationId: conv._id }).sort({ createdAt: 1 }).limit(200).lean();
}
