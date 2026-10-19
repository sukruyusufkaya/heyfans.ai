import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { oid, paged } from "@/lib/validation/common";
import { CreatorEarning, PaymentTransaction, PayoutAccount, PayoutRequest, Refund, TRANSACTION_KINDS, TRANSACTION_STATUSES, type IPaymentTransaction, type IPayoutRequest } from "@/models/monetization";
import { getPlatformSettings } from "@/services/platform/settings";
import { GROSS_STATUSES, txDateMatch } from "./dashboard";
import { audit } from "@/lib/security/audit";
import { loadCreators, loadUsers, monthBuckets, monthKeyExpr, pctDelta, REGEX_SAFE, type AdminActor } from "./shared";

const PAGE_SIZE = 15;
export const RANGES = { "30": 30, "90": 90, "365": 365 } as const;
export type RangeKey = keyof typeof RANGES;

export async function getFinanceOverview(rangeDays: number) {
  await connectDb();
  const now = new Date();
  const from = new Date(now.getTime() - rangeDays * 86_400_000);
  const prevFrom = new Date(from.getTime() - rangeDays * 86_400_000);
  const months = monthBuckets(12, now);
  const gross = { status: { $in: [...GROSS_STATUSES] }, "amount.currency": "TRY" };
  const sum = (match: Record<string, unknown>) =>
    PaymentTransaction.aggregate<{ total: number; n: number }>([{ $match: match }, { $group: { _id: null, total: { $sum: "$amount.amountMinor" }, n: { $sum: 1 } } }]);
  const earn = (a: Date, b: Date) =>
    CreatorEarning.aggregate<{ platform: number; creator: number }>([
      { $match: { createdAt: { $gte: a, $lt: b }, currency: "TRY" } },
      { $group: { _id: null, platform: { $sum: "$platformFeeMinor" }, creator: { $sum: "$creatorShareMinor" } } },
    ]);
  const refunds = (a: Date, b: Date) =>
    Refund.aggregate<{ total: number; n: number }>([
      { $match: { createdAt: { $gte: a, $lt: b }, status: { $in: ["approved", "processing", "succeeded"] } } },
      { $group: { _id: null, total: { $sum: "$amount.amountMinor" }, n: { $sum: 1 } } },
    ]);
  const [g, gPrev, e, ePrev, r, rPrev, monthly, byKind, tests] = await Promise.all([
    sum({ ...gross, ...txDateMatch(from, now) }),
    sum({ ...gross, ...txDateMatch(prevFrom, from) }),
    earn(from, now),
    earn(prevFrom, from),
    refunds(from, now),
    refunds(prevFrom, from),
    PaymentTransaction.aggregate<{ _id: string; total: number }>([
      { $match: { ...gross, ...txDateMatch(months[0]!.start, now) } },
      { $addFields: { at: { $ifNull: ["$succeededAt", "$createdAt"] } } },
      { $group: { _id: monthKeyExpr("at"), total: { $sum: "$amount.amountMinor" } } },
    ]),
    PaymentTransaction.aggregate<{ _id: string; total: number }>([
      { $match: { ...gross, ...txDateMatch(from, now) } },
      { $group: { _id: "$kind", total: { $sum: "$amount.amountMinor" } } },
      { $sort: { total: -1 } },
    ]),
    PaymentTransaction.countDocuments({ status: { $in: [...GROSS_STATUSES] }, isTest: true, ...txDateMatch(from, now) }),
  ]);
  const mm = new Map(monthly.map((x) => [x._id, x.total]));
  return {
    gross: g[0]?.total ?? 0,
    grossCount: g[0]?.n ?? 0,
    grossDelta: pctDelta(g[0]?.total ?? 0, gPrev[0]?.total ?? 0),
    platformFee: e[0]?.platform ?? 0,
    platformDelta: pctDelta(e[0]?.platform ?? 0, ePrev[0]?.platform ?? 0),
    creatorShare: e[0]?.creator ?? 0,
    creatorDelta: pctDelta(e[0]?.creator ?? 0, ePrev[0]?.creator ?? 0),
    refunds: r[0]?.total ?? 0,
    refundCount: r[0]?.n ?? 0,
    refundDelta: pctDelta(r[0]?.total ?? 0, rPrev[0]?.total ?? 0),
    monthly: months.map((m) => ({ label: m.label, value: mm.get(m.key) ?? 0 })),
    byKind: byKind.map((k) => ({ kind: k._id, value: k.total })),
    testCount: tests,
  };
}

