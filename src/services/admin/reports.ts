import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { oid, paged } from "@/lib/validation/common";
import { Appeal, ModerationCase, Report, REPORT_REASONS, type IAppeal, type IReport } from "@/models/safety";
import { SupportTicket, type ISupportTicket } from "@/models/platform";
import { notify } from "@/services/notifications/notifications";
import { daysAgo, loadUsers, msToHuman, REGEX_SAFE, type AdminActor } from "./shared";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";

const PAGE_SIZE = 12;
export const REPORT_STATUS_FILTERS = ["all", "open", "triaged", "resolved", "rejected"] as const;
export const APPEAL_STATUS_FILTERS = ["all", "open", "in_review", "upheld", "overturned"] as const;
export const TICKET_STATUS_FILTERS = ["all", "open", "pending", "resolved", "closed"] as const;

export async function getReportKpis() {
  await connectDb();
  const t = await getT();
  const now = new Date();
  const [openReports, newToday, pendingAppeals, newAppeals, resolved, resolvedRows] = await Promise.all([
    Report.countDocuments({ status: { $in: ["open", "triaged"] } }),
    Report.countDocuments({ createdAt: { $gte: daysAgo(1, now) } }),
    Appeal.countDocuments({ status: { $in: ["open", "in_review"] } }),
    Appeal.countDocuments({ createdAt: { $gte: daysAgo(7, now) } }),
    Report.countDocuments({ status: { $in: ["resolved", "rejected"] } }),
    Report.find({ status: { $in: ["resolved", "rejected"] }, updatedAt: { $gte: daysAgo(30, now) } }, { createdAt: 1, updatedAt: 1 }).lean(),
  ]);
  const durs = resolvedRows.map((r) => r.updatedAt.getTime() - r.createdAt.getTime()).filter((d) => d >= 0);
  const avgMs = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : null;
  return { openReports, newToday, pendingAppeals, newAppeals, resolved, avgResolution: msToHuman(avgMs, t), avgSample: durs.length };
}

/** SLA göstergeleri: gerçek vaka/itiraz/destek kayıtlarından; örnek yoksa null (sahte yüzde yok). */
export async function getSlaMetrics(includeSupport: boolean) {
  await connectDb();
  const since = daysAgo(90);
  const [cases, appeals, tickets] = await Promise.all([
    ModerationCase.find({ "decision.at": { $gte: since } }, { createdAt: 1, priority: 1, decision: 1 }).lean(),
    Appeal.find({ status: { $in: ["upheld", "overturned"] }, createdAt: { $gte: since } }, { createdAt: 1, updatedAt: 1 }).lean(),
    includeSupport ? SupportTicket.find({ createdAt: { $gte: since } }, { createdAt: 1, replies: 1 }).lean() : Promise.resolve([]),
  ]);
  const share = (arr: boolean[]) => (arr.length ? { pct: Math.round((arr.filter(Boolean).length / arr.length) * 100), n: arr.length } : null);
  const caseDur = (c: (typeof cases)[number]) => (c.decision ? new Date(c.decision.at).getTime() - c.createdAt.getTime() : Infinity);
  const critical = cases.filter((c) => c.priority === "critical").map((c) => caseDur(c) <= 3_600_000);
  const standard = cases.filter((c) => c.priority !== "critical").map((c) => caseDur(c) <= 86_400_000);
  const appealRes = appeals.map((a) => a.updatedAt.getTime() - a.createdAt.getTime() <= 7 * 86_400_000);
  const firstReply = (tickets as Pick<ISupportTicket, "createdAt" | "replies">[])
    .map((t) => {
      const r = t.replies.find((x) => x.authorType === "agent");
      return r ? new Date(r.at).getTime() - t.createdAt.getTime() <= 86_400_000 : null;
    })
    .filter((x): x is boolean => x !== null);
  return { critical: share(critical), standard: share(standard), appeals: share(appealRes), support: includeSupport ? share(firstReply) : null };
}

