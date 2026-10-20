import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { ClientSession } from "mongoose";
import { env } from "@/config/env";
import { connectDb, withTransaction } from "@/lib/db/mongo";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { getPaymentProvider, type PaymentEvent } from "@/lib/payments/provider";
import { audit } from "@/lib/security/audit";
import { oid } from "@/lib/validation/common";
import { ContentAccessGrant, ContentItem } from "@/models/content";
import { CreatorProfile } from "@/models/creator";
import {
  CreatorEarning,
  MembershipPlan,
  PaymentTransaction,
  PaymentWebhookEvent,
  Refund,
  Subscription,
  type IMembershipPlan,
  type IPaymentTransaction,
} from "@/models/monetization";
import { AnalyticsEvent } from "@/models/platform";
import { assertNotSample } from "@/services/creators/sample";
import { notify } from "@/services/notifications/notifications";
import { getPlatformSettings } from "@/services/platform/settings";
import { assertNotInMaintenance } from "@/services/platform/guards";
import { creditWallet, debitWallet } from "@/services/wallet/wallet";
import { recordPaymentEarning, reverseEarning } from "./earnings";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";

export type CheckoutItem =
  | { type: "credit_pack"; packKey: string }
  | { type: "plan"; planId: string; interval: "month" | "year" }
  | { type: "content"; contentId: string };

export interface PricedItem {
  kind: IPaymentTransaction["kind"];
  amountMinor: number;
  currency: string;
  label: string;
  creatorId: string | null;
  item: IPaymentTransaction["item"];
  recurring: { interval: "month" | "year" } | null;
  details: { credits?: number; bonusCredits?: number; planName?: string; tier?: string; creatorName?: string; contentTitle?: string };
}

/** Fiyat HER ZAMAN sunucuda, veritabanındaki tanımlardan hesaplanır; istemciden fiyat alınmaz. */
export async function priceItem(userId: string, item: CheckoutItem): Promise<PricedItem> {
  await connectDb();
  const t = await getT();
  if (item.type === "credit_pack") {
    const settings = await getPlatformSettings();
    const pack = settings.credits.packs.find((p) => p.key === item.packKey);
    if (!pack) throw new NotFoundError("Kredi paketi bulunamadı.");
    const total = pack.credits + (pack.bonusCredits ?? 0);
    return {
      kind: "credit_purchase",
      amountMinor: pack.priceMinor,
      currency: "TRY",
      label: pack.bonusCredits ? t("{credits} Kredi + {bonus} bonus", { credits: String(pack.credits), bonus: String(pack.bonusCredits) }) : t("{credits} Kredi", { credits: String(pack.credits) }),
      creatorId: null,
      item: { type: "credit_pack", packKey: pack.key, credits: total, label: t("{credits} Kredi paketi", { credits: String(pack.credits) }) },
      recurring: null,
      details: { credits: pack.credits, bonusCredits: pack.bonusCredits ?? 0 },
    };
  }
  if (item.type === "plan") {
    const plan = await MembershipPlan.findOne({ _id: oid(item.planId), status: "active" }).lean<IMembershipPlan>();
    if (!plan) throw new NotFoundError("Üyelik planı bulunamadı.");
    if (plan.tier === "free") throw new AppError("Ücretsiz plan için ödeme gerekmez.", "free_plan");
    const price = item.interval === "year" ? plan.priceYearly : plan.priceMonthly;
    if (!price) throw new AppError("Bu plan için yıllık seçenek yok.", "no_yearly");
    let creatorName: string | undefined;
    if (plan.scope === "creator") {
      const creator = await CreatorProfile.findOne({ _id: plan.creatorId, status: "approved" }, { displayName: 1, userId: 1, isSample: 1 }).lean();
      if (!creator) throw new NotFoundError("İçerik üreticisi bulunamadı.");
      assertNotSample(creator);
      if (creator.userId.equals(oid(userId))) throw new AppError("Kendi planına abone olamazsın.", "self_subscribe");
      creatorName = creator.displayName;
    }
    return {
      kind: "subscription",
      amountMinor: price.amountMinor,
      currency: price.currency,
      label: t("{owner} · {plan} ({interval})", { owner: creatorName ?? "HEYFANS", plan: t(plan.name), interval: item.interval === "year" ? t("Yıllık") : t("Aylık") }),
      creatorId: plan.creatorId?.toString() ?? null,
      item: { type: "plan", refId: plan._id, interval: item.interval, label: plan.name },
      recurring: { interval: item.interval },
      details: { planName: plan.name, tier: plan.tier, creatorName },
    };
  }
  const content = await ContentItem.findOne({ _id: oid(item.contentId), status: "published", access: "purchase" }).lean();
  if (!content || !content.price) throw new NotFoundError("Satın alınabilir içerik bulunamadı.");
  const owned = await ContentAccessGrant.exists({ userId: oid(userId), contentId: content._id, revokedAt: null });
  if (owned) throw new ConflictError("Bu içeriğe zaten erişimin var.", "already_owned");
  const creator = await CreatorProfile.findById(content.creatorId, { displayName: 1, userId: 1, isSample: 1 }).lean();
  assertNotSample(creator);
  if (creator?.userId.equals(oid(userId))) throw new AppError("Kendi içeriğini satın alamazsın.", "self_purchase");
  return {
    kind: "content_purchase",
    amountMinor: content.price.amountMinor,
    currency: content.price.currency,
    label: content.title,
    creatorId: content.creatorId.toString(),
    item: { type: "content", refId: content._id, label: content.title },
    recurring: null,
    details: { contentTitle: content.title, creatorName: creator?.displayName },
  };
}

