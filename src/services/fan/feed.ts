import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { ContentItem, Category } from "@/models/content";
import { CreatorProfile } from "@/models/creator";
import { Favorite, Follow, Message } from "@/models/social";
import { Subscription, Wallet } from "@/models/monetization";
import { UserPreferences } from "@/models/identity";
import { exploreCreators, viewerRelations, type CreatorCard } from "@/services/creators/public";
import type { Viewer } from "@/services/content/access";
import { listConversations } from "@/services/conversations/chat";
import { creatorCardsByIds } from "./creators";
import { buildPostViews, CONTENT_PROJECTION, type PostView } from "./posts";
import { getFormatters } from "@/i18n/server";

export type FollowingTab = "all" | "photo" | "video" | "ai";

/** /app/following — takip edilen creator'lar + onların yayındaki son paylaşımları. */
export async function getFollowingFeed(viewer: Viewer, opts: { tab: FollowingTab; page: number; pageSize?: number }) {
  await connectDb();
  const uid = oid(viewer.id);
  const follows = await Follow.find({ followerId: uid }).sort({ createdAt: -1 }).limit(500).lean();
  const creatorIds = follows.map((f) => f.creatorId);
  const pageSize = opts.pageSize ?? 10;
  const match: Record<string, unknown> = { creatorId: { $in: creatorIds }, status: "published" };
  if (opts.tab === "photo") match.type = { $in: ["photo", "collection"] };
  else if (opts.tab === "video") match.type = "video";
  else if (opts.tab === "ai") match.isAiGenerated = true;

  const [rows, total, creators] = await Promise.all([
    creatorIds.length
      ? ContentItem.find(match, CONTENT_PROJECTION)
          .sort({ publishedAt: -1, _id: -1 })
          .skip((opts.page - 1) * pageSize)
          .limit(pageSize)
          .lean()
      : Promise.resolve([]),
    creatorIds.length ? ContentItem.countDocuments(match) : Promise.resolve(0),
    CreatorProfile.find({ _id: { $in: creatorIds }, status: "approved" }, { username: 1, displayName: 1, avatarUrl: 1, categories: 1, verification: 1, isOnline: 1 }).lean(),
  ]);
  const posts = await buildPostViews(viewer, rows);
  const favs = rows.length ? await Favorite.find({ userId: uid, targetType: "content", targetId: { $in: rows.map((r) => r._id) } }, { targetId: 1 }).lean() : [];
  // "Yeni" rozeti: son 7 günde paylaşım yapanlar
  const since = new Date(Date.now() - 7 * 86400_000);
  const recent = creatorIds.length ? await ContentItem.distinct("creatorId", { creatorId: { $in: creatorIds }, status: "published", publishedAt: { $gte: since } }) : [];
  const recentSet = new Set(recent.map((r) => r.toString()));
  const byId = new Map(creators.map((c) => [c._id.toString(), c]));
  const followedList = follows
    .map((f) => byId.get(f.creatorId.toString()))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({
      id: c._id.toString(),
      username: c.username,
      displayName: c.displayName,
      avatarUrl: c.avatarUrl ?? null,
      verified: c.verification?.identity === "verified",
      category: c.categories?.[0] ?? null,
      hasNew: recentSet.has(c._id.toString()),
    }));
  return { posts, favoriteIds: favs.map((f) => f.targetId.toString()), total, page: opts.page, pageCount: Math.max(1, Math.ceil(total / pageSize)), followed: followedList, followedCount: followedList.length };
}

export type FavoritesTab = "creators" | "contents";
export type FavoritesSort = "recent" | "oldest" | "name" | "popular";

