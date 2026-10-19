import "server-only";
import type { Types } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { ContentAccessGrant, type IContentItem } from "@/models/content";
import { CreatorProfile } from "@/models/creator";
import { Subscription, type PlanTier } from "@/models/monetization";
import { Follow } from "@/models/social";

const TIER_RANK: Record<string, number> = { free: 0, none: 0, basic: 1, premium: 2, vip: 3 };

export type AccessDecision =
  | { allowed: true; via: "owner" | "public" | "follower" | "subscription" | "purchase" | "admin" }
  | { allowed: false; reason: "login" | "follow" | "subscribe" | "purchase" | "unavailable"; requiredTier?: PlanTier | null; priceMinor?: number | null; currency?: string | null };

export interface Viewer {
  id: string;
  roles: string[];
}

/** Viewer'ın creator'a ait etkin abonelik kademesi (yoksa "free"). */
export async function activeTierFor(userId: string, creatorId: string | Types.ObjectId): Promise<PlanTier> {
  await connectDb();
  const sub = await Subscription.findOne(
    { userId: oid(userId), scope: "creator", creatorId: oid(creatorId), status: { $in: ["active", "past_due"] }, currentPeriodEnd: { $gt: new Date() } },
    { tier: 1 },
  ).lean();
  return (sub?.tier as PlanTier) ?? "free";
}

/**
 * İçerik erişim kararı — TEK doğruluk kaynağı. Galeri, içerik detayı ve medya akışı
 * (imzalı URL üretimi) yalnız bu fonksiyonun izniyle çalışır.
 */
export async function decideContentAccess(
  viewer: Viewer | null,
  content: Pick<IContentItem, "_id" | "creatorId" | "status" | "access" | "minPlanTier" | "price">,
): Promise<AccessDecision> {
  await connectDb();
  if (viewer) {
    const isOwner = await CreatorProfile.exists({ _id: content.creatorId, userId: oid(viewer.id) });
    if (isOwner) return { allowed: true, via: "owner" };
  }
  if (content.status !== "published") return { allowed: false, reason: "unavailable" };
  if (content.access === "public") return { allowed: true, via: "public" };
  if (!viewer) return { allowed: false, reason: "login" };

  if (content.access === "followers") {
    const follows = await Follow.exists({ followerId: oid(viewer.id), creatorId: content.creatorId });
    if (follows) return { allowed: true, via: "follower" };
    // Abone olan takipçi sayılır
    const tier = await activeTierFor(viewer.id, content.creatorId);
    if (TIER_RANK[tier]! > 0) return { allowed: true, via: "subscription" };
    return { allowed: false, reason: "follow" };
  }

  if (content.access === "subscribers") {
    const tier = await activeTierFor(viewer.id, content.creatorId);
    const required = content.minPlanTier ?? "basic";
    if (TIER_RANK[tier]! >= TIER_RANK[required]!) return { allowed: true, via: "subscription" };
    return { allowed: false, reason: "subscribe", requiredTier: required };
  }

  // purchase
  const grant = await ContentAccessGrant.exists({ userId: oid(viewer.id), contentId: content._id, revokedAt: null });
  if (grant) return { allowed: true, via: "purchase" };
  return { allowed: false, reason: "purchase", priceMinor: content.price?.amountMinor ?? null, currency: content.price?.currency ?? "TRY" };
}

/** Çoklu içerik için toplu karar (galeri): sorgu sayısını sabit tutar. */
export async function decideManyContentAccess(
  viewer: Viewer | null,
  items: Pick<IContentItem, "_id" | "creatorId" | "status" | "access" | "minPlanTier" | "price">[],
): Promise<Map<string, AccessDecision>> {
  await connectDb();
  const out = new Map<string, AccessDecision>();
  if (!items.length) return out;
  const creatorIds = [...new Set(items.map((i) => i.creatorId.toString()))];
  let owned = new Set<string>();
  let followed = new Set<string>();
  const tiers = new Map<string, number>();
  let grants = new Set<string>();
  if (viewer) {
    const uid = oid(viewer.id);
    const [own, fol, subs, gr] = await Promise.all([
      CreatorProfile.find({ _id: { $in: creatorIds.map((c) => oid(c)) }, userId: uid }, { _id: 1 }).lean(),
      Follow.find({ followerId: uid, creatorId: { $in: creatorIds.map((c) => oid(c)) } }, { creatorId: 1 }).lean(),
      Subscription.find(
        { userId: uid, scope: "creator", creatorId: { $in: creatorIds.map((c) => oid(c)) }, status: { $in: ["active", "past_due"] }, currentPeriodEnd: { $gt: new Date() } },
        { creatorId: 1, tier: 1 },
      ).lean(),
      ContentAccessGrant.find({ userId: uid, contentId: { $in: items.map((i) => i._id) }, revokedAt: null }, { contentId: 1 }).lean(),
    ]);
    owned = new Set(own.map((o) => o._id.toString()));
    followed = new Set(fol.map((f) => f.creatorId.toString()));
    for (const s of subs) tiers.set(s.creatorId!.toString(), Math.max(tiers.get(s.creatorId!.toString()) ?? 0, TIER_RANK[s.tier] ?? 0));
    grants = new Set(gr.map((g) => g.contentId.toString()));
  }
  for (const item of items) {
    const cid = item.creatorId.toString();
    const id = item._id.toString();
    if (owned.has(cid)) out.set(id, { allowed: true, via: "owner" });
    else if (item.status !== "published") out.set(id, { allowed: false, reason: "unavailable" });
    else if (item.access === "public") out.set(id, { allowed: true, via: "public" });
    else if (!viewer) out.set(id, { allowed: false, reason: "login" });
    else if (item.access === "followers")
      out.set(id, followed.has(cid) || (tiers.get(cid) ?? 0) > 0 ? { allowed: true, via: followed.has(cid) ? "follower" : "subscription" } : { allowed: false, reason: "follow" });
    else if (item.access === "subscribers") {
      const required = item.minPlanTier ?? "basic";
      out.set(id, (tiers.get(cid) ?? 0) >= TIER_RANK[required]! ? { allowed: true, via: "subscription" } : { allowed: false, reason: "subscribe", requiredTier: required });
    } else
      out.set(
        id,
        grants.has(id) ? { allowed: true, via: "purchase" } : { allowed: false, reason: "purchase", priceMinor: item.price?.amountMinor ?? null, currency: item.price?.currency ?? "TRY" },
      );
  }
  return out;
}

export const ACCESS_LABELS: Record<string, string> = {
  public: "Herkese açık",
  followers: "Takipçilere özel",
  subscribers: "Abonelere özel",
  purchase: "Tekil satın alma",
};

export const TIER_LABELS: Record<string, string> = { free: "Ücretsiz", basic: "Temel", premium: "Premium", vip: "VIP" };
