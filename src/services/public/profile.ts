import "server-only";
import { cache } from "react";
import { connectDb } from "@/lib/db/mongo";
import { hashIp } from "@/lib/security/audit";
import { oid, usernameSchema } from "@/lib/validation/common";
import { AiTwin, AiTwinVersion } from "@/models/ai";
import { ContentItem, type IContentItem } from "@/models/content";
import { CreatorProfile, type ICreatorProfile } from "@/models/creator";
import { MembershipPlan, type IMembershipPlan, type PlanTier } from "@/models/monetization";
import { AnalyticsEvent } from "@/models/platform";
import { decideManyContentAccess, type AccessDecision, type Viewer } from "@/services/content/access";

export interface PublicPlan {
  id: string;
  tier: PlanTier;
  name: string;
  description: string | null;
  benefits: string[];
  priceMonthlyMinor: number;
  priceYearlyMinor: number | null;
  currency: string;
  isPopular: boolean;
  unlimitedChat: boolean;
  dailyChatAllowance: number;
  monthlyCredits: number;
}

export interface PublicTwin {
  live: boolean;
  status: string;
  name: string | null;
  shortBio: string | null;
  greeting: string | null;
  messageCredits: number;
  freeMessagesPerDay: number;
  features: { chat: boolean; voice: boolean; video: boolean };
}

export interface PublicCreatorProfile {
  id: string;
  ownerUserId: string;
  username: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  categories: string[];
  tags: string[];
  location: string | null;
  languages: string[];
  socialLinks: { platform: string; handle: string; url: string | null; verified: boolean }[];
  verified: boolean;
  isOnline: boolean;
  stats: { followers: number; posts: number; likes: number; conversations: number; subscribers: number };
  createdAt: string;
  isDemo: boolean;
  twin: PublicTwin | null;
  plans: PublicPlan[];
}

/** Herkese açık creator profili — yalnız `approved`; olmayan/askıdaki profil için null. İstek başına önbelleklenir. */
export const getPublicCreator = cache(async (username: string): Promise<PublicCreatorProfile | null> => {
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) return null;
  await connectDb();
  const c = await CreatorProfile.findOne({ username: parsed.data, status: "approved" }).lean<ICreatorProfile>();
  if (!c) return null;
  const [twin, plans] = await Promise.all([
    AiTwin.findOne({ creatorId: c._id }).lean(),
    MembershipPlan.find({ creatorId: c._id, scope: "creator", status: "active" }).sort({ order: 1, "priceMonthly.amountMinor": 1 }).lean<IMembershipPlan[]>(),
  ]);
  let twinView: PublicTwin | null = null;
  if (twin && twin.status !== "revoked" && twin.status !== "draft") {
    const version = twin.liveVersionId ? await AiTwinVersion.findById(twin.liveVersionId, { "snapshot.persona": 1 }).lean() : null;
    const persona = version?.snapshot?.persona;
    twinView = {
      live: twin.status === "live",
      status: twin.status,
      name: persona?.displayName || null,
      shortBio: persona?.shortBio || null,
      greeting: persona?.greeting || null,
      messageCredits: twin.pricing?.messageCredits ?? 0,
      freeMessagesPerDay: twin.pricing?.freeMessagesPerDay ?? 0,
      features: { chat: Boolean(twin.features?.chat), voice: Boolean(twin.features?.voice), video: Boolean(twin.features?.video) },
    };
  }
  return {
    id: c._id.toString(),
    ownerUserId: c.userId.toString(),
    username: c.username,
    displayName: c.displayName,
    headline: c.headline ?? null,
    bio: c.bio ?? null,
    avatarUrl: c.avatarUrl ?? null,
    coverUrl: c.coverUrl ?? null,
    categories: c.categories ?? [],
    tags: c.tags ?? [],
    location: c.location ?? null,
    languages: c.languages ?? [],
    socialLinks: (c.socialLinks ?? []).map((s) => ({ platform: s.platform, handle: s.handle, url: s.url ?? null, verified: Boolean(s.verified) })),
    verified: c.verification?.identity === "verified",
    isOnline: Boolean(c.isOnline),
    stats: {
      followers: c.stats?.followers ?? 0,
      posts: c.stats?.posts ?? 0,
      likes: c.stats?.likes ?? 0,
      conversations: c.stats?.conversations ?? 0,
      subscribers: c.stats?.subscribers ?? 0,
    },
    createdAt: new Date(c.createdAt).toISOString(),
    isDemo: Boolean(c.isDemo),
    twin: twinView,
    plans: plans.map((p) => ({
      id: p._id.toString(),
      tier: p.tier,
      name: p.name,
      description: p.description ?? null,
      benefits: p.benefits ?? [],
      priceMonthlyMinor: p.priceMonthly.amountMinor,
      priceYearlyMinor: p.priceYearly?.amountMinor ?? null,
      currency: p.priceMonthly.currency,
      isPopular: Boolean(p.isPopular),
      unlimitedChat: Boolean(p.entitlements?.unlimitedChat),
      dailyChatAllowance: p.entitlements?.dailyChatAllowance ?? 0,
      monthlyCredits: p.entitlements?.monthlyCredits ?? 0,
    })),
  };
});

