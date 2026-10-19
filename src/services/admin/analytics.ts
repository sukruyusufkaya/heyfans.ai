import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { CreatorProfile } from "@/models/creator";
import { User } from "@/models/identity";
import { PaymentTransaction } from "@/models/monetization";
import { AnalyticsEvent, ANALYTICS_EVENT_TYPES } from "@/models/platform";
import { Conversation, Message } from "@/models/social";
import { GROSS_STATUSES, txDateMatch } from "./dashboard";
import { dayKeyExpr, monthBuckets, monthKeyExpr, pctDelta, TZ } from "./shared";

export const ANALYTICS_RANGES = { "30": 30, "90": 90, "365": 365 } as const;
export type AnalyticsRangeKey = keyof typeof ANALYTICS_RANGES;
export const METRICS = ["users", "revenue", "engagement", "creators"] as const;
export type Metric = (typeof METRICS)[number];

const CHAT_TYPES = ["chat_started", "chat_message"] as const;
const WEEK_MS = 7 * 86_400_000;

/** Europe/Istanbul takvimine göre bu haftanın Pazartesi 00:00'ı (UTC+3 sabit). */
function mondayStart(now: Date) {
  const local = new Date(now.getTime() + 3 * 3600_000);
  const dow = (local.getUTCDay() + 6) % 7; // Pzt=0
  const dayStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - 3 * 3600_000;
  return new Date(dayStart - dow * 86_400_000);
}

async function activeUserIds(from: Date, to: Date) {
  const ids = await AnalyticsEvent.distinct("userId", { createdAt: { $gte: from, $lt: to }, userId: { $ne: null }, type: { $ne: "signup" } });
  return ids.map(String);
}