export const TX_KINDS = ["all", ...TRANSACTION_KINDS] as const;
export const TX_STATUSES = ["all", ...TRANSACTION_STATUSES] as const;

export async function listTransactions(opts: { kind: string; status: string; provider: string; q: string; page: number }) {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (opts.kind !== "all") filter.kind = opts.kind;
  if (opts.status !== "all") filter.status = opts.status;
  if (opts.provider !== "all") filter.provider = opts.provider;
  if (opts.q) {
    if (/^[a-f0-9]{24}$/i.test(opts.q)) filter._id = oid(opts.q);
    else filter["item.label"] = { $regex: REGEX_SAFE(opts.q), $options: "i" };
  }
  const [rows, total, providers] = await Promise.all([
    PaymentTransaction.find(filter).sort({ createdAt: -1 }).skip((opts.page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean<IPaymentTransaction[]>(),
    PaymentTransaction.countDocuments(filter),
    PaymentTransaction.distinct("provider"),
  ]);
  const users = await loadUsers(rows.map((r) => r.userId));
  const items = rows.map((t) => ({
    id: t._id.toString(),
    ref: `TXN-${t._id.toString().slice(-6).toUpperCase()}`,
    kind: t.kind,
    label: t.item.label,
    amountMinor: t.amount.amountMinor,
    currency: t.amount.currency,
    refundedMinor: t.refundedMinor,
    status: t.status,
    provider: t.provider,
    isTest: t.isTest,
    isDemo: t.isDemo,
    user: users.get(t.userId.toString())?.name ?? "Kullanıcı",
    createdAt: t.createdAt,
  }));
  return { ...paged(items, total, opts.page, PAGE_SIZE), providers: providers.map(String).sort() };
}

export const PAYOUT_FILTERS = ["active", "all", "paid", "rejected"] as const;

export async function listPayouts(opts: { filter: (typeof PAYOUT_FILTERS)[number]; page: number }) {
  await connectDb();
  const match: Record<string, unknown> =
    opts.filter === "active" ? { status: { $in: ["requested", "approved", "processing"] } } : opts.filter === "paid" ? { status: "paid" } : opts.filter === "rejected" ? { status: { $in: ["rejected", "failed", "canceled"] } } : {};
  const [rows, total, counts] = await Promise.all([
    PayoutRequest.find(match).sort({ createdAt: -1 }).skip((opts.page - 1) * 10).limit(10).lean<IPayoutRequest[]>(),
    PayoutRequest.countDocuments(match),
    PayoutRequest.aggregate<{ _id: string; n: number; sum: number }>([{ $group: { _id: "$status", n: { $sum: 1 }, sum: { $sum: "$amount.amountMinor" } } }]),
  ]);
  const [creators, accounts] = await Promise.all([
    loadCreators(rows.map((r) => r.creatorId)),
    rows.length ? PayoutAccount.find({ _id: { $in: rows.map((r) => r.payoutAccountId) } }, { ibanMasked: 1, status: 1, holderName: 1, bankName: 1 }).lean() : Promise.resolve([]),
  ]);
  const accMap = new Map(accounts.map((a) => [a._id.toString(), a]));
  const items = rows.map((p) => {
    const a = accMap.get(p.payoutAccountId.toString());
    return {
      id: p._id.toString(),
      creator: creators.get(p.creatorId.toString())?.displayName ?? "Creator",
      amountMinor: p.amount.amountMinor,
      currency: p.amount.currency,
      status: p.status,
      createdAt: p.createdAt,
      providerRef: p.providerRef ?? null,
      note: p.note ?? null,
      account: a ? { masked: a.ibanMasked, status: a.status, holder: a.holderName, bank: a.bankName ?? null } : null,
    };
  });
  const stat = (s: string) => counts.find((c) => c._id === s);
  return {
    ...paged(items, total, opts.page, 10),
    summary: {
      queued: (stat("requested")?.n ?? 0) + (stat("approved")?.n ?? 0) + (stat("processing")?.n ?? 0),
      queuedMinor: (stat("requested")?.sum ?? 0) + (stat("approved")?.sum ?? 0) + (stat("processing")?.sum ?? 0),
      paidMinor: stat("paid")?.sum ?? 0,
    },
  };
}

export async function listPayoutAccountsForReview() {
  await connectDb();
  const rows = await PayoutAccount.find({ status: { $in: ["unverified", "rejected"] } }).sort({ createdAt: -1 }).limit(30).lean();
  const creators = await loadCreators(rows.map((r) => r.creatorId));
  const verifiedCount = await PayoutAccount.countDocuments({ status: "verified" });
  return {
    verifiedCount,
    items: rows.map((a) => ({ id: a._id.toString(), creator: creators.get(a.creatorId.toString())?.displayName ?? "Creator", holder: a.holderName, masked: a.ibanMasked, bank: a.bankName ?? null, status: a.status, createdAt: a.createdAt })),
  };
}

/** Mutabakat kontrolleri: defter kayıtlarının birbiriyle tutarlılığı (gerçek sayımlardan). */
export async function getReconciliation() {
  await connectDb();
  const settings = await getPlatformSettings();
  const creatorKinds: IPaymentTransaction["kind"][] = ["subscription", "content_purchase", "tip", "custom_request"];
  const [creatorTx, withEarning, refundedSum, refundRows, openRefunds, testTx, demoTx, unpaidPayouts] = await Promise.all([
    PaymentTransaction.find({ status: { $in: [...GROSS_STATUSES] }, kind: { $in: creatorKinds }, creatorId: { $ne: null } }, { _id: 1 }).lean(),
    CreatorEarning.distinct("transactionId", { transactionId: { $ne: null }, reversesEarningId: null }),
    PaymentTransaction.aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: "$refundedMinor" } } }]),
    Refund.aggregate<{ total: number }>([{ $match: { status: { $in: ["succeeded", "processing", "approved"] }, kind: "refund" } }, { $group: { _id: null, total: { $sum: "$amount.amountMinor" } } }]),
    Refund.countDocuments({ status: { $in: ["requested", "approved", "processing"] } }),
    PaymentTransaction.countDocuments({ isTest: true }),
    PaymentTransaction.countDocuments({ isDemo: true }),
    PayoutRequest.countDocuments({ status: { $in: ["requested", "approved", "processing"] } }),
  ]);
  const earned = new Set(withEarning.map(String));
  const matched = creatorTx.filter((t) => earned.has(t._id.toString())).length;
  const txRefunded = refundedSum[0]?.total ?? 0;
  const refundLedger = refundRows[0]?.total ?? 0;
  return {
    earningCoverage: { matched, total: creatorTx.length, pct: creatorTx.length ? Math.round((matched / creatorTx.length) * 100) : null },
    refundConsistency: { txRefundedMinor: txRefunded, refundLedgerMinor: refundLedger, diffMinor: txRefunded - refundLedger },
    openRefunds,
    unpaidPayouts,
    testTx,
    demoTx,
    rules: {
      creatorShareBps: settings.revenue.creatorShareBps,
      processingFeeBps: settings.revenue.processingFeeBps,
      processingFeeFixedMinor: settings.revenue.processingFeeFixedMinor,
      vatBps: settings.revenue.vatBps,
      holdDays: settings.revenue.holdDays,
      minPayoutMinor: settings.revenue.minPayoutMinor,
      payoutsEnabled: settings.features.payouts,
    },
  };
}

/** Ödeme hesabı incelemesinin gerekçesi denetim kaydına işlenir (servis kaydı gerekçe taşımaz). */
export async function auditPayoutAccountReview(actor: AdminActor, accountId: string, status: "verified" | "rejected", reason: string) {
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: "payout_account.review_note", targetType: "PayoutAccount", targetId: accountId, reason, severity: "notice", metadata: { status } });
}
