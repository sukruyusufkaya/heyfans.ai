import "server-only";
import type { PipelineStage, QueryFilter, Types } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import { escapeRegex, oid, paged, type Paginated } from "@/lib/validation/common";
import { AiTwin, type TwinStatus } from "@/models/ai";
import { Category, type ICategory } from "@/models/content";
import { CreatorProfile, type ICreatorProfile } from "@/models/creator";
import { MembershipPlan } from "@/models/monetization";
import { AnalyticsEvent } from "@/models/platform";
import { Favorite, Follow } from "@/models/social";
import { sampleCreatorIds } from "./sample";

/** Herkese açık creator kartı — yalnız yayına alınmış (approved) profiller. */
export interface CreatorCard {
  id: string;
  username: string;
  displayName: string;
  headline: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  categories: string[];
  followers: number;
  conversations: number;
  isOnline: boolean;
  verified: boolean;
  twinLive: boolean;
  startingPriceMinor: number | null;
  createdAt: string;
  isDemo: boolean;
  /** Platformun kurgusal örnek profili (satın alma kapalı). */
  isSample: boolean;
}

const PUBLIC_FILTER: QueryFilter<ICreatorProfile> = { status: "approved" };

type LeanCreator = Pick<
  ICreatorProfile,
  "_id" | "username" | "displayName" | "headline" | "avatarUrl" | "coverUrl" | "categories" | "stats" | "isOnline" | "verification" | "createdAt" | "isDemo" | "isSample"
>;

async function decorate(creators: LeanCreator[]): Promise<CreatorCard[]> {
  if (!creators.length) return [];
  const ids = creators.map((c) => c._id);
  const [twins, plans] = await Promise.all([
    AiTwin.find({ creatorId: { $in: ids } }, { creatorId: 1, status: 1 }).lean(),
    MembershipPlan.aggregate<{ _id: unknown; min: number }>([
      { $match: { creatorId: { $in: ids }, scope: "creator", status: "active" } },
      { $group: { _id: "$creatorId", min: { $min: "$priceMonthly.amountMinor" } } },
    ]),
  ]);
  const twinMap = new Map(twins.map((t) => [t.creatorId.toString(), t.status as TwinStatus]));
  const priceMap = new Map(plans.map((p) => [String(p._id), p.min]));
  return creators.map((c) => ({
    id: c._id.toString(),
    username: c.username,
    displayName: c.displayName,
    headline: c.headline ?? null,
    avatarUrl: c.avatarUrl ?? null,
    coverUrl: c.coverUrl ?? null,
    categories: c.categories ?? [],
    followers: c.stats?.followers ?? 0,
    conversations: c.stats?.conversations ?? 0,
    isOnline: Boolean(c.isOnline),
    verified: c.verification?.identity === "verified",
    twinLive: twinMap.get(c._id.toString()) === "live",
    startingPriceMinor: priceMap.get(c._id.toString()) ?? null,
    createdAt: new Date(c.createdAt).toISOString(),
    isDemo: Boolean(c.isDemo),
    isSample: Boolean(c.isSample),
  }));
}

const CARD_PROJECTION = {
  username: 1,
  displayName: 1,
  headline: 1,
  avatarUrl: 1,
  coverUrl: 1,
  categories: 1,
  stats: 1,
  isOnline: 1,
  verification: 1,
  createdAt: 1,
  isDemo: 1,
  isSample: 1,
} as const;

export interface ExploreQuery {
  q?: string;
  categories?: string[];
  price?: "all" | "free" | "0-100" | "100-300" | "300+";
  online?: boolean;
  verified?: boolean;
  sort?: "popular" | "new" | "conversations" | "price_asc";
  page?: number;
  pageSize?: number;
}

/** Keşfet: arama + filtre + sıralama + sayfalama (tamamı veritabanında). */
export async function exploreCreators(query: ExploreQuery): Promise<Paginated<CreatorCard>> {
  await connectDb();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, query.pageSize ?? 12));
  const match: QueryFilter<ICreatorProfile> = { ...PUBLIC_FILTER };
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q.slice(0, 80)), "i");
    match.$or = [{ displayName: rx }, { username: rx }, { headline: rx }, { tags: rx }, { categories: rx }];
  }
  if (query.categories?.length) match.categories = { $in: query.categories.slice(0, 20) };
  if (query.online) match.isOnline = true;
  if (query.verified) match["verification.identity"] = "verified";

  const pipeline: PipelineStage[] = [{ $match: match }];
  const needsPrice = (query.price && query.price !== "all") || query.sort === "price_asc";
  if (needsPrice) {
    pipeline.push(
      {
        $lookup: {
          from: "membershipPlans",
          let: { cid: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$creatorId", "$$cid"] }, { $eq: ["$status", "active"] }, { $eq: ["$scope", "creator"] }] } } },
            { $group: { _id: null, min: { $min: "$priceMonthly.amountMinor" } } },
          ],
          as: "_price",
        },
      },
      { $addFields: { _minPrice: { $ifNull: [{ $first: "$_price.min" }, 0] } } },
    );
    const ranges: Record<string, Record<string, number>> = {
      free: { $lte: 0 },
      "0-100": { $gt: 0, $lte: 10_000 },
      "100-300": { $gt: 10_000, $lte: 30_000 },
      "300+": { $gt: 30_000 },
    };
    if (query.price && query.price !== "all") pipeline.push({ $match: { _minPrice: ranges[query.price] } });
  }
  const sorts: Record<string, Record<string, 1 | -1>> = {
    popular: { "stats.followers": -1, _id: 1 },
    new: { createdAt: -1, _id: 1 },
    conversations: { "stats.conversations": -1, _id: 1 },
    price_asc: { _minPrice: 1, _id: 1 },
  };
  pipeline.push({
    $facet: {
      items: [{ $sort: sorts[query.sort ?? "popular"]! }, { $skip: (page - 1) * pageSize }, { $limit: pageSize }, { $project: CARD_PROJECTION }],
      total: [{ $count: "n" }],
    },
  });
  const [res] = await CreatorProfile.aggregate<{ items: LeanCreator[]; total: { n: number }[] }>(pipeline);
  const items = await decorate(res?.items ?? []);
  return paged(items, res?.total[0]?.n ?? 0, page, pageSize);
}

