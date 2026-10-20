import "server-only";
import type { PipelineStage } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import { oid, paged } from "@/lib/validation/common";
import { AiTwin } from "@/models/ai";
import { ContentItem } from "@/models/content";
import { CreatorProfile } from "@/models/creator";
import { User } from "@/models/identity";
import { CustomRequest } from "@/models/monetization";
import { Conversation, Message } from "@/models/social";
import { Appeal, ModerationCase, Report, type IModerationCase } from "@/models/safety";
import { daysAgo, loadCreators, loadUsers, REGEX_SAFE } from "./shared";
import { getT } from "@/i18n/server";

export const CASE_TABS = ["open", "in_review", "escalated", "closed", "all"] as const;
export type CaseTab = (typeof CASE_TABS)[number];
const PAGE_SIZE = 12;
const OPEN_STATUSES: IModerationCase["status"][] = ["open", "in_review", "escalated"];

function tabFilter(tab: CaseTab) {
  if (tab === "all") return {};
  if (tab === "closed") return { status: { $in: ["actioned", "dismissed"] } };
  return { status: tab };
}

export async function getModerationKpis() {
  await connectDb();
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const [byStatus, highRisk, decidedToday, decided30, appeals30] = await Promise.all([
    ModerationCase.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ModerationCase.countDocuments({ status: { $in: OPEN_STATUSES }, priority: { $in: ["high", "critical"] } }),
    ModerationCase.countDocuments({ "decision.at": { $gte: startOfDay } }),
    ModerationCase.find({ "decision.at": { $gte: daysAgo(30, now) } }, { createdAt: 1, decision: 1 }).lean<Pick<IModerationCase, "createdAt" | "decision">[]>(),
    Appeal.countDocuments({ createdAt: { $gte: daysAgo(30, now) } }),
  ]);
  const counts: Record<string, number> = { open: 0, in_review: 0, escalated: 0, actioned: 0, dismissed: 0 };
  for (const r of byStatus) counts[r._id] = r.n;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const tabCounts: Record<string, number> = { ...counts, closed: (counts.actioned ?? 0) + (counts.dismissed ?? 0), all: total };
  const durations = decided30.map((c) => (c.decision ? new Date(c.decision.at).getTime() - new Date(c.createdAt).getTime() : null)).filter((d): d is number => d !== null && d >= 0);
  const avgResolutionMs = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  const within24h = durations.filter((d) => d <= 86_400_000).length;
  const recent = await ModerationCase.countDocuments({ createdAt: { $gte: daysAgo(30, now) } });
  const auto = await ModerationCase.countDocuments({ createdAt: { $gte: daysAgo(30, now) }, source: { $in: ["auto", "pre_publish"] } });
  return {
    counts: tabCounts,
    pending: counts.open ?? 0,
    highRisk,
    decidedToday,
    avgResolutionMs,
    metrics: {
      sampleSize: durations.length,
      slaWithin24hPct: durations.length ? Math.round((within24h / durations.length) * 100) : null,
      autoSharePct: recent ? Math.round((auto / recent) * 100) : null,
      humanSharePct: recent ? Math.round(((recent - auto) / recent) * 100) : null,
      appealRatePct: decided30.length ? Math.round((appeals30 / decided30.length) * 1000) / 10 : null,
      recent30: recent,
    },
  };
}