/**
 * Ödeme başlatır: işlem kaydı (created) → sağlayıcı oturumu → yönlendirme adresi.
 * Aynı istemci anahtarıyla tekrar çağrı yeni işlem açmaz.
 */
export async function startCheckout(user: { id: string; email: string; name: string }, item: CheckoutItem, clientKey?: string) {
  await assertNotInMaintenance(null);
  const priced = await priceItem(user.id, item);
  const provider = getPaymentProvider();
  const idempotencyKey = `checkout:${user.id}:${clientKey ?? randomUUID()}`;
  await connectDb();

  let tx = await PaymentTransaction.findOne({ idempotencyKey });
  if (tx?.providerSessionId && tx.status !== "failed") {
    const redirect = provider.name === "mock" ? `/checkout/test/${tx.providerSessionId}` : null;
    if (redirect) return { transactionId: tx._id.toString(), redirectUrl: redirect };
  }
  if (!tx) {
    tx = await PaymentTransaction.create({
      userId: oid(user.id),
      kind: priced.kind,
      status: "created",
      amount: { amountMinor: priced.amountMinor, currency: priced.currency },
      provider: provider.name,
      creatorId: priced.creatorId ? oid(priced.creatorId) : null,
      item: priced.item,
      idempotencyKey,
      isTest: provider.isTest,
      history: [{ from: null, to: "created", by: oid(user.id), at: new Date() }],
    });
  }
  const base = env().APP_URL;
  const session = await provider.createCheckout({
    transactionId: tx._id.toString(),
    amountMinor: priced.amountMinor,
    currency: priced.currency,
    description: priced.label,
    customer: user,
    successUrl: `${base}/checkout/result?tx=${tx._id.toString()}`,
    cancelUrl: `${base}/checkout/result?tx=${tx._id.toString()}&canceled=1`,
    recurring: priced.recurring,
  });
  tx.providerSessionId = session.sessionId;
  tx.status = "pending";
  tx.history.push({ from: "created", to: "pending", by: oid(user.id), at: new Date() });
  await tx.save();
  return { transactionId: tx._id.toString(), redirectUrl: session.redirectUrl };
}