export async function listReports(opts: { status: string; reason: string; q: string; page: number }) {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (opts.status !== "all") filter.status = opts.status;
  if ((REPORT_REASONS as readonly string[]).includes(opts.reason)) filter.reason = opts.reason;
  if (opts.q) filter.reportNo = { $regex: REGEX_SAFE(opts.q), $options: "i" };
  const [rows, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip((opts.page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean<IReport[]>(),
    Report.countDocuments(filter),
  ]);
  const cases = rows.length ? await ModerationCase.find({ _id: { $in: rows.flatMap((r) => (r.caseId ? [r.caseId] : [])) } }, { caseNo: 1, priority: 1, status: 1 }).lean() : [];
  const caseMap = new Map(cases.map((c) => [c._id.toString(), c]));
  const items = rows.map((r) => {
    const c = r.caseId ? caseMap.get(r.caseId.toString()) : undefined;
    return { id: r._id.toString(), reportNo: r.reportNo, reason: r.reason, targetType: r.targetType, status: r.status, createdAt: r.createdAt, priority: c?.priority ?? null, caseNo: c?.caseNo ?? null };
  });
  return paged(items, total, opts.page, PAGE_SIZE);
}

export async function getReportDetail(id: string) {
  await connectDb();
  const t = await getT();
  const r = await Report.findById(oid(id)).lean<IReport>();
  if (!r) return null;
  const c = r.caseId ? await ModerationCase.findById(r.caseId, { caseNo: 1, priority: 1, status: 1, reason: 1 }).lean() : null;
  const reporter = r.reporterId ? (await loadUsers([r.reporterId])).get(r.reporterId.toString()) : null;
  return {
    id: r._id.toString(),
    reportNo: r.reportNo,
    reason: r.reason,
    details: r.details ?? "",
    targetType: r.targetType,
    status: r.status,
    resolutionNote: r.resolutionNote ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    reporter: reporter ? { name: reporter.name } : r.reporterEmail ? { name: t("Anonim (e-posta ile)") } : null,
    case: c ? { id: c._id.toString(), caseNo: c.caseNo, priority: c.priority, status: c.status, reason: c.reason } : null,
  };
}

const REPORT_FLOW: Record<string, string[]> = { open: ["triaged", "resolved", "rejected"], triaged: ["resolved", "rejected"] };

export async function updateReportStatus(actor: AdminActor, reportId: string, to: "triaged" | "resolved" | "rejected", note: string) {
  await connectDb();
  if (note.trim().length < 5) throw new AppError("Not en az 5 karakter olmalı.", "reason_required");
  const r = await Report.findById(oid(reportId));
  if (!r) throw new NotFoundError("Rapor bulunamadı.");
  if (!REPORT_FLOW[r.status]?.includes(to)) throw new AppError("Geçersiz durum geçişi: {from} → {to}", "conflict", 409, { params: { from: r.status, to } });
  const from = r.status;
  r.status = to;
  r.resolutionNote = note;
  await r.save();
  // i18n-ignore (denetim anahtarı)
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: `report.${to}`, targetType: "Report", targetId: reportId, reason: note, severity: "notice", metadata: { from, to, reportNo: r.reportNo } });
  return { status: to };
}

