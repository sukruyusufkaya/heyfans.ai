import "server-only";
import { User } from "@/models/identity";
import { Gift, Subscription } from "@/models/monetization";
import { Follow, type IFollow } from "@/models/social";
import { dayExpr, dayKeys, fillSeries, rangeStart, shortName, studioCreator } from "./context";
import { getT } from "@/i18n/server";

/** Takipçi/abone kitlesi. Hayranlar yalnız görünen adlarıyla (soyad kısaltılmış) listelenir; e-posta/kimlik yok. */
export async function getAudience(userId: string) {
  const t = await getT();
  const creator = await studioCreator(userId);
  const cid = creator._id;
  const keys = dayKeys(30);
  const since = rangeStart(keys);

  const [daily, newFollowers, subsByTier, gifts, newCount30] = await Promise.all([
    Follow.aggregate<{ _id: string; n: number }>([{ $match: { creatorId: cid, createdAt: { $gte: since } } }, { $group: { _id: dayExpr(), n: { $sum: 1 } } }]),
    Follow.find({ creatorId: cid }).sort({ createdAt: -1 }).limit(8).lean<IFollow[]>(),
    Subscription.aggregate<{ _id: string; n: number }>([
      { $match: { creatorId: cid, scope: "creator", status: { $in: ["active", "past_due"] } } },
      { $group: { _id: "$tier", n: { $sum: 1 } } },
    ]),
    Gift.aggregate<{ _id: { s: unknown; anon: boolean }; credits: number; count: number }>([
      { $match: { creatorId: cid } },
      { $group: { _id: { s: "$senderId", anon: "$isAnonymous" }, credits: { $sum: "$credits" }, count: { $sum: 1 } } },
      { $sort: { credits: -1 } },
      { $limit: 8 },
    ]),
    Follow.countDocuments({ creatorId: cid, createdAt: { $gte: since } }),
  ]);

  const ids = [...newFollowers.map((f) => f.followerId), ...gifts.filter((g) => !g._id.anon).map((g) => g._id.s)] as IFollow["followerId"][];
  const users = ids.length ? await User.find({ _id: { $in: ids } }, { name: 1, image: 1 }).lean() : [];
  const uMap = new Map(users.map((u) => [u._id.toString(), u]));
  const tier = (k: string) => subsByTier.find((r) => r._id === k)?.n ?? 0;

  return {
    creator,
    followers: creator.stats.followers,
    newFollowers30: newCount30,
    growth: fillSeries(keys, daily, t.locale),
    tiers: [
      { key: "basic", label: t("Temel"), value: tier("basic") },
      { key: "premium", label: t("Premium"), value: tier("premium") },
      { key: "vip", label: t("VIP"), value: tier("vip") },
    ],
    totalSubscribers: subsByTier.reduce((a, r) => a + r.n, 0),
    supporters: gifts.slice(0, 5).map((g) => {
      const u = g._id.anon ? null : uMap.get(String(g._id.s));
      return { name: g._id.anon ? t("Anonim hayran") : shortName(u?.name, t), image: g._id.anon ? null : u?.image ?? null, credits: g.credits, count: g.count };
    }),
    recent: newFollowers.map((f) => {
      const u = uMap.get(f.followerId.toString());
      return { id: f._id.toString(), name: shortName(u?.name, t), image: u?.image ?? null, at: f.createdAt };
    }),
  };
}
