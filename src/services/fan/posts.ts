import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { ContentItem, MediaAsset, type ContentAccess, type IContentItem } from "@/models/content";
import { CreatorProfile } from "@/models/creator";
import { AnalyticsEvent } from "@/models/platform";
import { Favorite, Follow } from "@/models/social";
import { decideContentAccess, decideManyContentAccess, type AccessDecision, type Viewer } from "@/services/content/access";
import { creatorBriefMap, type CreatorBrief } from "./creators";

export type LockReason = "login" | "follow" | "subscribe" | "purchase" | "unavailable";

/** Akış/galeri kartı için içerik özeti — kilit durumu sunucuda hesaplanır, kilitli içerikte kapak sızdırılmaz. */
export interface PostView {
  id: string;
  creator: CreatorBrief;
  type: string;
  title: string;
  caption: string | null;
  coverUrl: string | null;
  access: ContentAccess;
  minPlanTier: string | null;
  priceMinor: number | null;
  currency: string;
  locked: boolean;
  lockReason: LockReason | null;
  publishedAt: string | null;
  likes: number;
  comments: number;
  isAi: boolean;
  mediaCount: number;
}

type ContentLean = Pick<
  IContentItem,
  "_id" | "creatorId" | "type" | "title" | "caption" | "status" | "access" | "minPlanTier" | "price" | "coverUrl" | "previewAssetId" | "mediaAssetIds" | "publishedAt" | "stats" | "isAiGenerated" | "createdAt"
>;

export const CONTENT_PROJECTION = {
  creatorId: 1,
  type: 1,
  title: 1,
  caption: 1,
  status: 1,
  access: 1,
  minPlanTier: 1,
  price: 1,
  coverUrl: 1,
  previewAssetId: 1,
  mediaAssetIds: 1,
  publishedAt: 1,
  stats: 1,
  isAiGenerated: 1,
  createdAt: 1,
} as const;

export async function buildPostViews(viewer: Viewer, items: ContentLean[], decisions?: Map<string, AccessDecision>): Promise<PostView[]> {
  if (!items.length) return [];
  const [briefs, decided] = await Promise.all([
    creatorBriefMap(items.map((i) => i.creatorId)),
    decisions ? Promise.resolve(decisions) : decideManyContentAccess(viewer, items),
  ]);
  // Erişimi olan ve kapağı olmayan içerikler için ilk medya bir görselse kapak olarak kullanılır.
  const needCover = items.filter((i) => decided.get(i._id.toString())?.allowed && !i.coverUrl && !i.previewAssetId && i.mediaAssetIds?.length);
  const kinds = new Map<string, string>();
  if (needCover.length) {
    const assets = await MediaAsset.find({ _id: { $in: needCover.map((i) => i.mediaAssetIds[0]!) }, status: "ready" }, { kind: 1 }).lean();
    for (const a of assets) kinds.set(a._id.toString(), a.kind);
  }
  const out: PostView[] = [];
  for (const i of items) {
    const creator = briefs.get(i.creatorId.toString());
    if (!creator) continue;
    const d = decided.get(i._id.toString());
    const locked = !d?.allowed;
    let coverUrl: string | null = null;
    if (!locked) {
      if (i.coverUrl) coverUrl = i.coverUrl;
      else if (i.previewAssetId) coverUrl = `/api/media/${i.previewAssetId.toString()}`;
      else if (i.mediaAssetIds?.[0] && kinds.get(i.mediaAssetIds[0].toString()) === "image") coverUrl = `/api/media/${i.mediaAssetIds[0].toString()}`;
    }
    out.push({
      id: i._id.toString(),
      creator,
      type: i.type,
      title: i.title,
      caption: i.caption ?? null,
      coverUrl,
      access: i.access,
      minPlanTier: i.minPlanTier ?? null,
      priceMinor: i.price?.amountMinor ?? null,
      currency: i.price?.currency ?? "TRY",
      locked,
      lockReason: d && !d.allowed ? d.reason : null,
      publishedAt: i.publishedAt ? new Date(i.publishedAt).toISOString() : null,
      likes: i.stats?.likes ?? 0,
      comments: i.stats?.comments ?? 0,
      isAi: Boolean(i.isAiGenerated),
      mediaCount: i.mediaAssetIds?.length ?? 0,
    });
  }
  return out;
}

export type GalleryFilter = "all" | "photo" | "video" | "audio" | "text" | "ai";

