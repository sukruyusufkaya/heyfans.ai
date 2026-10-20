import "server-only";
import { z } from "zod";
import { connectDb } from "@/lib/db/mongo";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { oid } from "@/lib/validation/common";
import { MembershipPlan, Subscription, type IMembershipPlan, type PlanTier } from "@/models/monetization";
import { studioCreator } from "./context";
import { m } from "@/i18n/m";

/** Plan fiyat sınırları (kuruş): ₺19,90 – ₺10.000. */
export const PLAN_MIN_PRICE_MINOR = 1990;
export const PLAN_MAX_PRICE_MINOR = 1_000_000;

const money = z
  .number({ error: m("Geçerli bir tutar girin") })
  .int(m("Tutar kuruş cinsinden tamsayı olmalı"))
  .min(PLAN_MIN_PRICE_MINOR, m("Fiyat en az ₺19,90 olmalı"))
  .max(PLAN_MAX_PRICE_MINOR, m("Fiyat en fazla ₺10.000 olabilir"));

export const planInputSchema = z
  .object({
    tier: z.enum(["basic", "premium", "vip"]),
    name: z.string().trim().min(2, m("Plan adı en az 2 karakter")).max(60),
    description: z.string().trim().max(300).optional().default(""),
    benefits: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
    priceMonthlyMinor: money,
    priceYearlyMinor: money.nullable().optional(),
    isPopular: z.boolean().default(false),
    contentAccess: z.enum(["none", "basic", "premium", "vip"]),
    unlimitedChat: z.boolean().default(false),
    dailyChatAllowance: z.number().int().min(0).max(1000).default(0),
    customRequests: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.priceYearlyMinor != null && v.priceYearlyMinor <= v.priceMonthlyMinor)
      ctx.addIssue({ code: "custom", path: ["priceYearlyMinor"], message: m("Yıllık fiyat, aylık fiyattan yüksek olmalı (indirim için 12 aydan düşük)") });
    if (v.priceYearlyMinor != null && v.priceYearlyMinor > v.priceMonthlyMinor * 12)
      ctx.addIssue({ code: "custom", path: ["priceYearlyMinor"], message: m("Yıllık fiyat 12 aylık toplamı aşamaz") });
  });
export type PlanInput = z.infer<typeof planInputSchema>;

export interface PlanRow {
  plan: IMembershipPlan;
  subscribers: number;
  mrrMinor: number;
}

/** Planlar + kademe başına abone sayısı + aylık yinelenen gelir (MRR, brüt abonelik fiyatları). */
export async function getMembershipOverview(userId: string) {
  const creator = await studioCreator(userId);
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const [plans, agg, newSubs30] = await Promise.all([
    MembershipPlan.find({ scope: "creator", creatorId: creator._id }).sort({ status: 1, order: 1, createdAt: 1 }).lean<IMembershipPlan[]>(),
    Subscription.aggregate<{ _id: string; n: number; mrr: number }>([
      { $match: { scope: "creator", creatorId: creator._id, status: { $in: ["active", "past_due"] } } },
      { $group: { _id: { $toString: "$planId" }, n: { $sum: 1 }, mrr: { $sum: { $cond: [{ $eq: ["$interval", "year"] }, { $round: [{ $divide: ["$price.amountMinor", 12] }, 0] }, "$price.amountMinor"] } } } },
    ]),
    Subscription.countDocuments({ scope: "creator", creatorId: creator._id, createdAt: { $gte: since30 }, status: { $in: ["active", "past_due", "canceled", "expired"] } }),
  ]);
  const byPlan = new Map(agg.map((a) => [a._id, a]));
  const rows: PlanRow[] = plans.map((p) => ({ plan: p, subscribers: byPlan.get(p._id.toString())?.n ?? 0, mrrMinor: byPlan.get(p._id.toString())?.mrr ?? 0 }));
  return {
    creator,
    rows,
    totals: { subscribers: agg.reduce((a, r) => a + r.n, 0), mrrMinor: agg.reduce((a, r) => a + r.mrr, 0), newSubs30 },
  };
}