export async function listAppeals(opts: { status: string; page: number }) {
  await connectDb();
  const t = await getT();
  const filter: Record<string, unknown> = {};
  if (opts.status !== "all") filter.status = opts.status;
  const [rows, total] = await Promise.all([
    Appeal.find(filter).sort({ createdAt: -1 }).skip((opts.page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean<IAppeal[]>(),
    Appeal.countDocuments(filter),
  ]);
  const [users, cases] = await Promise.all([
    loadUsers(rows.map((r) => r.userId)),
    rows.length ? ModerationCase.find({ _id: { $in: rows.map((r) => r.caseId) } }, { caseNo: 1, reason: 1, decision: 1, targetType: 1 }).lean() : Promise.resolve([]),
  ]);
  const caseMap = new Map(cases.map((c) => [c._id.toString(), c]));
  const items = rows.map((a) => {
    const c = caseMap.get(a.caseId.toString());
    return {
      id: a._id.toString(),
      appealNo: a.appealNo,
      user: users.get(a.userId.toString())?.name ?? t("Kullanıcı"),
      status: a.status,
      reason: a.reason,
      createdAt: a.createdAt,
      decisionNote: a.decisionNote ?? null,
      case: c ? { id: c._id.toString(), caseNo: c.caseNo, reason: c.reason, targetType: c.targetType, decision: c.decision ? { action: c.decision.action, note: c.decision.note } : null } : null,
      history: a.history.map((h) => ({ from: h.from, to: h.to, note: h.note ?? null, at: h.at })),
    };
  });
  return paged(items, total, opts.page, PAGE_SIZE);
}

export async function listTickets(opts: { status: string; q: string; page: number }) {
  await connectDb();
  const t = await getT();
  const filter: Record<string, unknown> = {};
  if (opts.status !== "all") filter.status = opts.status;
  if (opts.q) {
    const rx = { $regex: REGEX_SAFE(opts.q), $options: "i" };
    filter.$or = [{ ticketNo: rx }, { subject: rx }, { email: rx }];
  }
  const [rows, total] = await Promise.all([
    SupportTicket.find(filter).sort({ createdAt: -1 }).skip((opts.page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean<ISupportTicket[]>(),
    SupportTicket.countDocuments(filter),
  ]);
  const agents = await loadUsers(rows.flatMap((tk) => [tk.assignedTo, ...tk.replies.map((r) => r.authorId)]));
  const items = rows.map((tk) => ({
    id: tk._id.toString(),
    ticketNo: tk.ticketNo,
    subject: tk.subject,
    name: tk.name,
    email: tk.email,
    category: tk.category,
    priority: tk.priority,
    status: tk.status,
    message: tk.message,
    createdAt: tk.createdAt,
    assignedTo: tk.assignedTo ? agents.get(tk.assignedTo.toString())?.name ?? t("Temsilci") : null,
    replies: tk.replies.map((r) => ({ authorType: r.authorType, author: r.authorType === "agent" ? (r.authorId ? agents.get(r.authorId.toString())?.name ?? t("Temsilci") : t("Temsilci")) : tk.name, body: r.body, at: r.at })),
  }));
  return paged(items, total, opts.page, PAGE_SIZE);
}

export async function getTicketCounts() {
  await connectDb();
  const rows = await SupportTicket.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
  const c: Record<string, number> = { all: 0, open: 0, pending: 0, resolved: 0, closed: 0 };
  for (const r of rows) {
    c[r._id] = r.n;
    c.all = (c.all ?? 0) + r.n;
  }
  return c;
}

export async function getReportCounts() {
  await connectDb();
  const [rep, app] = await Promise.all([
    Report.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    Appeal.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const reports: Record<string, number> = { all: 0, open: 0, triaged: 0, resolved: 0, rejected: 0 };
  for (const r of rep) {
    reports[r._id] = r.n;
    reports.all = (reports.all ?? 0) + r.n;
  }
  const appeals: Record<string, number> = { all: 0, open: 0, in_review: 0, upheld: 0, overturned: 0 };
  for (const r of app) {
    appeals[r._id] = r.n;
    appeals.all = (appeals.all ?? 0) + r.n;
  }
  return { reports, appeals };
}

/** Destek temsilcisi yanıtı: kayda eklenir, talep "yanıt bekliyor"a alınır, kayıtlı kullanıcıya bildirim gider. */
export async function replyToTicket(actor: AdminActor, ticketId: string, body: string) {
  await connectDb();
  const text = body.trim();
  if (text.length < 2 || text.length > 5000) throw new AppError("Yanıt 2 ile 5000 karakter arasında olmalı.", "invalid_reply");
  const t = await SupportTicket.findById(oid(ticketId));
  if (!t) throw new NotFoundError("Destek talebi bulunamadı.");
  if (t.status === "closed") throw new ConflictError("Kapalı talebe yanıt verilemez; önce yeniden açın.");
  t.replies.push({ authorId: oid(actor.id), authorType: "agent", body: text, at: new Date() });
  if (t.status === "open") t.status = "pending";
  if (!t.assignedTo) t.assignedTo = oid(actor.id);
  await t.save();
  if (t.userId) await notify(t.userId.toString(), { type: "system", title: m("Destek talebine yanıt: {ticketNo}"), params: { ticketNo: t.ticketNo }, body: text.slice(0, 200), link: "/help" });
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "support.reply", targetType: "SupportTicket", targetId: ticketId, severity: "info", metadata: { ticketNo: t.ticketNo } });
  return { status: t.status };
}

export async function setTicketStatus(actor: AdminActor, ticketId: string, to: ISupportTicket["status"]) {
  await connectDb();
  const t = await SupportTicket.findById(oid(ticketId));
  if (!t) throw new NotFoundError("Destek talebi bulunamadı.");
  if (t.status === to) throw new ConflictError("Talep zaten bu durumda.");
  const from = t.status;
  t.status = to;
  if (!t.assignedTo) t.assignedTo = oid(actor.id);
  await t.save();
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "support.status", targetType: "SupportTicket", targetId: ticketId, severity: "info", metadata: { from, to, ticketNo: t.ticketNo } });
  return { status: to };
}