export async function getAnalyticsData(rangeDays: number, metric: Metric) {
  await connectDb();
  const now = new Date();
  const from = new Date(now.getTime() - rangeDays * 86_400_000);
  const prevFrom = new Date(from.getTime() - rangeDays * 86_400_000);
  const months = monthBuckets(12, now);
  const firstMonth = months[0]!.start;

  const [activeNow, activePrev, signupsNow, signupsPrev, payersNow, grossNow, intents, eventsNow, eventsPrev, repeat, anonNow] = await Promise.all([
    activeUserIds(from, now),
    activeUserIds(prevFrom, from),
    User.countDocuments({ createdAt: { $gte: from, $lt: now } }),
    User.countDocuments({ createdAt: { $gte: prevFrom, $lt: from } }),
    PaymentTransaction.distinct("userId", { status: { $in: [...GROSS_STATUSES] }, ...txDateMatch(from, now) }),
    PaymentTransaction.aggregate<{ total: number }>([{ $match: { status: { $in: [...GROSS_STATUSES] }, "amount.currency": "TRY", ...txDateMatch(from, now) } }, { $group: { _id: null, total: { $sum: "$amount.amountMinor" } } }]),
    User.aggregate<{ _id: string | null; n: number }>([{ $match: { createdAt: { $gte: from, $lt: now } } }, { $group: { _id: "$signupIntent", n: { $sum: 1 } } }]),
    AnalyticsEvent.aggregate<{ _id: string; n: number }>([{ $match: { createdAt: { $gte: from, $lt: now } } }, { $group: { _id: "$type", n: { $sum: 1 } } }]),
    AnalyticsEvent.aggregate<{ _id: string; n: number }>([{ $match: { createdAt: { $gte: prevFrom, $lt: from } } }, { $group: { _id: "$type", n: { $sum: 1 } } }]),
    // Tekrar ziyaret: aralıkta ≥2 farklı günde etkinliği olan kullanıcı sayısı
    AnalyticsEvent.aggregate<{ n: number }>([
      { $match: { createdAt: { $gte: from, $lt: now }, userId: { $ne: null }, type: { $ne: "signup" } } },
      { $group: { _id: { u: "$userId", d: dayKeyExpr("createdAt") } } },
      { $group: { _id: "$_id.u", days: { $sum: 1 } } },
      { $match: { days: { $gte: 2 } } },
      { $count: "n" },
    ]),
    AnalyticsEvent.countDocuments({ createdAt: { $gte: from, $lt: now }, userId: null }),
  ]);

  // Büyüme serisi (12 ay)
  const series = await (async () => {
    if (metric === "revenue") {
      const rows = await PaymentTransaction.aggregate<{ _id: string; total: number }>([
        { $match: { status: { $in: [...GROSS_STATUSES] }, "amount.currency": "TRY", ...txDateMatch(firstMonth, now) } },
        { $addFields: { at: { $ifNull: ["$succeededAt", "$createdAt"] } } },
        { $group: { _id: monthKeyExpr("at"), total: { $sum: "$amount.amountMinor" } } },
      ]);
      const m = new Map(rows.map((r) => [r._id, r.total]));
      return months.map((x) => ({ label: x.label, value: m.get(x.key) ?? 0, value2: 0 }));
    }
    if (metric === "engagement") {
      const rows = await AnalyticsEvent.aggregate<{ _id: string; msgs: number; users: string[] }>([
        { $match: { type: "chat_message", createdAt: { $gte: firstMonth, $lt: now } } },
        { $group: { _id: monthKeyExpr("createdAt"), msgs: { $sum: 1 }, users: { $addToSet: "$userId" } } },
      ]);
      const m = new Map(rows.map((r) => [r._id, r]));
      return months.map((x) => ({ label: x.label, value: m.get(x.key)?.msgs ?? 0, value2: m.get(x.key)?.users.length ?? 0 }));
    }
    if (metric === "creators") {
      const rows = await CreatorProfile.aggregate<{ _id: string; n: number; approved: number }>([
        { $match: { createdAt: { $gte: firstMonth, $lt: now } } },
        { $group: { _id: monthKeyExpr("createdAt"), n: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } } } },
      ]);
      const m = new Map(rows.map((r) => [r._id, r]));
      return months.map((x) => ({ label: x.label, value: m.get(x.key)?.n ?? 0, value2: m.get(x.key)?.approved ?? 0 }));
    }
    const rows = await User.aggregate<{ _id: string; n: number; creators: number }>([
      { $match: { createdAt: { $gte: firstMonth, $lt: now } } },
      { $group: { _id: monthKeyExpr("createdAt"), n: { $sum: 1 }, creators: { $sum: { $cond: [{ $eq: ["$signupIntent", "creator"] }, 1, 0] } } } },
    ]);
    const m = new Map(rows.map((r) => [r._id, r]));
    return months.map((x) => ({ label: x.label, value: m.get(x.key)?.n ?? 0, value2: m.get(x.key)?.creators ?? 0 }));
  })();

  // Dönüşüm hunisi: dönemde kayıt olan kullanıcılar → ilk sohbet → ilk ödeme
  const cohortUsers = await User.find({ createdAt: { $gte: from, $lt: now } }, { _id: 1 }).limit(100_000).lean();
  const cohortIds = cohortUsers.map((u) => u._id);
  const [chatConv, chatEvents, payers] = cohortIds.length
    ? await Promise.all([
        Conversation.distinct("userId", { userId: { $in: cohortIds }, kind: "fan" }),
        AnalyticsEvent.distinct("userId", { userId: { $in: cohortIds }, type: { $in: [...CHAT_TYPES] } }),
        PaymentTransaction.distinct("userId", { userId: { $in: cohortIds }, status: { $in: [...GROSS_STATUSES] } }),
      ])
    : [[], [], []];
  const chatSet = new Set([...chatConv, ...chatEvents].map(String));
  const paySet = new Set(payers.map(String));
  const funnel = [
    { key: "signup", label: "Kayıt olan kullanıcı", n: cohortIds.length },
    { key: "chat", label: "İlk sohbetini başlatan", n: chatSet.size },
    { key: "purchase", label: "İlk ödemesini yapan", n: paySet.size },
  ];

  // Haftalık kohort tutundurma (son 8 hafta): kayıt haftası × sohbet aktivitesi
  const WEEKS = 8;
  const thisMonday = mondayStart(now);
  const firstWeek = new Date(thisMonday.getTime() - (WEEKS - 1) * WEEK_MS);
  const weekUsers = await User.find({ createdAt: { $gte: firstWeek } }, { _id: 1, createdAt: 1 }).limit(100_000).lean();
  const idxOf = (d: Date) => Math.floor((d.getTime() - firstWeek.getTime()) / WEEK_MS);
  const cohorts: { start: Date; ids: Set<string> }[] = Array.from({ length: WEEKS }, (_, i) => ({ start: new Date(firstWeek.getTime() + i * WEEK_MS), ids: new Set<string>() }));
  for (const u of weekUsers) {
    const i = idxOf(u.createdAt);
    if (i >= 0 && i < WEEKS) cohorts[i]!.ids.add(u._id.toString());
  }
  const allIds = weekUsers.map((u) => u._id);
  const activity = new Map<string, Set<number>>(); // userId → aktif hafta indeksleri
  if (allIds.length) {
    const weekExpr = { $floor: { $divide: [{ $subtract: ["$createdAt", firstWeek] }, WEEK_MS] } };
    const [ev, msg] = await Promise.all([
      AnalyticsEvent.aggregate<{ _id: { u: unknown; w: number } }>([
        { $match: { type: { $in: [...CHAT_TYPES] }, userId: { $in: allIds }, createdAt: { $gte: firstWeek, $lt: now } } },
        { $group: { _id: { u: "$userId", w: weekExpr } } },
      ]),
      Message.aggregate<{ _id: { u: unknown; w: number } }>([
        { $match: { senderType: "user", userId: { $in: allIds }, createdAt: { $gte: firstWeek, $lt: now } } },
        { $group: { _id: { u: "$userId", w: weekExpr } } },
      ]),
    ]);
    for (const r of [...ev, ...msg]) {
      const u = String(r._id.u);
      const set = activity.get(u) ?? new Set<number>();
      set.add(r._id.w);
      activity.set(u, set);
    }
  }
  const currentIdx = WEEKS - 1;
  const fmt = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", timeZone: TZ });
  const cohortRows = cohorts.map((c, i) => {
    const size = c.ids.size;
    const cells: (number | null)[] = [];
    for (let k = 0; k < WEEKS; k++) {
      const wi = i + k;
      if (wi > currentIdx) {
        cells.push(null);
        continue;
      }
      if (!size) {
        cells.push(null);
        continue;
      }
      let active = 0;
      for (const id of c.ids) if (activity.get(id)?.has(wi)) active++;
      cells.push(Math.round((active / size) * 100));
    }
    return { label: `${fmt.format(c.start)} haftası`, size, cells };
  });
  // Ağırlıklı 1. hafta tutundurma
  let w1Num = 0;
  let w1Den = 0;
  for (const r of cohortRows) {
    const v = r.cells[1];
    if (v !== null && v !== undefined && r.size) {
      w1Num += (v / 100) * r.size;
      w1Den += r.size;
    }
  }

  const evNow = new Map(eventsNow.map((e) => [e._id, e.n]));
  const evPrev = new Map(eventsPrev.map((e) => [e._id, e.n]));
  const eventRows = ANALYTICS_EVENT_TYPES.map((t) => ({ type: t, count: evNow.get(t) ?? 0, delta: pctDelta(evNow.get(t) ?? 0, evPrev.get(t) ?? 0) })).filter((e) => e.count > 0 || (evPrev.get(e.type) ?? 0) > 0).sort((a, b) => b.count - a.count);

  const eventsTotal = eventsNow.reduce((a, e) => a + e.n, 0);
  const active = activeNow.length;
  const payers30 = payersNow.length;
  // Dönüşüm paydası: etkinliği olan ∪ ödeme yapan kullanıcılar (oran %100'ü aşmaz)
  const activeUnion = new Set([...activeNow, ...payersNow.map(String)]).size;
  const gross = grossNow[0]?.total ?? 0;
  return {
    kpis: {
      active,
      activeDelta: pctDelta(active, activePrev.length),
      signups: signupsNow,
      signupsDelta: pctDelta(signupsNow, signupsPrev),
      conversionPct: activeUnion ? Math.round((payers30 / activeUnion) * 1000) / 10 : null,
      payers: payers30,
      arppu: payers30 ? Math.round(gross / payers30) : null,
      week1Pct: w1Den ? Math.round((w1Num / w1Den) * 100) : null,
      repeatPct: active ? Math.round(((repeat[0]?.n ?? 0) / active) * 100) : null,
    },
    series,
    intents: intents.map((i) => ({ intent: i._id ?? "none", n: i.n })),
    funnel,
    cohorts: cohortRows,
    cohortWeeks: WEEKS,
    events: eventRows,
    anonPct: eventsTotal ? Math.round((anonNow / eventsTotal) * 100) : null,
  };
}