async function assertTierFree(creatorId: IMembershipPlan["creatorId"], tier: PlanTier, exceptId?: string) {
  const clash = await MembershipPlan.findOne({ scope: "creator", creatorId, tier, status: "active", ...(exceptId ? { _id: { $ne: oid(exceptId) } } : {}) }, { _id: 1 }).lean();
  if (clash) throw new ConflictError("Bu kademede zaten etkin bir planın var. Önce onu arşivle ya da düzenle.");
}

/**
 * Plan oluşturur/günceller. Fiyat değişikliği yalnız YENİ aboneliklere uygulanır:
 * mevcut abonelikler kendi `price` anlık görüntüsünü korur (Subscription.price).
 */
export async function savePlan(userId: string, raw: unknown, planId?: string) {
  const input = planInputSchema.parse(raw);
  const creator = await studioCreator(userId);
  await connectDb();
  const entitlements = {
    contentAccess: input.contentAccess,
    unlimitedChat: input.unlimitedChat,
    dailyChatAllowance: input.unlimitedChat ? 0 : input.dailyChatAllowance,
    customRequests: input.customRequests,
  };
  const common = {
    tier: input.tier,
    name: input.name,
    description: input.description,
    benefits: input.benefits,
    priceMonthly: { amountMinor: input.priceMonthlyMinor, currency: "TRY" },
    priceYearly: input.priceYearlyMinor != null ? { amountMinor: input.priceYearlyMinor, currency: "TRY" } : null,
    isPopular: input.isPopular,
  };
  if (input.isPopular) {
    await MembershipPlan.updateMany({ scope: "creator", creatorId: creator._id, ...(planId ? { _id: { $ne: oid(planId) } } : {}) }, { $set: { isPopular: false } });
  }
  if (!planId) {
    await assertTierFree(creator._id, input.tier);
    const count = await MembershipPlan.countDocuments({ scope: "creator", creatorId: creator._id });
    if (count >= 12) throw new AppError("En fazla 12 plan oluşturulabilir.", "limit");
    const doc = await MembershipPlan.create({
      scope: "creator",
      creatorId: creator._id,
      ...common,
      entitlements: { ...entitlements, monthlyCredits: 0, prioritySupport: false },
      order: ["basic", "premium", "vip"].indexOf(input.tier),
      status: "active",
    });
    await audit({ actorId: userId, action: "plan.create", targetType: "MembershipPlan", targetId: doc._id.toString(), metadata: { tier: input.tier, priceMinor: input.priceMonthlyMinor } });
    return doc.toObject();
  }
  const doc = await MembershipPlan.findOne({ _id: oid(planId), scope: "creator", creatorId: creator._id });
  if (!doc) throw new NotFoundError("Plan bulunamadı.");
  if (doc.status === "active" && doc.tier !== input.tier) await assertTierFree(creator._id, input.tier, planId);
  const priceChanged = doc.priceMonthly.amountMinor !== input.priceMonthlyMinor;
  doc.set({ ...common, entitlements: { ...doc.entitlements, ...entitlements } });
  await doc.save();
  await audit({ actorId: userId, action: "plan.update", targetType: "MembershipPlan", targetId: planId, metadata: { priceChanged } });
  return doc.toObject();
}

/** Arşivle: yeni abonelik alınmaz; mevcut aboneler dönem sonuna kadar haklarını korur. */
export async function setPlanStatus(userId: string, planId: string, status: "active" | "archived") {
  const creator = await studioCreator(userId);
  const doc = await MembershipPlan.findOne({ _id: oid(planId), scope: "creator", creatorId: creator._id });
  if (!doc) throw new NotFoundError("Plan bulunamadı.");
  if (status === "active") await assertTierFree(creator._id, doc.tier, planId);
  doc.status = status;
  if (status === "archived") doc.isPopular = false;
  await doc.save();
  // i18n-ignore (denetim anahtarı)
  await audit({ actorId: userId, action: `plan.${status === "archived" ? "archive" : "restore"}`, targetType: "MembershipPlan", targetId: planId });
  return doc.toObject();
}