export async function listCreators(kind: "featured" | "new" | "popular" | "online", limit = 6, category?: string): Promise<CreatorCard[]> {
  await connectDb();
  const match: QueryFilter<ICreatorProfile> = { ...PUBLIC_FILTER };
  if (category) match.categories = category;
  let sort: Record<string, 1 | -1> = { "stats.followers": -1 };
  if (kind === "featured") {
    match["featured.isFeatured"] = true;
    sort = { "featured.rank": 1, "stats.followers": -1 };
  }
  if (kind === "new") sort = { createdAt: -1 };
  if (kind === "online") match.isOnline = true;
  let docs = await CreatorProfile.find(match, CARD_PROJECTION).sort(sort).limit(limit).lean<LeanCreator[]>();
  if (kind === "featured" && docs.length < limit) {
    const more = await CreatorProfile.find({ ...PUBLIC_FILTER, _id: { $nin: docs.map((d) => d._id) }, ...(category ? { categories: category } : {}) }, CARD_PROJECTION)
      .sort({ "stats.followers": -1 })
      .limit(limit - docs.length)
      .lean<LeanCreator[]>();
    docs = [...docs, ...more];
  }
  return decorate(docs);
}

export interface TrendingCreator extends CreatorCard {
  score: number;
  newFollowers: number;
  chats: number;
  growthPct: number | null;
}

/**
 * Trendler gerçek etkileşimden hesaplanır: son N gündeki takip + sohbet başlatma + profil görüntüleme
 * olayları; önceki eşit dönemle kıyaslanarak büyüme oranı bulunur. Veri yoksa boş liste döner.
 */
export async function trendingCreators(days = 7, limit = 10): Promise<TrendingCreator[]> {
  await connectDb();
  const now = Date.now();
  const since = new Date(now - days * 86400_000);
  const prevSince = new Date(now - 2 * days * 86400_000);
  const agg = await AnalyticsEvent.aggregate<{ _id: Types.ObjectId; follows: number; chats: number; views: number; prevFollows: number }>([
    { $match: { createdAt: { $gte: prevSince }, creatorId: { $ne: null }, type: { $in: ["follow", "chat_started", "chat_message", "profile_view"] } } },
    {
      $group: {
        _id: "$creatorId",
        follows: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "follow"] }, { $gte: ["$createdAt", since] }] }, 1, 0] } },
        prevFollows: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "follow"] }, { $lt: ["$createdAt", since] }] }, 1, 0] } },
        chats: { $sum: { $cond: [{ $and: [{ $in: ["$type", ["chat_started", "chat_message"]] }, { $gte: ["$createdAt", since] }] }, 1, 0] } },
        views: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "profile_view"] }, { $gte: ["$createdAt", since] }] }, 1, 0] } },
      },
    },
    { $addFields: { score: { $add: [{ $multiply: ["$follows", 5] }, { $multiply: ["$chats", 2] }, "$views"] } } },
    { $match: { score: { $gt: 0 } } },
    { $sort: { score: -1 } },
    { $limit: limit * 3 },
  ]);
  if (!agg.length) return [];
  const creators = await CreatorProfile.find({ ...PUBLIC_FILTER, _id: { $in: agg.map((a) => a._id) } }, CARD_PROJECTION).lean<LeanCreator[]>();
  const cards = new Map((await decorate(creators)).map((c) => [c.id, c]));
  const out: TrendingCreator[] = [];
  for (const a of agg) {
    const card = cards.get(String(a._id));
    if (!card) continue;
    const score = a.follows * 5 + a.chats * 2 + a.views;
    out.push({ ...card, score, newFollowers: a.follows, chats: a.chats, growthPct: a.prevFollows > 0 ? Math.round(((a.follows - a.prevFollows) / a.prevFollows) * 100) : null });
    if (out.length >= limit) break;
  }
  return out;
}