export async function listCases(opts: { tab: CaseTab; q: string; priority: string; target: string; page: number }) {
  await connectDb();
  const match: Record<string, unknown> = { ...tabFilter(opts.tab) };
  if (["low", "medium", "high", "critical"].includes(opts.priority)) match.priority = opts.priority;
  if (opts.target && opts.target !== "all") match.targetType = opts.target;
  if (opts.q) match.caseNo = { $regex: REGEX_SAFE(opts.q), $options: "i" };
  const pipeline: PipelineStage[] = [
    { $match: match },
    { $addFields: { pr: { $switch: { branches: [{ case: { $eq: ["$priority", "critical"] }, then: 4 }, { case: { $eq: ["$priority", "high"] }, then: 3 }, { case: { $eq: ["$priority", "medium"] }, then: 2 }], default: 1 } } } },
    { $sort: opts.tab === "closed" || opts.tab === "all" ? { createdAt: -1 } : { pr: -1, createdAt: 1 } },
    { $skip: (opts.page - 1) * PAGE_SIZE },
    { $limit: PAGE_SIZE },
  ];
  const [rows, total] = await Promise.all([ModerationCase.aggregate<IModerationCase>(pipeline), ModerationCase.countDocuments(match)]);
  const creators = await loadCreators(rows.map((r) => r.creatorId));
  const items = rows.map((c) => ({
    id: c._id.toString(),
    caseNo: c.caseNo,
    reason: c.reason,
    targetType: c.targetType,
    priority: c.priority,
    riskScore: c.riskScore,
    status: c.status,
    source: c.source,
    creator: c.creatorId ? creators.get(c.creatorId.toString())?.displayName ?? null : null,
    creatorAvatar: c.creatorId ? creators.get(c.creatorId.toString())?.avatarUrl ?? null : null,
    createdAt: c.createdAt,
  }));
  return paged(items, total, opts.page, PAGE_SIZE);
}

async function previewTarget(c: IModerationCase) {
  switch (c.targetType) {
    case "content": {
      const x = await ContentItem.findById(c.targetId, { title: 1, type: 1, status: 1, caption: 1, access: 1, "moderation.state": 1, creatorId: 1, createdAt: 1 }).lean();
      if (!x) return { kind: "missing" as const };
      return { kind: "content" as const, title: x.title, type: x.type, status: x.status, access: x.access, caption: (x.caption ?? "").slice(0, 280), moderationState: x.moderation?.state ?? "none", createdAt: x.createdAt };
    }
    case "profile": {
      const x = await CreatorProfile.findById(c.targetId, { displayName: 1, username: 1, headline: 1, bio: 1, status: 1 }).lean();
      if (!x) return { kind: "missing" as const };
      return { kind: "profile" as const, displayName: x.displayName, username: x.username, headline: x.headline ?? null, bio: (x.bio ?? "").slice(0, 280), status: x.status, creatorId: x._id.toString() };
    }
    case "twin": {
      const x = await AiTwin.findById(c.targetId, { status: 1, currentVersion: 1, "draft.persona.displayName": 1, "draft.persona.shortBio": 1 }).lean<{ status: string; currentVersion: number; draft: { persona: { displayName: string; shortBio: string } } }>();
      if (!x) return { kind: "missing" as const };
      return { kind: "twin" as const, name: x.draft.persona.displayName, shortBio: x.draft.persona.shortBio, status: x.status, version: x.currentVersion, twinId: String(c.targetId) };
    }
    case "message": {
      // Mesaj gövdesi bilerek GÖSTERİLMEZ: hassas konuşma içeriğine yalnız denetimli erişim formuyla ulaşılır.
      const x = await Message.findById(c.targetId, { senderType: 1, status: 1, conversationId: 1, createdAt: 1, "safety.inputFlagged": 1, "safety.outputFlagged": 1, "safety.categories": 1, "safety.action": 1 }).lean();
      if (!x) return { kind: "missing" as const };
      return { kind: "message" as const, senderType: x.senderType, status: x.status, conversationId: x.conversationId.toString(), createdAt: x.createdAt, flagged: Boolean(x.safety?.inputFlagged || x.safety?.outputFlagged), categories: x.safety?.categories ?? [], safetyAction: x.safety?.action ?? "none" };
    }
    case "user": {
      const x = await User.findById(c.targetId, { name: 1, email: 1, status: 1 }).lean();
      if (!x) return { kind: "missing" as const };
      return { kind: "user" as const, name: x.name, email: x.email, status: x.status, userId: x._id.toString() };
    }
    case "custom_request": {
      const x = await CustomRequest.findById(c.targetId, { title: 1, type: 1, status: 1, priceCredits: 1 }).lean();
      if (!x) return { kind: "missing" as const };
      return { kind: "custom_request" as const, title: x.title, type: x.type, status: x.status, priceCredits: x.priceCredits };
    }
  }
}