/** /app/favorites — favori creator'lar veya içerikler; sıralama sunucuda. */
export async function getFavorites(viewer: Viewer, opts: { tab: FavoritesTab; sort: FavoritesSort }) {
  await connectDb();
  const { compare } = await getFormatters();
  const uid = oid(viewer.id);
  const [creatorFavs, contentFavs] = await Promise.all([
    Favorite.find({ userId: uid, targetType: "creator" }).sort({ createdAt: -1 }).limit(300).lean(),
    Favorite.find({ userId: uid, targetType: "content" }).sort({ createdAt: -1 }).limit(300).lean(),
  ]);
  const counts = { creators: creatorFavs.length, contents: contentFavs.length };
  if (opts.tab === "creators") {
    let cards = await creatorCardsByIds(creatorFavs.map((f) => f.targetId.toString()));
    const since = new Map(creatorFavs.map((f) => [f.targetId.toString(), new Date(f.createdAt).getTime()]));
    if (opts.sort === "oldest") cards = [...cards].sort((a, b) => (since.get(a.id) ?? 0) - (since.get(b.id) ?? 0));
    else if (opts.sort === "name") cards = [...cards].sort((a, b) => compare(a.displayName, b.displayName));
    else if (opts.sort === "popular") cards = [...cards].sort((a, b) => b.followers - a.followers);
    const rel = await viewerRelations(viewer.id, cards.map((c) => c.id));
    return { counts, creators: cards, following: [...rel.following], contents: [] as PostView[] };
  }
  const items = await ContentItem.find({ _id: { $in: contentFavs.map((f) => f.targetId) }, status: "published" }, CONTENT_PROJECTION).lean();
  let posts = await buildPostViews(viewer, items);
  const order = new Map(contentFavs.map((f, i) => [f.targetId.toString(), i]));
  posts = posts.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  if (opts.sort === "oldest") posts.reverse();
  else if (opts.sort === "name") posts.sort((a, b) => compare(a.title, b.title));
  else if (opts.sort === "popular") posts.sort((a, b) => b.likes - a.likes);
  return { counts, creators: [] as CreatorCard[], following: [] as string[], contents: posts };
}

/** /app — hayran ana paneli verisi (hepsi gerçek veri). */
export async function getFanHome(viewer: Viewer) {
  await connectDb();
  const uid = oid(viewer.id);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [prefs, follows, messagesThisMonth, favoriteCreators, activeSubs, wallet] = await Promise.all([
    UserPreferences.findOne({ userId: uid }, { interests: 1, recommendationsEnabled: 1 }).lean(),
    Follow.find({ followerId: uid }, { creatorId: 1 }).lean(),
    Message.countDocuments({ userId: uid, senderType: "user", createdAt: { $gte: monthStart } }),
    Favorite.countDocuments({ userId: uid, targetType: "creator" }),
    Subscription.countDocuments({ userId: uid, status: { $in: ["active", "past_due"] }, currentPeriodEnd: { $gt: new Date() } }),
    Wallet.findOne({ userId: uid }, { balance: 1 }).lean(),
  ]);
  const followedIds = new Set(follows.map((f) => f.creatorId.toString()));
  const interests = prefs?.interests ?? [];
  const personalize = (prefs?.recommendationsEnabled ?? true) && interests.length > 0;

  // Önerilen ikizler: ilgi alanlarına göre, takip edilenler hariç; eksik kalırsa popülerlerle tamamlanır.
  let recommended: CreatorCard[] = [];
  if (personalize) {
    recommended = (await exploreCreators({ categories: interests, sort: "popular", pageSize: 24 })).items.filter((c) => !followedIds.has(c.id)).slice(0, 5);
  }
  if (recommended.length < 5) {
    const popular = (await exploreCreators({ sort: "popular", pageSize: 24 })).items.filter((c) => !followedIds.has(c.id) && !recommended.some((r) => r.id === c.id));
    recommended = [...recommended, ...popular].slice(0, 5);
  }
  const [rel, cats, postRows, chats] = await Promise.all([
    viewerRelations(viewer.id, recommended.map((c) => c.id)),
    interests.length ? Category.find({ slug: { $in: interests }, isActive: true }, { slug: 1, name: 1, icon: 1 }).lean() : Promise.resolve([]),
    followedIds.size
      ? ContentItem.find({ creatorId: { $in: [...followedIds].map((i) => oid(i)) }, status: "published" }, CONTENT_PROJECTION).sort({ publishedAt: -1, _id: -1 }).limit(4).lean()
      : Promise.resolve([]),
    listConversations(viewer.id, { filter: "all" }),
  ]);
  const order = new Map(interests.map((s, i) => [s, i]));
  return {
    stats: { messagesThisMonth, favoriteCreators, activeSubs, credits: wallet?.balance ?? 0 },
    personalized: personalize,
    recommended,
    favorites: [...rel.favorites],
    interests: cats.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0)).slice(0, 5).map((c) => ({ slug: c.slug, name: c.name, icon: c.icon })),
    posts: (await buildPostViews(viewer, postRows)).map((p) => ({ ...p, fresh: p.publishedAt ? Date.now() - new Date(p.publishedAt).getTime() < 3 * 86400_000 : false })),
    chats: chats.slice(0, 4).map((r) => ({
      conversationId: r.conversation._id.toString(),
      username: r.creator!.username,
      displayName: r.creator!.displayName,
      avatarUrl: r.creator!.avatarUrl ?? null,
      preview: r.conversation.lastMessagePreview ?? null,
      lastAt: r.conversation.lastMessageAt ? new Date(r.conversation.lastMessageAt).toISOString() : null,
      unread: r.conversation.unreadForUser,
    })),
    followedCount: followedIds.size,
  };
}