export async function trendingSummary(days = 30) {
  await connectDb();
  const since = new Date(Date.now() - days * 86400_000);
  const [daily, totals, liveTwins] = await Promise.all([
    AnalyticsEvent.aggregate<{ _id: string; chats: number }>([
      { $match: { createdAt: { $gte: since }, type: { $in: ["chat_message"] } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, chats: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    AnalyticsEvent.aggregate<{ _id: string; n: number }>([
      { $match: { createdAt: { $gte: since }, type: { $in: ["chat_message", "follow", "content_view"] } } },
      { $group: { _id: "$type", n: { $sum: 1 } } },
    ]),
    AiTwin.countDocuments({ status: "live" }),
  ]);
  const t = Object.fromEntries(totals.map((x) => [x._id, x.n]));
  return { daily, chats: t.chat_message ?? 0, follows: t.follow ?? 0, contentViews: t.content_view ?? 0, liveTwins };
}

export interface CategoryWithCount {
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  coverUrl: string | null;
  creatorCount: number;
  liveTwinCount: number;
  heroTitle: string | null;
  heroText: string | null;
  parentSlug: string | null;
}

export async function listCategories(opts: { parent?: string | null } = {}): Promise<CategoryWithCount[]> {
  await connectDb();
  const filter: QueryFilter<ICategory> = { isActive: true };
  if (opts.parent !== undefined) filter.parentSlug = opts.parent;
  const cats = await Category.find(filter).sort({ order: 1, name: 1 }).lean<ICategory[]>();
  const counts = await CreatorProfile.aggregate<{ _id: string; n: number }>([
    { $match: { status: "approved" } },
    { $unwind: "$categories" },
    { $group: { _id: "$categories", n: { $sum: 1 } } },
  ]);
  const twinCounts = await AiTwin.aggregate<{ _id: string; n: number }>([
    { $match: { status: "live" } },
    { $lookup: { from: "creatorProfiles", localField: "creatorId", foreignField: "_id", as: "c" } },
    { $unwind: "$c" },
    { $unwind: "$c.categories" },
    { $group: { _id: "$c.categories", n: { $sum: 1 } } },
  ]);
  const cMap = new Map(counts.map((c) => [c._id, c.n]));
  const tMap = new Map(twinCounts.map((c) => [c._id, c.n]));
  return cats.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description ?? null,
    icon: c.icon,
    coverUrl: c.coverUrl ?? null,
    creatorCount: cMap.get(c.slug) ?? 0,
    liveTwinCount: tMap.get(c.slug) ?? 0,
    heroTitle: c.heroTitle ?? null,
    heroText: c.heroText ?? null,
    parentSlug: c.parentSlug ?? null,
  }));
}

export async function getCategory(slug: string) {
  await connectDb();
  const cat = await Category.findOne({ slug: slug.toLowerCase(), isActive: true }).lean<ICategory>();
  if (!cat) return null;
  const [all, creatorCount] = await Promise.all([listCategories(), CreatorProfile.countDocuments({ status: "approved", categories: cat.slug })]);
  return {
    category: all.find((c) => c.slug === cat.slug)!,
    subcategories: all.filter((c) => c.parentSlug === cat.slug),
    creatorCount,
  };
}

/** Kullanıcının takip/favori durumu (kart üzerindeki kalp/takip düğmeleri için). */
export async function viewerRelations(userId: string | null | undefined, creatorIds: string[]) {
  if (!userId || !creatorIds.length) return { following: new Set<string>(), favorites: new Set<string>() };
  await connectDb();
  const ids = creatorIds.map((i) => oid(i));
  const [follows, favs] = await Promise.all([
    Follow.find({ followerId: oid(userId), creatorId: { $in: ids } }, { creatorId: 1 }).lean(),
    Favorite.find({ userId: oid(userId), targetType: "creator", targetId: { $in: ids } }, { targetId: 1 }).lean(),
  ]);
  return { following: new Set(follows.map((f) => f.creatorId.toString())), favorites: new Set(favs.map((f) => f.targetId.toString())) };
}

/** Platform geneli sayaçlar (hero istatistikleri) — gerçek veriden; demo modunda rozetle gösterilir. */
export async function platformCounters() {
  await connectDb();
  const { User } = await import("@/models/identity");
  const { Message } = await import("@/models/social");
  // Örnek (kurgusal) profiller gerçek kullanıcı/creator sayılmaz.
  const samples = await sampleCreatorIds();
  const [users, creators, messages, liveTwins] = await Promise.all([
    User.countDocuments({ status: "active", _id: { $nin: samples.userIds } }),
    CreatorProfile.countDocuments({ status: "approved", isSample: { $ne: true } }),
    Message.estimatedDocumentCount(),
    AiTwin.countDocuments({ status: "live", creatorId: { $nin: samples.creatorIds } }),
  ]);
  return { users, creators, messages, liveTwins };
}
