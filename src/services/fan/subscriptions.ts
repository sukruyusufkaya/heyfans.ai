import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { MembershipPlan, Subscription, type IMembershipPlan, type ISubscription } from "@/models/monetization";
import { Follow } from "@/models/social";
import { CreatorProfile } from "@/models/creator";
import { creatorBriefMap, type CreatorBrief } from "./creators";

export interface SubscriptionView {
  id: string;
  scope: "creator" | "platform";
  creator: CreatorBrief | null;
  planName: string;
  tier: string;
  interval: "month" | "year";
  amountMinor: number;
  currency: string;
  status: ISubscription["status"];
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null;
  periodStart: string | null;
  isDemo: boolean;
  isActive: boolean;
  benefits: string[];
}

/** /app/subscriptions — kullanıcının tüm abonelikleri (creator + platform). */
export async function listSubscriptionViews(userId: string): Promise<SubscriptionView[]> {
  await connectDb();
  const subs = await Subscription.find({ userId: oid(userId) }).sort({ createdAt: -1 }).limit(200).lean<ISubscription[]>();
  const [plans, briefs] = await Promise.all([
    MembershipPlan.find({ _id: { $in: subs.map((s) => s.planId) } }, { name: 1, benefits: 1 }).lean<Pick<IMembershipPlan, "_id" | "name" | "benefits">[]>(),
    creatorBriefMap(subs.filter((s) => s.creatorId).map((s) => s.creatorId!)),
  ]);
  const planMap = new Map(plans.map((p) => [p._id.toString(), p]));
  const now = Date.now();
  return subs.map((s) => ({
    id: s._id.toString(),
    scope: s.scope,
    creator: s.creatorId ? (briefs.get(s.creatorId.toString()) ?? null) : null,
    planName: planMap.get(s.planId.toString())?.name ?? s.tier,
    tier: s.tier,
    interval: s.interval,
    amountMinor: s.price.amountMinor,
    currency: s.price.currency,
    status: s.status,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    periodEnd: s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toISOString() : null,
    periodStart: s.currentPeriodStart ? new Date(s.currentPeriodStart).toISOString() : null,
    isDemo: Boolean(s.isDemo),
    isActive: (s.status === "active" || s.status === "past_due") && (s.currentPeriodEnd ? new Date(s.currentPeriodEnd).getTime() > now : false),
    benefits: planMap.get(s.planId.toString())?.benefits ?? [],
  }));
}

/** /creators/[username]/membership — creator planları + izleyicinin mevcut aboneliği. */
export async function getMembershipPage(userId: string, username: string) {
  await connectDb();
  const creator = await CreatorProfile.findOne({ username: username.toLowerCase(), status: "approved" }).lean();
  if (!creator) return null;
  const uid = oid(userId);
  const [plans, current, following] = await Promise.all([
    MembershipPlan.find({ scope: "creator", creatorId: creator._id, status: "active", tier: { $ne: "free" } }).sort({ order: 1 }).lean<IMembershipPlan[]>(),
    Subscription.findOne({ userId: uid, scope: "creator", creatorId: creator._id, status: { $in: ["active", "past_due"] }, currentPeriodEnd: { $gt: new Date() } }).lean<ISubscription>(),
    Follow.exists({ followerId: uid, creatorId: creator._id }),
  ]);
  return {
    creator: {
      id: creator._id.toString(),
      username: creator.username,
      displayName: creator.displayName,
      avatarUrl: creator.avatarUrl ?? null,
      verified: creator.verification?.identity === "verified",
      categories: creator.categories ?? [],
      isOwner: creator.userId.toString() === userId,
      isSample: Boolean(creator.isSample),
    },
    following: Boolean(following),
    plans: plans.map((p) => ({
      id: p._id.toString(),
      tier: p.tier,
      name: p.name,
      description: p.description ?? null,
      benefits: p.benefits ?? [],
      monthlyMinor: p.priceMonthly.amountMinor,
      yearlyMinor: p.priceYearly?.amountMinor ?? null,
      currency: p.priceMonthly.currency,
      isPopular: Boolean(p.isPopular),
    })),
    current: current
      ? {
          id: current._id.toString(),
          planId: current.planId.toString(),
          tier: current.tier,
          interval: current.interval,
          periodEnd: current.currentPeriodEnd ? new Date(current.currentPeriodEnd).toISOString() : null,
          cancelAtPeriodEnd: current.cancelAtPeriodEnd,
        }
      : null,
  };
}
