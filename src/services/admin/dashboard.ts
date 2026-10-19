import "server-only";
import mongoose from "mongoose";
import { aiStatus } from "@/lib/ai/provider";
import { integrationStatus } from "@/config/env";
import { connectDb } from "@/lib/db/mongo";
import { can, type Actor, type Permission } from "@/lib/permissions";
import { AiTwin, AiTwinVersion, IngestionJob } from "@/models/ai";
import { CreatorApplication, CreatorProfile } from "@/models/creator";
import { User } from "@/models/identity";
import { PayoutRequest, PaymentTransaction } from "@/models/monetization";
import { AnalyticsEvent, SupportTicket } from "@/models/platform";
import { Appeal, AuditLog, ModerationCase, Report } from "@/models/safety";
import { daysAgo, loadUsers, monthBuckets, monthKeyExpr, pctDelta } from "./shared";

/** Brüt hacme sayılan ödeme durumları: başarıyla tahsil edilmiş (sonradan iade edilenler dahil). */
export const GROSS_STATUSES = ["succeeded", "partially_refunded", "refunded"] as const;

/** Başarı tarihi (yoksa oluşturulma) aralık eşleşmesi. */
export function txDateMatch(from: Date, to: Date) {
  return {
    $or: [{ succeededAt: { $gte: from, $lt: to } }, { succeededAt: null, createdAt: { $gte: from, $lt: to } }],
  };
}

export interface QueueItem {
  key: string;
  label: string;
  note: string;
  count: number;
  href: string;
  tone: "warn" | "danger" | "pink" | "gray";
}