/** /creators/[username]/content — creator başlığı + filtreli, sayfalı galeri. */
export async function getCreatorGallery(viewer: Viewer, username: string, opts: { filter: GalleryFilter; page: number; pageSize?: number }) {
  await connectDb();
  const creator = await CreatorProfile.findOne({ username: username.toLowerCase(), status: "approved" }).lean();
  if (!creator) return null;
  const pageSize = opts.pageSize ?? 12;
  const match: Record<string, unknown> = { creatorId: creator._id, status: "published" };
  if (opts.filter === "photo") match.type = { $in: ["photo", "collection"] };
  else if (opts.filter === "video" || opts.filter === "audio" || opts.filter === "text") match.type = opts.filter;
  else if (opts.filter === "ai") match.isAiGenerated = true;

  const [rows, total, totalAll, following, featuredRows] = await Promise.all([
    ContentItem.find(match, CONTENT_PROJECTION)
      .sort({ publishedAt: -1, _id: -1 })
      .skip((opts.page - 1) * pageSize)
      .limit(pageSize)
      .lean<ContentLean[]>(),
    ContentItem.countDocuments(match),
    ContentItem.countDocuments({ creatorId: creator._id, status: "published" }),
    Follow.exists({ followerId: oid(viewer.id), creatorId: creator._id }),
    opts.filter === "all" && opts.page === 1
      ? ContentItem.find({ creatorId: creator._id, status: "published" }, CONTENT_PROJECTION).sort({ "stats.likes": -1, _id: -1 }).limit(3).lean<ContentLean[]>()
      : Promise.resolve([] as ContentLean[]),
  ]);
  const [items, featured] = await Promise.all([buildPostViews(viewer, rows), buildPostViews(viewer, featuredRows)]);
  const favorites = await Favorite.find({ userId: oid(viewer.id), targetType: "content", targetId: { $in: [...rows, ...featuredRows].map((r) => r._id) } }, { targetId: 1 }).lean();
  return {
    creator: {
      id: creator._id.toString(),
      username: creator.username,
      displayName: creator.displayName,
      avatarUrl: creator.avatarUrl ?? null,
      verified: creator.verification?.identity === "verified",
      followers: creator.stats?.followers ?? 0,
      categories: creator.categories ?? [],
      isOwner: creator.userId.toString() === viewer.id,
    },
    following: Boolean(following),
    items,
    featured,
    favoriteIds: favorites.map((f) => f.targetId.toString()),
    total,
    totalAll,
    page: opts.page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export interface ContentMediaItem {
  id: string;
  kind: "image" | "video" | "audio" | "document";
  mime: string;
  url: string;
}

/** /content/[id] — erişim kararı tek kaynaktan (decideContentAccess); medya listesi yalnız izin varsa döner. */
export async function getContentDetail(viewer: Viewer, id: string) {
  await connectDb();
  const content = await ContentItem.findById(oid(id)).lean<IContentItem>();
  if (!content || content.status === "removed") return null;
  const decision = await decideContentAccess(viewer, content);
  if (!decision.allowed && decision.reason === "unavailable") return null;
  const [creator, favorite, following] = await Promise.all([
    CreatorProfile.findOne({ _id: content.creatorId, status: "approved" }).lean(),
    Favorite.exists({ userId: oid(viewer.id), targetType: "content", targetId: content._id }),
    Follow.exists({ followerId: oid(viewer.id), creatorId: content.creatorId }),
  ]);
  if (!creator) return null;
  if (decision.allowed && decision.via !== "owner") {
    // Görüntülenme ölçümü (hata içeriği engellemez)
    void Promise.all([
      AnalyticsEvent.create({ type: "content_view", userId: oid(viewer.id), creatorId: content.creatorId, contentId: content._id, props: {} }),
      ContentItem.updateOne({ _id: content._id }, { $inc: { "stats.views": 1 } }),
    ]).catch(() => undefined);
  }
  let media: ContentMediaItem[] = [];
  if (decision.allowed && content.mediaAssetIds?.length) {
    const assets = await MediaAsset.find({ _id: { $in: content.mediaAssetIds }, status: "ready" }, { kind: 1, mime: 1 }).lean();
    const byId = new Map(assets.map((a) => [a._id.toString(), a]));
    media = content.mediaAssetIds
      .map((mid) => byId.get(mid.toString()))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({ id: a._id.toString(), kind: a.kind, mime: a.mime, url: `/api/media/${a._id.toString()}` }));
  }
  const [view] = await buildPostViews(viewer, [content], new Map([[content._id.toString(), decision]]));
  return {
    post: view!,
    decision,
    caption: content.caption ?? "",
    media,
    stats: content.stats,
    favorite: Boolean(favorite),
    following: Boolean(following),
    creator: { id: creator._id.toString(), username: creator.username, displayName: creator.displayName, avatarUrl: creator.avatarUrl ?? null, verified: creator.verification?.identity === "verified" },
  };
}