function addInterval(from: Date, interval: "month" | "year") {
  const d = new Date(from);
  if (interval === "year") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

/** Başarılı ödemenin hak tanımı — webhook'tan, tek transaction içinde, idempotent. */
async function fulfill(tx: IPaymentTransaction & { _id: import("mongoose").Types.ObjectId }, session: ClientSession) {
  const userId = tx.userId.toString();
  if (tx.kind === "credit_purchase") {
    await creditWallet(
      { userId, amount: tx.item.credits ?? 0, type: "purchase", description: tx.item.label, idempotencyKey: `purchase:${tx._id.toString()}`, refType: "PaymentTransaction", refId: tx._id, isDemo: tx.isDemo },
      session,
    );
    await notify(userId, { type: "payment", title: m("Kredi yüklendi"), body: m("{credits} kredi cüzdanına eklendi."), params: { credits: tx.item.credits ?? 0 }, link: "/app/wallet" }, session);
    return;
  }
  if (tx.kind === "subscription") {
    const plan = await MembershipPlan.findById(tx.item.refId).session(session).lean<IMembershipPlan>();
    if (!plan) throw new Error("Plan bulunamadı"); // i18n-ignore (dahili hata)
    const interval = (tx.item.interval ?? "month") as "month" | "year";
    const now = new Date();
    const existing = await Subscription.findOne({ userId: tx.userId, scope: plan.scope, creatorId: plan.creatorId ?? null, status: { $in: ["active", "past_due"] } }).session(session);
    if (existing) {
      // Yükseltme/yenileme: yeni dönem mevcut dönem sonundan (veya şimdiden) başlar.
      const start = existing.currentPeriodEnd && existing.currentPeriodEnd > now && existing.planId.equals(plan._id) ? existing.currentPeriodEnd : now;
      existing.planId = plan._id;
      existing.tier = plan.tier;
      existing.interval = interval;
      existing.price = tx.amount;
      existing.currentPeriodStart = start;
      existing.currentPeriodEnd = addInterval(start, interval);
      existing.cancelAtPeriodEnd = false;
      existing.status = "active";
      existing.lastTransactionId = tx._id;
      existing.history.push({ from: "active", to: "active", by: tx.userId, note: "Yenileme/yükseltme", at: now }); // i18n-ignore (durum geçmişi notu)
      await existing.save({ session });
    } else {
      await Subscription.create(
        [
          {
            userId: tx.userId,
            planId: plan._id,
            scope: plan.scope,
            creatorId: plan.creatorId ?? null,
            tier: plan.tier,
            status: "active",
            interval,
            price: tx.amount,
            currentPeriodStart: now,
            currentPeriodEnd: addInterval(now, interval),
            provider: tx.provider,
            lastTransactionId: tx._id,
            history: [{ from: null, to: "active", by: tx.userId, at: now }],
            isDemo: tx.isDemo,
          },
        ],
        { session },
      );
      if (plan.creatorId) await CreatorProfile.updateOne({ _id: plan.creatorId }, { $inc: { "stats.subscribers": 1 } }, { session });
    }
    if (plan.entitlements.monthlyCredits > 0) {
      await creditWallet(
        { userId, amount: plan.entitlements.monthlyCredits, type: "subscription_grant", description: `${plan.name} üyelik kredisi` /* i18n-ignore (defter açıklaması saklanır) */, idempotencyKey: `subgrant:${tx._id.toString()}`, refType: "PaymentTransaction", refId: tx._id },
        session,
      );
    }
    if (plan.creatorId) {
      // i18n-ignore (hak ediş açıklaması saklanır)
      await recordPaymentEarning({ creatorId: plan.creatorId, sourceType: "subscription", grossMinor: tx.amount.amountMinor, currency: tx.amount.currency, transactionId: tx._id, description: `Abonelik: ${plan.name}`, isDemo: tx.isDemo }, session);
      const creator = await CreatorProfile.findById(plan.creatorId, { userId: 1 }).session(session).lean();
      if (creator) await notify(creator.userId.toString(), { type: "subscription", title: m("Yeni abone"), body: m("{plan} planına yeni bir abone katıldı."), params: { plan: plan.name }, link: "/studio/memberships" }, session);
    }
    await notify(userId, { type: "subscription", title: m("Üyeliğin aktif"), body: m("{label} üyeliğin başladı."), params: { label: tx.item.label }, link: "/app/subscriptions" }, session);
    return;
  }
  if (tx.kind === "content_purchase") {
    const content = await ContentItem.findById(tx.item.refId).session(session).lean();
    if (!content) throw new Error("İçerik bulunamadı"); // i18n-ignore (dahili hata)
    await ContentAccessGrant.updateOne(
      { userId: tx.userId, contentId: content._id },
      { $set: { revokedAt: null, revokeReason: null }, $setOnInsert: { userId: tx.userId, contentId: content._id, creatorId: content.creatorId, source: "purchase", transactionId: tx._id, grantedAt: new Date() } },
      { upsert: true, session },
    );
    await ContentItem.updateOne({ _id: content._id }, { $inc: { "stats.purchases": 1, "stats.revenueMinor": tx.amount.amountMinor } }, { session });
    // i18n-ignore (hak ediş açıklaması saklanır)
    await recordPaymentEarning({ creatorId: content.creatorId, sourceType: "content", grossMinor: tx.amount.amountMinor, currency: tx.amount.currency, transactionId: tx._id, description: `İçerik satışı: ${content.title}`, isDemo: tx.isDemo }, session);
    await notify(userId, { type: "payment", title: m("İçeriğin kilidi açıldı"), body: content.title, link: `/content/${content._id.toString()}` }, session);
  }
}

/** Sağlayıcı webhook'unu işler. Aynı olay iki kez işlenmez; ödeme yalnız burada kesinleşir. */
export async function processPaymentWebhook(providerName: string, headers: Headers, rawBody: string) {
  const provider = getPaymentProvider();
  if (provider.name !== providerName) throw new AppError("Sağlayıcı uyuşmuyor.", "provider_mismatch", 400);
  const event = await provider.parseWebhook(headers, rawBody); // imza doğrulaması
  await connectDb();
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  try {
    await PaymentWebhookEvent.create({ provider: provider.name, eventId: event.eventId, type: event.type, payloadHash });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { duplicate: true };
    throw err;
  }
  try {
    const result = await handleEvent(provider.name, event);
    await PaymentWebhookEvent.updateOne({ provider: provider.name, eventId: event.eventId }, { $set: { status: result.ignored ? "ignored" : "processed", processedAt: new Date(), transactionId: result.transactionId ?? null } });
    return { duplicate: false, ...result };
  } catch (err) {
    await PaymentWebhookEvent.updateOne({ provider: provider.name, eventId: event.eventId }, { $set: { status: "failed", error: String((err as Error).message).slice(0, 500) } });
    // Sağlayıcının yeniden denemesi için olay kaydını sil (tekrar işlenebilsin)
    await PaymentWebhookEvent.deleteOne({ provider: provider.name, eventId: event.eventId, status: "failed" });
    throw err;
  }
}

async function handleEvent(providerName: string, event: PaymentEvent): Promise<{ ignored?: boolean; transactionId?: import("mongoose").Types.ObjectId }> {
  if (event.type !== "payment.succeeded" && event.type !== "payment.failed") return { ignored: true };
  const tx = await PaymentTransaction.findOne({ provider: providerName, providerSessionId: event.sessionId });
  if (!tx) return { ignored: true };
  if (event.type === "payment.failed") {
    if (tx.status === "pending" || tx.status === "created") {
      tx.status = "failed";
      tx.failureReason = event.failureReason ?? "Ödeme başarısız"; // i18n-ignore (saklanan sağlayıcı notu)
      tx.history.push({ from: "pending", to: "failed", by: null, at: new Date() });
      await tx.save();
      await notify(tx.userId.toString(), { type: "payment", title: m("Ödeme tamamlanamadı"), body: tx.failureReason ?? undefined, link: "/app/settings" });
    }
    return { transactionId: tx._id };
  }
  if (tx.status === "succeeded") return { transactionId: tx._id }; // zaten işlenmiş
  if (event.amountMinor != null && event.amountMinor !== tx.amount.amountMinor) throw new Error("Tutar uyuşmazlığı"); // i18n-ignore (dahili hata)
  if (event.currency && event.currency !== tx.amount.currency) throw new Error("Para birimi uyuşmazlığı"); // i18n-ignore (dahili hata)
  await withTransaction(async (session) => {
    const fresh = await PaymentTransaction.findById(tx._id).session(session);
    if (!fresh || fresh.status === "succeeded") return;
    fresh.status = "succeeded";
    fresh.providerPaymentId = event.paymentId ?? fresh.providerPaymentId;
    fresh.succeededAt = new Date();
    fresh.history.push({ from: "pending", to: "succeeded", by: null, at: new Date() });
    await fresh.save({ session });
    await fulfill(fresh.toObject() as IPaymentTransaction & { _id: import("mongoose").Types.ObjectId }, session);
  });
  const typeMap = { credit_purchase: "credit_purchase", subscription: "subscription_started", content_purchase: "content_purchase" } as const;
  const t = typeMap[tx.kind as keyof typeof typeMap];
  if (t) await AnalyticsEvent.create({ type: t, userId: tx.userId, creatorId: tx.creatorId ?? null, props: { amountMinor: tx.amount.amountMinor, isTest: tx.isTest } });
  return { transactionId: tx._id };
}

/**
 * İade (yetkili admin): sağlayıcıda iade → yerel ters kayıtlar.
 * Kredi alımı iadesinde, harcanmamış kredi kadar geri alınabilir.
 */
export async function refundTransaction(actor: { id: string; adminRole: string | null }, transactionId: string, amountMinor: number, reason: string) {
  await connectDb();
  const tx = await PaymentTransaction.findById(oid(transactionId));
  if (!tx) throw new NotFoundError("İşlem bulunamadı.");
  if (tx.status !== "succeeded" && tx.status !== "partially_refunded") throw new ConflictError("Yalnız başarılı işlemler iade edilebilir.");
  const refundable = tx.amount.amountMinor - tx.refundedMinor;
  if (!Number.isInteger(amountMinor) || amountMinor <= 0 || amountMinor > refundable) throw new AppError("İade tutarı 0 ile {refundable} kuruş arasında olmalı.", "invalid_refund_amount", 400, { params: { refundable: String(refundable) } });
  const provider = getPaymentProvider();
  const refund = await Refund.create({
    transactionId: tx._id,
    userId: tx.userId,
    amount: { amountMinor, currency: tx.amount.currency },
    reason,
    status: "processing",
    requestedBy: oid(actor.id),
    approvedBy: oid(actor.id),
    history: [{ from: null, to: "processing", by: oid(actor.id), at: new Date() }],
  });
  const result = await provider.refund({ paymentId: tx.providerPaymentId ?? tx.providerSessionId ?? "", amountMinor, currency: tx.amount.currency, reason });
  await withTransaction(async (session) => {
    const fresh = await PaymentTransaction.findById(tx._id).session(session);
    if (!fresh) return;
    fresh.refundedMinor += amountMinor;
    const full = fresh.refundedMinor >= fresh.amount.amountMinor;
    fresh.history.push({ from: fresh.status, to: full ? "refunded" : "partially_refunded", by: oid(actor.id), note: reason, at: new Date() });
    fresh.status = full ? "refunded" : "partially_refunded";
    await fresh.save({ session });

    if (fresh.kind === "credit_purchase" && fresh.item.credits) {
      const credits = Math.floor((fresh.item.credits * amountMinor) / fresh.amount.amountMinor);
      if (credits > 0) {
        try {
          // i18n-ignore (defter açıklaması saklanır)
          await debitWallet({ userId: fresh.userId, amount: credits, type: "refund_debit", description: `İade: ${fresh.item.label}`, idempotencyKey: `refund_debit:${refund._id.toString()}`, refType: "Refund", refId: refund._id }, session);
        } catch {
          // Krediler harcanmışsa geri alınamaz; denetim kaydına not düşülür.
        }
      }
    }
    if (fresh.kind === "content_purchase" && full) {
      await ContentAccessGrant.updateOne({ userId: fresh.userId, contentId: fresh.item.refId }, { $set: { revokedAt: new Date(), revokeReason: "refund" } }, { session });
    }
    if (fresh.kind === "subscription" && full) {
      await Subscription.updateOne({ lastTransactionId: fresh._id }, { $set: { status: "canceled", canceledAt: new Date(), cancelAtPeriodEnd: false } }, { session });
    }
    const earning = await CreatorEarning.findOne({ transactionId: fresh._id, reversesEarningId: null }).session(session).lean();
    if (earning) await reverseEarning(earning, amountMinor, reason, session);
    await Refund.updateOne({ _id: refund._id }, { $set: { status: result.status === "succeeded" ? "succeeded" : "processing", providerRefundId: result.refundId } }, { session });
  });
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "finance.refund", targetType: "PaymentTransaction", targetId: transactionId, reason, severity: "critical", metadata: { amountMinor } });
  await notify(tx.userId.toString(), { type: "payment", title: m("İade işlendi"), body: m("{label} için iade başlatıldı."), params: { label: tx.item.label }, link: "/app/settings" });
  return { refundId: refund._id.toString() };
}

