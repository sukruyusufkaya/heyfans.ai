import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { PaymentTransaction, WalletLedgerEntry, type IPaymentTransaction, type IWalletLedgerEntry, type LedgerType } from "@/models/monetization";
import { getPlatformSettings } from "@/services/platform/settings";
import { getWalletSummary, listLedger } from "@/services/wallet/wallet";

export const LEDGER_LABELS: Record<LedgerType, string> = {
  purchase: "Kredi yükleme",
  subscription_grant: "Üyelik kredisi",
  bonus: "Bonus kredi",
  spend_message: "AI ikizi sohbeti",
  spend_voice: "Sesli görüşme",
  spend_video: "Görüntülü görüşme",
  spend_content: "Premium içerik",
  spend_custom_request: "Özel talep",
  gift_sent: "Hediye",
  tip_sent: "Bahşiş",
  refund: "İade",
  reversal: "İade (iptal)",
  adjustment: "Düzeltme",
  refund_debit: "Ödeme iadesi kesintisi",
};

const SPEND_GROUPS: { key: string; label: string; types: LedgerType[] }[] = [
  { key: "chat", label: "Sohbet", types: ["spend_message"] },
  { key: "call", label: "Görüşmeler", types: ["spend_voice", "spend_video"] },
  { key: "requests", label: "Özel talepler", types: ["spend_custom_request"] },
  { key: "gifts", label: "Hediye ve bahşiş", types: ["gift_sent", "tip_sent"] },
  { key: "content", label: "İçerik", types: ["spend_content"] },
];

export interface LedgerRowView {
  id: string;
  createdAt: string;
  type: LedgerType;
  label: string;
  description: string;
  amount: number;
  balanceAfter: number;
  status: "completed" | "reversed" | "refund";
  isDemo: boolean;
}

/** /app/wallet verisi: bakiye, paketler, bu ayki harcama özeti ve sayfalı defter. */
export async function getWalletPage(userId: string, opts: { filter?: "in" | "out"; page: number }) {
  await connectDb();
  const uid = oid(userId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [summary, settings, ledger, agg] = await Promise.all([
    getWalletSummary(userId),
    getPlatformSettings(),
    listLedger(userId, opts.page, 15, opts.filter),
    WalletLedgerEntry.aggregate<{ _id: LedgerType; total: number }>([
      { $match: { userId: uid, createdAt: { $gte: monthStart } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]),
  ]);
  const byType = new Map(agg.map((a) => [a._id, a.total]));
  const refunded = (byType.get("reversal") ?? 0) + (byType.get("refund") ?? 0);
  const groups = SPEND_GROUPS.map((g) => ({ key: g.key, label: g.label, credits: g.types.reduce((s, t) => s + Math.abs(Math.min(0, byType.get(t) ?? 0)), 0) })).filter((g) => g.credits > 0);
  const grossSpent = groups.reduce((s, g) => s + g.credits, 0);
  const netSpent = Math.max(0, grossSpent - refunded);

  // Ters çevrilmiş harcamaları işaretle
  const reversed = await WalletLedgerEntry.find({ reversesEntryId: { $in: ledger.items.map((i) => i._id) } }, { reversesEntryId: 1 }).lean();
  const reversedSet = new Set(reversed.map((r) => r.reversesEntryId!.toString()));
  const rows: LedgerRowView[] = ledger.items.map((e: IWalletLedgerEntry) => ({
    id: e._id.toString(),
    createdAt: new Date(e.createdAt).toISOString(),
    type: e.type,
    label: LEDGER_LABELS[e.type] ?? e.type,
    description: e.description,
    amount: e.amount,
    balanceAfter: e.balanceAfter,
    status: reversedSet.has(e._id.toString()) ? "reversed" : e.type === "reversal" || e.type === "refund" ? "refund" : "completed",
    isDemo: Boolean(e.isDemo),
  }));
  return {
    summary,
    packs: settings.credits.packs,
    month: { grossSpent, refunded, netSpent, groups },
    ledger: { rows, total: ledger.total, page: ledger.page, pageCount: ledger.pageCount },
  };
}

export const TX_KIND_LABELS: Record<IPaymentTransaction["kind"], string> = {
  credit_purchase: "Kredi paketi",
  subscription: "Üyelik",
  content_purchase: "İçerik satın alma",
  custom_request: "Özel talep",
  tip: "Bahşiş",
};

export const TX_STATUS_LABELS: Record<IPaymentTransaction["status"], string> = {
  created: "Başlatıldı",
  pending: "Beklemede",
  succeeded: "Başarılı",
  failed: "Başarısız",
  canceled: "İptal",
  refunded: "İade edildi",
  partially_refunded: "Kısmen iade",
  chargeback: "İtiraz",
};

export interface PaymentRowView {
  id: string;
  createdAt: string;
  kind: IPaymentTransaction["kind"];
  label: string;
  amountMinor: number;
  currency: string;
  status: IPaymentTransaction["status"];
  isTest: boolean;
  refundedMinor: number;
  provider: string;
}

/** Ödeme geçmişi (PaymentTransaction) — sayfalı. */
export async function listPayments(userId: string, opts: { page: number; pageSize?: number; kind?: IPaymentTransaction["kind"] }) {
  await connectDb();
  const pageSize = opts.pageSize ?? 10;
  const q: Record<string, unknown> = { userId: oid(userId) };
  if (opts.kind) q.kind = opts.kind;
  const [rows, total] = await Promise.all([
    PaymentTransaction.find(q)
      .sort({ createdAt: -1 })
      .skip((opts.page - 1) * pageSize)
      .limit(pageSize)
      .lean<IPaymentTransaction[]>(),
    PaymentTransaction.countDocuments(q),
  ]);
  return {
    rows: rows.map(
      (t): PaymentRowView => ({
        id: t._id.toString(),
        createdAt: new Date(t.createdAt).toISOString(),
        kind: t.kind,
        label: t.item.label,
        amountMinor: t.amount.amountMinor,
        currency: t.amount.currency,
        status: t.status,
        isTest: Boolean(t.isTest),
        refundedMinor: t.refundedMinor ?? 0,
        provider: t.provider,
      }),
    ),
    total,
    page: opts.page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}
