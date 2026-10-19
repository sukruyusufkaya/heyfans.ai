import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { ContentItem, type IContentItem } from "@/models/content";
import { CreatorProfile } from "@/models/creator";
import { MembershipPlan, type IMembershipPlan, type PlanTier } from "@/models/monetization";

export interface PlatformPlanView {
  id: string;
  tier: PlanTier;
  name: string;
  description: string | null;
  benefits: string[];
  priceMonthlyMinor: number;
  priceYearlyMinor: number | null;
  currency: string;
  isPopular: boolean;
  entitlements: IMembershipPlan["entitlements"];
}

/** Platform üyelik planları (scope=platform, aktif) — fiyatlar ve özellikler tamamen veritabanından. */
export async function listPlatformPlans(): Promise<PlatformPlanView[]> {
  await connectDb();
  const plans = await MembershipPlan.find({ scope: "platform", status: "active" }).sort({ order: 1, "priceMonthly.amountMinor": 1 }).lean<IMembershipPlan[]>();
  return plans.map((p) => ({
    id: p._id.toString(),
    tier: p.tier,
    name: p.name,
    description: p.description ?? null,
    benefits: p.benefits ?? [],
    priceMonthlyMinor: p.priceMonthly.amountMinor,
    priceYearlyMinor: p.priceYearly?.amountMinor ?? null,
    currency: p.priceMonthly.currency,
    isPopular: Boolean(p.isPopular),
    entitlements: p.entitlements,
  }));
}

/** Yıllık planın aylık karşılığına göre en yüksek tasarruf yüzdesi (yıllık seçeneği olan ücretli planlardan); yoksa null. */
export function yearlySavingPct(plans: Pick<PlatformPlanView, "priceMonthlyMinor" | "priceYearlyMinor">[]) {
  let best = 0;
  for (const p of plans) {
    if (!p.priceYearlyMinor || p.priceMonthlyMinor <= 0) continue;
    const pct = Math.round((1 - p.priceYearlyMinor / (p.priceMonthlyMinor * 12)) * 100);
    if (pct > best) best = pct;
  }
  return best > 0 ? best : null;
}

export interface PurchasableContentView {
  id: string;
  title: string;
  type: IContentItem["type"];
  priceMinor: number;
  currency: string;
  creatorName: string;
  creatorUsername: string;
}

/** "Özel İçerik Açma": gerçekten satın alınabilir (access=purchase) yayındaki içerikler. */
export async function listPurchasableContent(limit = 4): Promise<PurchasableContentView[]> {
  await connectDb();
  const docs = await ContentItem.find(
    { status: "published", access: "purchase", "moderation.state": { $ne: "removed" }, "price.amountMinor": { $gt: 0 } },
    { creatorId: 1, type: 1, title: 1, price: 1 },
  )
    .sort({ "stats.purchases": -1, publishedAt: -1 })
    .limit(limit * 4)
    .lean<Pick<IContentItem, "_id" | "creatorId" | "type" | "title" | "price">[]>();
  if (!docs.length) return [];
  const creators = await CreatorProfile.find({ _id: { $in: docs.map((d) => d.creatorId) }, status: "approved" }, { displayName: 1, username: 1 }).lean();
  const byId = new Map(creators.map((c) => [c._id.toString(), c]));
  const out: PurchasableContentView[] = [];
  for (const d of docs) {
    const c = byId.get(d.creatorId.toString());
    if (!c || !d.price) continue;
    out.push({ id: d._id.toString(), title: d.title, type: d.type, priceMinor: d.price.amountMinor, currency: d.price.currency, creatorName: c.displayName, creatorUsername: c.username });
    if (out.length >= limit) break;
  }
  return out;
}