export type CasePreview = Awaited<ReturnType<typeof previewTarget>>;

export async function getCaseDetail(caseId: string, opts: { includeConversations: boolean }) {
  const t = await getT();
  await connectDb();
  const c = await ModerationCase.findById(oid(caseId)).lean<IModerationCase>();
  if (!c) return null;
  const [target, reports, appeals, creator] = await Promise.all([
    previewTarget(c),
    Report.find({ caseId: c._id }).sort({ createdAt: -1 }).limit(10).lean(),
    Appeal.find({ caseId: c._id }).sort({ createdAt: -1 }).limit(5).lean(),
    c.creatorId ? CreatorProfile.findById(c.creatorId, { displayName: 1, username: 1 }).lean() : null,
  ]);
  const actors = await loadUsers([c.assignedTo, c.decision?.by, ...c.history.map((h) => h.by)]);
  const name = (id: unknown) => (id ? actors.get(String(id))?.name ?? t("Yönetici") : t("Sistem"));

  // Hassas erişim formu için aday sohbetler: yalnız kimlik içermeyen üst veri.
  let conversations: { id: string; messageCount: number; lastMessageAt: Date | null; kind: string }[] = [];
  if (opts.includeConversations) {
    if (target?.kind === "message") {
      const conv = await Conversation.findById(target.conversationId, { messageCount: 1, lastMessageAt: 1, kind: 1 }).lean();
      if (conv) conversations = [{ id: conv._id.toString(), messageCount: conv.messageCount, lastMessageAt: conv.lastMessageAt ?? null, kind: conv.kind }];
    } else if (c.creatorId) {
      const rows = await Conversation.find({ creatorId: c.creatorId, kind: "fan" }, { messageCount: 1, lastMessageAt: 1, kind: 1 }).sort({ lastMessageAt: -1 }).limit(6).lean();
      conversations = rows.map((r) => ({ id: r._id.toString(), messageCount: r.messageCount, lastMessageAt: r.lastMessageAt ?? null, kind: r.kind }));
    }
  }

  return {
    id: c._id.toString(),
    caseNo: c.caseNo,
    status: c.status,
    priority: c.priority,
    riskScore: c.riskScore,
    source: c.source,
    reason: c.reason,
    categories: c.categories,
    targetType: c.targetType,
    createdAt: c.createdAt,
    creator: creator ? { id: creator._id.toString(), displayName: creator.displayName, username: creator.username } : null,
    hasSubjectUser: Boolean(c.subjectUserId),
    assignedTo: c.assignedTo ? { id: c.assignedTo.toString(), name: name(c.assignedTo) } : null,
    decision: c.decision ? { action: c.decision.action, note: c.decision.note, by: name(c.decision.by), at: c.decision.at } : null,
    target,
    reports: reports.map((r) => ({ id: r._id.toString(), reportNo: r.reportNo, reason: r.reason, details: r.details ?? "", status: r.status, createdAt: r.createdAt, byAccount: Boolean(r.reporterId) })),
    appeals: appeals.map((a) => ({ id: a._id.toString(), appealNo: a.appealNo, status: a.status, createdAt: a.createdAt })),
    history: c.history.map((h) => ({ from: h.from, to: h.to, note: h.note ?? null, by: name(h.by), at: h.at })).reverse(),
    conversations,
  };
}

/** Karar eylemlerinden hangilerinin bu vaka için anlamlı olduğunu belirler. */
export function availableCaseActions(detail: { status: string; targetType: string; creator: unknown; hasSubjectUser: boolean }) {
  const open = (OPEN_STATUSES as string[]).includes(detail.status);
  if (!open) return [] as string[];
  const actions: string[] = ["assign_me", "dismiss", "warn"];
  if (detail.targetType === "content") actions.push("hide", "remove");
  if (detail.targetType === "twin" || detail.creator) actions.push("pause_twin", "revoke_twin");
  if (detail.hasSubjectUser || detail.creator) actions.push("suspend_user");
  if (detail.status !== "escalated") actions.push("escalate");
  return actions;
}
