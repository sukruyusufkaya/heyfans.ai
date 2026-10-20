import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { PaymentTransaction, WalletLedgerEntry, type IPaymentTransaction, type IWalletLedgerEntry, type LedgerType } from "@/models/monetization";
import { getPlatformSettings } from "@/services/platform/settings";
import { getWalletSummary, listLedger } from "@/services/wallet/wallet";
import { m } from "@/i18n/m";
import { getT } from "@/i18n/server";

export const LEDGER_LABELS: Record<LedgerType, string> = {
  purchase: m("Kredi yükleme"),
  subscription_grant: m("Üyelik kredisi"),
  bonus: m("Bonus kredi"),
  spend_message: m("AI ikizi sohbeti"),
  spend_voice: m("Sesli görüşme"),
  spend_video: m("Görüntülü görüşme"),
  spend_content: m("Premium içerik"),
  spend_custom_request: m("Özel talep"),
  gift_sent: m("Hediye"),
  tip_sent: m("Bahşiş"),
  refund: m("İade"),
  reversal: m("İade (iptal)"),
  adjustment: m("Düzeltme"),
  refund_debit: m("Ödeme iadesi kesintisi"),
};

const SPEND_GROUPS: { key: string; label: string; types: LedgerType[] }[] = [
  { key: "chat", label: m("Sohbet"), types: ["spend_message"] },
  { key: "call", label: m("Görüşmeler"), types: ["spend_voice", "spend_video"] },
  { key: "requests", label: m("Özel talepler"), types: ["spend_custom_request"] },
  { key: "gifts", label: m("Hediye ve bahşiş"), types: ["gift_sent", "tip_sent"] },
  { key: "content", label: m("İçerik"), types: ["spend_content"] },
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
  const t = await getT();
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
  const groups = SPEND_GROUPS.map((g) => ({ key: g.key, label: t(g.label), credits: g.types.reduce((s, ty) => s + Math.abs(Math.min(0, byType.get(ty) ?? 0)), 0) })).filter((g) => g.credits > 0);
  const grossSpent = groups.reduce((s, g) => s + g.credits, 0);
  const netSpent = Math.max(0, grossSpent - refunded);

  // Ters çevrilmiş harcamaları işaretle
  const reversed = await WalletLedgerEntry.find({ reversesEntryId: { $in: ledger.items.map((i) => i._id) } }, { reversesEntryId: 1 }).lean();
  const reversedSet = new Set(reversed.map((r) => r.reversesEntryId!.toString()));
  const rows: LedgerRowView[] = ledger.items.map((e: IWalletLedgerEntry) => ({
    id: e._id.toString(),
    createdAt: new Date(e.createdAt).toISOString(),
    type: e.type,
    label: t(LEDGER_LABELS[e.type] ?? e.type),
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
  credit_purchase: m("Kredi paketi"),
  subscription: m("Üyelik"),
  content_purchase: m("İçerik satın alma"),
  custom_request: m("Özel talep"),
  tip: m("Bahşiş"),
};

export const TX_STATUS_LABELS: Record<IPaymentTransaction["status"], string> = {
  created: m("Başlatıldı"),
  pending: m("Beklemede"),
  succeeded: m("Başarılı"),
  failed: m("Başarısız"),
  canceled: m("İptal"),
  refunded: m("İade edildi"),
  partially_refunded: m("Kısmen iade"),
  chargeback: m("İtiraz"),
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
