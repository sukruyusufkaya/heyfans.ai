import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { MembershipPlan, type IMembershipPlan } from "@/models/monetization";
import { priceItem } from "@/services/billing/checkout";
import { toCheckoutItem, type CheckoutParams } from "@/features/fan/checkout-schema";
import { creatorBriefMap, type CreatorBrief } from "./creators";

/** Ödeme sayfası özeti: fiyat HER ZAMAN sunucuda `priceItem` ile hesaplanır; yan bilgiler yalnız gösterim içindir. */
export async function getCheckoutSummary(userId: string, params: CheckoutParams) {
  const priced = await priceItem(userId, toCheckoutItem(params));
  await connectDb();
  const creator: CreatorBrief | null = priced.creatorId ? ((await creatorBriefMap([priced.creatorId])).get(priced.creatorId) ?? null) : null;
  let benefits: string[] = [];
  if (params.type === "plan") {
    const plan = await MembershipPlan.findById(oid(params.planId), { benefits: 1 }).lean<Pick<IMembershipPlan, "benefits">>();
    benefits = plan?.benefits ?? [];
  }
  return { priced, creator, benefits };
}