export async function getDashboardData(user: Pick<Actor, "roles" | "adminRole">) {
  await connectDb();
  const allowed = (p: Permission) => can(user, p);
  const now = new Date();
  const d30 = daysAgo(30, now);
  const d60 = daysAgo(60, now);
  const d1 = daysAgo(1, now);
  const months = monthBuckets(12, now);
  const firstStart = months[0]!.start;

  const [
    totalUsers,
    users30,
    usersPrev30,
    approvedCreators,
    creators30,
    creatorsPrev30,
    liveTwins,
    twinsTotal,
    userMonths,
    userBase,
    creatorMonths,
    creatorBase,
    dau,
    signups24h,
    mau,
  ] = await Promise.all([
    User.countDocuments({ status: { $ne: "deleted" } }),
    User.countDocuments({ createdAt: { $gte: d30 } }),
    User.countDocuments({ createdAt: { $gte: d60, $lt: d30 } }),
    CreatorProfile.countDocuments({ status: "approved" }),
    CreatorProfile.countDocuments({ status: "approved", createdAt: { $gte: d30 } }),
    CreatorProfile.countDocuments({ status: "approved", createdAt: { $gte: d60, $lt: d30 } }),
    AiTwin.countDocuments({ status: "live" }),
    AiTwin.countDocuments({}),
    User.aggregate<{ _id: string; n: number }>([{ $match: { createdAt: { $gte: firstStart } } }, { $group: { _id: monthKeyExpr("createdAt"), n: { $sum: 1 } } }]),
    User.countDocuments({ createdAt: { $lt: firstStart } }),
    CreatorProfile.aggregate<{ _id: string; n: number }>([{ $match: { status: "approved", createdAt: { $gte: firstStart } } }, { $group: { _id: monthKeyExpr("createdAt"), n: { $sum: 1 } } }]),
    CreatorProfile.countDocuments({ status: "approved", createdAt: { $lt: firstStart } }),
    AnalyticsEvent.distinct("userId", { createdAt: { $gte: d1 }, userId: { $ne: null } }).then((r) => r.length),
    User.countDocuments({ createdAt: { $gte: d1 } }),
    AnalyticsEvent.distinct("userId", { createdAt: { $gte: d30 }, userId: { $ne: null } }),
  ]);

  // Finans (yalnız finance.read)
  let finance: null | {
    gross30: number;
    grossPrev30: number;
    grossDelta: ReturnType<typeof pctDelta>;
    count30: number;
    testCount: number;
    byKind: { kind: string; value: number }[];
    payers30: number;
    payerIds: string[];
  } = null;
  if (allowed("finance.read")) {
    const [g30, gPrev, byKind, testCount, payers] = await Promise.all([
      PaymentTransaction.aggregate<{ total: number; n: number }>([
        { $match: { status: { $in: [...GROSS_STATUSES] }, "amount.currency": "TRY", ...txDateMatch(d30, now) } },
        { $group: { _id: null, total: { $sum: "$amount.amountMinor" }, n: { $sum: 1 } } },
      ]),
      PaymentTransaction.aggregate<{ total: number }>([
        { $match: { status: { $in: [...GROSS_STATUSES] }, "amount.currency": "TRY", ...txDateMatch(d60, d30) } },
        { $group: { _id: null, total: { $sum: "$amount.amountMinor" } } },
      ]),
      PaymentTransaction.aggregate<{ _id: string; total: number }>([
        { $match: { status: { $in: [...GROSS_STATUSES] }, "amount.currency": "TRY", ...txDateMatch(d30, now) } },
        { $group: { _id: "$kind", total: { $sum: "$amount.amountMinor" } } },
        { $sort: { total: -1 } },
      ]),
      PaymentTransaction.countDocuments({ status: { $in: [...GROSS_STATUSES] }, isTest: true, ...txDateMatch(d30, now) }),
      PaymentTransaction.distinct("userId", { status: { $in: [...GROSS_STATUSES] }, ...txDateMatch(d30, now) }),
    ]);
    finance = {
      gross30: g30[0]?.total ?? 0,
      grossPrev30: gPrev[0]?.total ?? 0,
      grossDelta: pctDelta(g30[0]?.total ?? 0, gPrev[0]?.total ?? 0),
      count30: g30[0]?.n ?? 0,
      testCount,
      byKind: byKind.map((k) => ({ kind: k._id, value: k.total })),
      payers30: payers.length,
      payerIds: payers.map(String),
    };
  }

  // Aktif kullanıcı = etkinliği olan ∪ ödeme yapan (ödeme de bir etkinliktir; oran asla %100'ü aşmaz)
  const activeUnion = new Set([...mau.map(String), ...(finance?.payerIds ?? [])]).size;

  // Operasyon kuyruğu — yalnız izni olan alanlar
  const queue: QueueItem[] = [];
  const jobs: Promise<void>[] = [];
  const add = (perm: Permission, item: Omit<QueueItem, "count">, counter: () => Promise<number>) => {
    if (!allowed(perm)) return;
    jobs.push(counter().then((count) => void queue.push({ ...item, count })));
  };
  add("creators.read", { key: "applications", label: "Creator doğrulama", note: "Yeni başvurular", href: "/admin/creators?status=pending_review", tone: "warn" }, () => CreatorApplication.countDocuments({ status: { $in: ["submitted", "in_review"] } }));
  add("twins.read", { key: "twinVersions", label: "AI ikizi onayı", note: "İncelenecek sürümler", href: "/admin/ai-twins?status=pending_review", tone: "warn" }, () => AiTwinVersion.countDocuments({ status: "pending_review" }));
  add("moderation.read", { key: "cases", label: "Moderasyon kuyruğu", note: "İnceleme bekleyen vakalar", href: "/admin/moderation", tone: "danger" }, () => ModerationCase.countDocuments({ status: { $in: ["open", "in_review", "escalated"] } }));
  add("reports.read", { key: "reports", label: "Kullanıcı bildirimleri", note: "Açık raporlar", href: "/admin/reports", tone: "warn" }, () => Report.countDocuments({ status: { $in: ["open", "triaged"] } }));
  add("reports.read", { key: "appeals", label: "İtirazlar", note: "Açık başvurular", href: "/admin/reports?tab=appeals", tone: "warn" }, () => Appeal.countDocuments({ status: { $in: ["open", "in_review"] } }));
  add("finance.read", { key: "payouts", label: "Ödeme talepleri", note: "Creator ödemeleri", href: "/admin/finance?tab=payouts", tone: "pink" }, () => PayoutRequest.countDocuments({ status: { $in: ["requested", "approved", "processing"] } }));
  add("support.read", { key: "tickets", label: "Destek talepleri", note: "Yanıt bekleyen", href: "/admin/reports?tab=support", tone: "gray" }, () => SupportTicket.countDocuments({ status: { $in: ["open", "pending"] } }));
  await Promise.all(jobs);
  const order = ["applications", "twinVersions", "cases", "reports", "appeals", "payouts", "tickets"];
  queue.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  // Sistem sağlığı
  const failedJobs = await IngestionJob.countDocuments({ status: "failed" });
  const integrations = integrationStatus();
  const ai = aiStatus();

  // Son denetim olayları
  let recent: { id: string; action: string; actor: string; targetType: string | null; severity: string; at: Date; reason: string | null }[] = [];
  if (allowed("audit.read")) {
    const rows = await AuditLog.find({}).sort({ createdAt: -1 }).limit(8).lean();
    const actors = await loadUsers(rows.map((r) => r.actorId));
    recent = rows.map((r) => ({
      id: r._id.toString(),
      action: r.action,
      actor: r.actorId ? actors.get(r.actorId.toString())?.name ?? "Silinmiş kullanıcı" : "Sistem",
      targetType: r.targetType ?? null,
      severity: r.severity,
      at: r.createdAt,
      reason: r.reason ?? null,
    }));
  }

  // Büyüme serileri (kümülatif)
  const um = new Map(userMonths.map((r) => [r._id, r.n]));
  const cm = new Map(creatorMonths.map((r) => [r._id, r.n]));
  let uRun = userBase;
  let cRun = creatorBase;
  const growth = months.map((m) => {
    uRun += um.get(m.key) ?? 0;
    cRun += cm.get(m.key) ?? 0;
    return { label: m.label, users: uRun, creators: cRun, newUsers: um.get(m.key) ?? 0, newCreators: cm.get(m.key) ?? 0 };
  });

  return {
    kpis: {
      totalUsers,
      usersDelta: pctDelta(users30, usersPrev30),
      users30,
      approvedCreators,
      creatorsDelta: pctDelta(creators30, creatorsPrev30),
      creators30,
      liveTwins,
      twinsTotal,
    },
    finance,
    growth,
    quick: { dau, signups24h, mau: activeUnion, conversionPct: finance && activeUnion ? Math.round((finance.payers30 / activeUnion) * 1000) / 10 : null },
    queue,
    health: {
      integrations,
      ai,
      failedJobs,
      dbConnected: mongoose.connection.readyState === 1,
    },
    recent,
  };
}