/* ─── Gönderiler ───────────────────────────────────────────── */
export interface PublicPost {
  id: string;
  type: IContentItem["type"];
  title: string;
  caption: string | null;
  access: IContentItem["access"];
  minPlanTier: IContentItem["minPlanTier"] | null;
  priceMinor: number | null;
  coverUrl: string | null;
  publishedAt: string | null;
  likes: number;
  comments: number;
  decision: AccessDecision;
}

export const POST_TYPES = ["photo", "video", "audio", "text", "collection"] as const;

/** Creator'ın yayındaki gönderileri + izleyiciye göre erişim kararı (kilitli içerik görseli sızdırılmaz: kapak yalnız izin varsa döner). */
export async function listCreatorPosts(
  viewer: Viewer | null,
  creatorId: string,
  opts: { types?: readonly string[]; page?: number; pageSize?: number } = {},
): Promise<{ items: PublicPost[]; total: number; page: number; pageSize: number; pageCount: number }> {
  await connectDb();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, opts.pageSize ?? 12));
  const filter: Record<string, unknown> = { creatorId: oid(creatorId), status: "published", "moderation.state": { $ne: "removed" } };
  if (opts.types?.length) filter.type = { $in: opts.types.filter((t) => (POST_TYPES as readonly string[]).includes(t)) };
  const [docs, total] = await Promise.all([
    ContentItem.find(filter, { creatorId: 1, type: 1, title: 1, caption: 1, status: 1, access: 1, minPlanTier: 1, price: 1, coverUrl: 1, publishedAt: 1, stats: 1 })
      .sort({ publishedAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<IContentItem[]>(),
    ContentItem.countDocuments(filter),
  ]);
  const decisions = await decideManyContentAccess(viewer, docs);
  const items = docs.map((d): PublicPost => {
    const decision = decisions.get(d._id.toString()) ?? { allowed: false, reason: "unavailable" as const };
    return {
      id: d._id.toString(),
      type: d.type,
      title: d.title,
      caption: d.caption ?? null,
      access: d.access,
      minPlanTier: d.minPlanTier ?? null,
      priceMinor: d.access === "purchase" ? (d.price?.amountMinor ?? null) : null,
      coverUrl: decision.allowed ? (d.coverUrl ?? null) : null,
      publishedAt: d.publishedAt ? new Date(d.publishedAt).toISOString() : null,
      likes: d.stats?.likes ?? 0,
      comments: d.stats?.comments ?? 0,
      decision,
    };
  });
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/* ─── Profil görüntüleme olayı ─────────────────────────────── */
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget|python-requests/i;

/**
 * `profile_view` olayı (Trendler bunu kullanır). Bot isteklerini ve creator'ın kendi görüntülemesini saymaz;
 * aynı izleyicinin 30 dk içindeki tekrarını yutar (oturumsuzda IP özeti — ham IP saklanmaz).
 */
export async function recordProfileView(input: { creatorId: string; ownerUserId: string; viewerUserId?: string | null; ip?: string | null; userAgent?: string | null }) {
  if (input.viewerUserId && input.viewerUserId === input.ownerUserId) return;
  if (!input.userAgent || BOT_RE.test(input.userAgent)) return;
  await connectDb();
  const creatorId = oid(input.creatorId);
  const anonId = input.viewerUserId ? null : (hashIp(input.ip) ?? "unknown");
  const recent = await AnalyticsEvent.exists({
    type: "profile_view",
    creatorId,
    createdAt: { $gte: new Date(Date.now() - 30 * 60_000) },
    ...(input.viewerUserId ? { userId: oid(input.viewerUserId) } : { anonId }),
  });
  if (recent) return;
  await AnalyticsEvent.create({ type: "profile_view", userId: input.viewerUserId ? oid(input.viewerUserId) : null, anonId, creatorId, props: {} });
}
