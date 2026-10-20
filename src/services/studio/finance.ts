import "server-only";
import { z } from "zod";
import { CreatorEarning, PayoutAccount, PayoutRequest, EARNING_SOURCES, type ICreatorEarning, type IPayoutAccount, type IPayoutRequest } from "@/models/monetization";
import { earningsBalance } from "@/services/billing/earnings";
import { getPlatformSettings } from "@/services/platform/settings";
import { studioCreator } from "./context";
import { m } from "@/i18n/m";
import { getT } from "@/i18n/server";
import { LOCALE_META } from "@/i18n/config";

export const SOURCE_LABELS: Record<(typeof EARNING_SOURCES)[number], string> = {
  subscription: m("Abonelikler"),
  content: m("İçerik satışı"),
  tip: m("Bahşişler"),
  gift: m("Hediyeler"),
  chat: m("AI sohbetleri"),
  voice: m("Sesli görüşme"),
  video: m("Görüntülü görüşme"),
  custom_request: m("Özel talepler"),
};

export const earningsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(500).catch(1),
  source: z.enum(["all", ...EARNING_SOURCES]).catch("all"),
});

const monthKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit" }).format(d);

/** /studio/earnings: bakiye, kaynak dağılımı, aylık seri ve hak ediş defteri. */
export async function getEarnings(userId: string, opts: { page: number; source: string }) {
  const t = await getT();
  const monthLabel = new Intl.DateTimeFormat(LOCALE_META[t.locale].intl, { month: "short", timeZone: "Europe/Istanbul" });
  const creator = await studioCreator(userId);
  const cid = creator._id;
  const pageSize = 15;
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const q: Record<string, unknown> = { creatorId: cid };
  if (opts.source !== "all") q.sourceType = opts.source;

  const [balance, bySource, byMonth, rows, total, settings] = await Promise.all([
    earningsBalance(cid.toString()),
    CreatorEarning.aggregate<{ _id: string; v: number; n: number }>([{ $match: { creatorId: cid } }, { $group: { _id: "$sourceType", v: { $sum: "$creatorShareMinor" }, n: { $sum: 1 } } }, { $sort: { v: -1 } }]),
    CreatorEarning.aggregate<{ _id: string; v: number }>([
      { $match: { creatorId: cid, createdAt: { $gte: first } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "Europe/Istanbul" } }, v: { $sum: "$creatorShareMinor" } } },
    ]),
    CreatorEarning.find(q).sort({ createdAt: -1 }).skip((opts.page - 1) * pageSize).limit(pageSize).lean<ICreatorEarning[]>(),
    CreatorEarning.countDocuments(q),
    getPlatformSettings(),
  ]);

  const months: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: monthLabel.format(d), value: byMonth.find((m) => m._id === monthKey(d))?.v ?? 0 });
  }
  return {
    creator,
    balance,
    bySource: bySource.filter((s) => s.v > 0).map((s) => ({ key: s._id as (typeof EARNING_SOURCES)[number], name: t(SOURCE_LABELS[s._id as (typeof EARNING_SOURCES)[number]] ?? s._id), value: s.v, count: s.n })),
    months,
    rows,
    total,
    page: opts.page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    revenue: { shareBps: settings.revenue.creatorShareBps, holdDays: settings.revenue.holdDays, processingFeeBps: settings.revenue.processingFeeBps, vatBps: settings.revenue.vatBps },
    hasDemo: Boolean(creator.isDemo),
  };
}

/** /studio/payouts: hesap, bakiye, uygunluk, geçmiş. */
export async function getPayouts(userId: string) {
  const t = await getT();
  const creator = await studioCreator(userId);
  const cid = creator._id;
  const [balance, account, requests, settings] = await Promise.all([
    earningsBalance(cid.toString()),
    PayoutAccount.findOne({ creatorId: cid, isDefault: true }).sort({ createdAt: -1 }).lean<IPayoutAccount>(),
    PayoutRequest.find({ creatorId: cid }).sort({ createdAt: -1 }).limit(30).lean<IPayoutRequest[]>(),
    getPlatformSettings(),
  ]);
  const reasons: string[] = [];
  if (!settings.features.payouts) reasons.push(t("Ödeme talepleri şu anda platform genelinde kapalı: ödeme sağlayıcısı ve finansal uygunluk süreci henüz tamamlanmadı."));
  if (creator.status !== "approved") reasons.push(t("Creator başvurun onaylanmadan ödeme talep edilemez."));
  if (creator.verification.identity !== "verified") reasons.push(t("Kimlik doğrulaman tamamlanmadan ödeme talep edilemez."));
  if (!creator.payoutsEnabled) reasons.push(t("Hesabın için ödemeler henüz etkinleştirilmedi."));
  if (!account) reasons.push(t("Önce bir ödeme hesabı (IBAN) ekle."));
  else if (account.status !== "verified") reasons.push(account.status === "rejected" ? t("Ödeme hesabın reddedildi; yeni bir IBAN ekle.") : t("Ödeme hesabın henüz doğrulanmadı; doğrulama sonrası talep edebilirsin."));
  if (requests.some((r) => ["requested", "approved", "processing"].includes(r.status))) reasons.push(t("Devam eden bir ödeme talebin var."));
  if (balance.available < settings.revenue.minPayoutMinor) reasons.push(t("Kullanılabilir bakiye en düşük ödeme tutarının (₺{min}) altında.", { min: String(settings.revenue.minPayoutMinor / 100) }));
  return {
    creator,
    balance,
    account,
    requests,
    minPayoutMinor: settings.revenue.minPayoutMinor,
    payoutsEnabled: settings.features.payouts,
    holdDays: settings.revenue.holdDays,
    reasons,
    canRequest: reasons.length === 0,
  };
}
