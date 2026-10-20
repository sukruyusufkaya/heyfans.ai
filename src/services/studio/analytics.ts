import "server-only";
import { z } from "zod";
import { ContentItem, type IContentItem } from "@/models/content";
import { AnalyticsEvent } from "@/models/platform";
import { Subscription } from "@/models/monetization";
import { dayExpr, dayKeys, fillSeries, rangeStart, studioCreator } from "./context";
import { getT } from "@/i18n/server";

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export const analyticsRangeSchema = z.coerce.number().pipe(z.union([z.literal(7), z.literal(30), z.literal(90)])).catch(30);

const TRACKED = ["profile_view", "follow", "unfollow", "chat_message", "chat_started", "content_view", "subscription_started", "content_purchase"] as const;

/** AnalyticsEvent (creatorId bazlı) üzerinden profil/etkileşim/dönüşüm metrikleri. */
export async function getCreatorAnalytics(userId: string, days: 7 | 30 | 90) {
  const t = await getT();
  const creator = await studioCreator(userId);
  const cid = creator._id;
  const keys = dayKeys(days);
  const since = rangeStart(keys);
  const prevSince = new Date(since.getTime() - days * 86_400_000);

  const [daily, totals, prevTotals, topViewed, topRevenue, subsInRange] = await Promise.all([
    AnalyticsEvent.aggregate<{ _id: { d: string; t: string }; n: number }>([
      { $match: { creatorId: cid, type: { $in: [...TRACKED] }, createdAt: { $gte: since } } },
      { $group: { _id: { d: dayExpr(), t: "$type" }, n: { $sum: 1 } } },
    ]),
    AnalyticsEvent.aggregate<{ _id: string; n: number }>([{ $match: { creatorId: cid, createdAt: { $gte: since } } }, { $group: { _id: "$type", n: { $sum: 1 } } }]),
    AnalyticsEvent.aggregate<{ _id: string; n: number }>([{ $match: { creatorId: cid, createdAt: { $gte: prevSince, $lt: since } } }, { $group: { _id: "$type", n: { $sum: 1 } } }]),
    AnalyticsEvent.aggregate<{ _id: unknown; n: number }>([
      { $match: { creatorId: cid, type: "content_view", contentId: { $ne: null }, createdAt: { $gte: since } } },
      { $group: { _id: "$contentId", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 5 },
    ]),
    ContentItem.find({ creatorId: cid, status: "published", "stats.revenueMinor": { $gt: 0 } }).sort({ "stats.revenueMinor": -1 }).limit(5).lean<IContentItem[]>(),
    Subscription.countDocuments({ creatorId: cid, scope: "creator", createdAt: { $gte: since } }),
  ]);

  const count = (rows: { _id: string; n: number }[], ty: string) => rows.find((r) => r._id === ty)?.n ?? 0;
  const cur = (ty: string) => count(totals, ty);
  const prev = (ty: string) => count(prevTotals, ty);
  const series = (ty: string) =>
    fillSeries(
      keys,
      daily.filter((r) => r._id.t === ty).map((r) => ({ _id: r._id.d, n: r.n })),
      t.locale,
    );
  const delta = (ty: string) => {
    const p = prev(ty);
    return p > 0 ? Math.round(((cur(ty) - p) / p) * 100) : null;
  };

  const viewedIds = topViewed.map((v) => v._id as IContentItem["_id"]);
  const viewedItems = viewedIds.length ? await ContentItem.find({ _id: { $in: viewedIds } }, { title: 1, type: 1, "stats.revenueMinor": 1 }).lean<IContentItem[]>() : [];
  const itemMap = new Map(viewedItems.map((i) => [i._id.toString(), i]));

  const profileViews = cur("profile_view");
  const follows = cur("follow");
  const subscriptions = Math.max(cur("subscription_started"), subsInRange);
  const hasData = totals.length > 0;
  return {
    creator,
    days,
    hasData,
    metrics: {
      profileViews: { value: profileViews, delta: delta("profile_view"), series: series("profile_view") },
      follows: { value: follows, delta: delta("follow"), series: series("follow") },
      chatMessages: { value: cur("chat_message"), delta: delta("chat_message"), series: series("chat_message") },
      contentViews: { value: cur("content_view"), delta: delta("content_view"), series: series("content_view") },
    },
    funnel: [
      { key: "views", label: t("Profil görüntüleme"), value: profileViews },
      { key: "follows", label: t("Takip"), value: follows },
      { key: "subs", label: t("Abonelik"), value: subscriptions },
    ],
    topViewed: topViewed.map((v) => ({ id: String(v._id), title: itemMap.get(String(v._id))?.title ?? t("Silinmiş içerik"), type: itemMap.get(String(v._id))?.type ?? "text", views: v.n, revenueMinor: itemMap.get(String(v._id))?.stats.revenueMinor ?? 0 })),
    topRevenue: topRevenue.map((i) => ({ id: i._id.toString(), title: i.title, type: i.type, purchases: i.stats.purchases, revenueMinor: i.stats.revenueMinor })),
  };
}
