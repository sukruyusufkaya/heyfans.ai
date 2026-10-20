import "server-only";
import { AiTwin, type ITwin } from "@/models/ai";
import { CreatorEarning, CustomRequest, Subscription, type ICustomRequest, type ISubscription } from "@/models/monetization";
import { Conversation, Follow, Notification, type INotification } from "@/models/social";
import { User } from "@/models/identity";
import { earningsBalance } from "@/services/billing/earnings";
import { dayExpr, dayKeys, dayLabel, DAY_MS, rangeStart, shortName, studioCreator } from "./context";
import { getT } from "@/i18n/server";
import { localizeNotification } from "@/services/notifications/notifications";

export interface ActivityItem {
  id: string;
  kind: "notification" | "request" | "subscription";
  title: string;
  sub: string;
  at: Date;
  href: string;
}

const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

export async function getDashboard(userId: string) {
  const t = await getT();
  const creator = await studioCreator(userId);
  const cid = creator._id;
  const keys = dayKeys(30);
  const since = rangeStart(keys);
  const prevSince = new Date(since.getTime() - 30 * DAY_MS);

  const [twin, balance, daily, earn30, earnPrev, activeSubs, newSubs, newSubsPrev, newFollowers, newFollowersPrev, convs30, notifs, reqs, recentSubs] = await Promise.all([
    AiTwin.findOne({ creatorId: cid }).lean<ITwin>(),
    earningsBalance(cid.toString()),
    CreatorEarning.aggregate<{ _id: { d: string; s: string }; v: number }>([
      { $match: { creatorId: cid, createdAt: { $gte: since } } },
      { $group: { _id: { d: dayExpr(), s: "$sourceType" }, v: { $sum: "$creatorShareMinor" } } },
    ]),
    CreatorEarning.aggregate<{ _id: null; v: number }>([{ $match: { creatorId: cid, createdAt: { $gte: since } } }, { $group: { _id: null, v: { $sum: "$creatorShareMinor" } } }]),
    CreatorEarning.aggregate<{ _id: null; v: number }>([{ $match: { creatorId: cid, createdAt: { $gte: prevSince, $lt: since } } }, { $group: { _id: null, v: { $sum: "$creatorShareMinor" } } }]),
    Subscription.countDocuments({ creatorId: cid, scope: "creator", status: { $in: ["active", "past_due"] } }),
    Subscription.countDocuments({ creatorId: cid, scope: "creator", createdAt: { $gte: since }, status: { $in: ["active", "past_due", "canceled", "expired"] } }),
    Subscription.countDocuments({ creatorId: cid, scope: "creator", createdAt: { $gte: prevSince, $lt: since }, status: { $in: ["active", "past_due", "canceled", "expired"] } }),
    Follow.countDocuments({ creatorId: cid, createdAt: { $gte: since } }),
    Follow.countDocuments({ creatorId: cid, createdAt: { $gte: prevSince, $lt: since } }),
    Conversation.countDocuments({ creatorId: cid, kind: "fan", createdAt: { $gte: since } }),
    Notification.find({ userId: creator.userId, type: { $nin: ["custom_request", "subscription"] } }).sort({ createdAt: -1 }).limit(5).lean<INotification[]>(),
    CustomRequest.find({ creatorId: cid, status: { $in: ["pending", "in_review", "approved", "processing"] } }).sort({ createdAt: -1 }).limit(4).lean<ICustomRequest[]>(),
    Subscription.find({ creatorId: cid, scope: "creator", status: { $in: ["active", "past_due"] } }).sort({ createdAt: -1 }).limit(4).lean<ISubscription[]>(),
  ]);

  const series = (pick: (s: string) => boolean) => {
    const map = new Map<string, number>();
    for (const r of daily) if (pick(r._id.s)) map.set(r._id.d, (map.get(r._id.d) ?? 0) + r.v);
    return keys.map((k) => ({ label: dayLabel(k, t.locale), value: map.get(k) ?? 0 }));
  };

  const userIds = [...reqs.map((r) => r.fanId), ...recentSubs.map((s) => s.userId)];
  const users = userIds.length ? await User.find({ _id: { $in: userIds } }, { name: 1 }).lean() : [];
  const nameOf = new Map(users.map((u) => [u._id.toString(), shortName(u.name, t)]));
  const TIER: Record<string, string> = { basic: t("Temel"), premium: t("Premium"), vip: t("VIP"), free: t("Ücretsiz") };

  const activity: ActivityItem[] = [
    ...notifs.map((n) => ({ id: `n${n._id}`, kind: "notification" as const, title: localizeNotification(t, n).title, sub: localizeNotification(t, n).body, at: n.createdAt, href: n.link ?? "/app/notifications" })),
    ...reqs.map((r) => ({ id: `r${r._id}`, kind: "request" as const, title: t("Özel talep: {title}", { title: r.title }), sub: t("{name} · {credits} kredi", { name: nameOf.get(r.fanId.toString()) ?? t("Hayran"), credits: r.priceCredits }), at: r.createdAt, href: "/studio/requests" })),
    ...recentSubs.map((s) => ({ id: `s${s._id}`, kind: "subscription" as const, title: t("Yeni {tier} aboneliği", { tier: TIER[s.tier] ?? s.tier }), sub: nameOf.get(s.userId.toString()) ?? t("Hayran"), at: s.createdAt, href: "/studio/fans" })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  const total30 = earn30[0]?.v ?? 0;
  return {
    creator,
    twin,
    balance,
    kpis: {
      totalEarnings: balance.total,
      earnings30: total30,
      earningsDelta: pct(total30, earnPrev[0]?.v ?? 0),
      activeSubs,
      newSubs,
      newSubsDelta: pct(newSubs, newSubsPrev),
      followers: creator.stats.followers,
      newFollowers,
      followersDelta: pct(newFollowers, newFollowersPrev),
      conversations: twin?.stats.conversations ?? 0,
      conversations30: convs30,
    },
    charts: {
      total: series(() => true),
      chat: series((s) => s === "chat"),
      subscription: series((s) => s === "subscription"),
    },
    activity,
  };
}