/** Abonelik iptali: dönem sonunda sona erer (para iadesi yok). */
export async function cancelSubscription(userId: string, subscriptionId: string) {
  await connectDb();
  const sub = await Subscription.findOne({ _id: oid(subscriptionId), userId: oid(userId), status: { $in: ["active", "past_due"] } });
  if (!sub) throw new NotFoundError("Etkin abonelik bulunamadı.");
  sub.cancelAtPeriodEnd = true;
  sub.canceledAt = new Date();
  sub.history.push({ from: sub.status, to: sub.status, by: oid(userId), note: "Dönem sonunda iptal", at: new Date() }); // i18n-ignore (durum geçmişi notu)
  await sub.save();
  return { endsAt: sub.currentPeriodEnd };
}

export async function resumeSubscription(userId: string, subscriptionId: string) {
  await connectDb();
  const res = await Subscription.updateOne(
    { _id: oid(subscriptionId), userId: oid(userId), status: { $in: ["active", "past_due"] }, cancelAtPeriodEnd: true },
    { $set: { cancelAtPeriodEnd: false, canceledAt: null } },
  );
  if (!res.modifiedCount) throw new NotFoundError("Devam ettirilecek abonelik bulunamadı.");
}

/** Süresi dolan abonelikleri kapatır (cron). */
export async function expireSubscriptions() {
  await connectDb();
  const now = new Date();
  const due = await Subscription.find({ status: { $in: ["active", "past_due"] }, currentPeriodEnd: { $lte: now } }).limit(500);
  for (const sub of due) {
    sub.history.push({ from: sub.status, to: "expired", by: null, at: now });
    sub.status = "expired";
    await sub.save();
    if (sub.creatorId) await CreatorProfile.updateOne({ _id: sub.creatorId, "stats.subscribers": { $gt: 0 } }, { $inc: { "stats.subscribers": -1 } });
  }
  return due.length;
}
