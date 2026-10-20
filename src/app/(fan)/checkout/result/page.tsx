import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Undo2, XCircle } from "lucide-react";
import { z } from "zod";
import { AutoRefresh } from "@/components/fan/auto-refresh";
import { flattenSearchParams } from "@/components/fan/link-tabs";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { objectIdSchema } from "@/lib/validation/common";
import { getTransactionForUser } from "@/services/billing/mock";
import { TX_KIND_LABELS, TX_STATUS_LABELS } from "@/services/fan/wallet";
import { getWalletSummary } from "@/services/wallet/wallet";
import type { IPaymentTransaction } from "@/models/monetization";
import { getFormatters, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Ödeme Sonucu") };
}
export const dynamic = "force-dynamic";

const searchSchema = z.object({ tx: objectIdSchema, canceled: z.string().optional() });

function retryHref(tx: IPaymentTransaction) {
  if (tx.item.type === "credit_pack" && tx.item.packKey) return `/checkout?type=credit_pack&pack=${encodeURIComponent(tx.item.packKey)}`;
  if (tx.item.type === "plan" && tx.item.refId) return `/checkout?type=plan&planId=${tx.item.refId.toString()}&interval=${tx.item.interval ?? "month"}`;
  if (tx.item.type === "content" && tx.item.refId) return `/checkout?type=content&id=${tx.item.refId.toString()}`;
  return "/app/wallet";
}

export default async function CheckoutResultPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const { formatDateTime, formatMoney, formatNumber } = await getFormatters();
  const parsed = searchSchema.safeParse(flattenSearchParams(await searchParams));
  if (!parsed.success) notFound();
  const { user } = await requireUser(`/checkout/result?tx=${parsed.data.tx}`);
  let tx: IPaymentTransaction;
  try {
    tx = await getTransactionForUser(user.id, parsed.data.tx);
  } catch (err) {
    if (err instanceof AppError && err.code === "not_found") notFound();
    throw err;
  }
  const canceledByUser = Boolean(parsed.data.canceled) && (tx.status === "pending" || tx.status === "created");
  const waiting = (tx.status === "pending" || tx.status === "created") && !canceledByUser;
  const ok = tx.status === "succeeded" || tx.status === "partially_refunded";
  const failed = tx.status === "failed" || canceledByUser || tx.status === "canceled";
  const wallet = ok && tx.kind === "credit_purchase" ? await getWalletSummary(user.id) : null;

  const Icon = ok ? CheckCircle2 : waiting ? Clock : failed ? XCircle : Undo2;
  const tone = ok ? "bg-success-soft text-success" : waiting ? "bg-warning-soft text-warning" : failed ? "bg-danger-soft text-danger" : "bg-soft text-muted-strong";
  const title = ok ? t("Ödemen alındı") : waiting ? t("Ödemen onaylanıyor") : canceledByUser ? t("Ödemeyi tamamlamadan döndün") : failed ? t("Ödeme tamamlanamadı") : t(TX_STATUS_LABELS[tx.status]);
  const text = ok
    ? t("İşlem başarıyla tamamlandı. Hak tanımları hesabına eklendi.")
    : waiting
      ? t("Ödeme sağlayıcısından sonuç bekleniyor. Bu sayfa birkaç saniyede bir kendini yeniler; sonuç gelince bildirim de alacaksın.")
      : canceledByUser
        ? t("Ücret alınmadı. İstersen ödemeyi yeniden başlatabilirsin.")
        : failed
          ? (tx.failureReason ?? t("Ödeme sağlayıcısı işlemi onaylamadı. Ücret alınmadı."))
          : t("Bu işlem iade edilmiş veya kapatılmış görünüyor.");

  return (
    <div className="mx-auto max-w-lg">
      {waiting && <AutoRefresh everyMs={3000} maxTicks={15} />}
      <Card className="text-center">
        <span className={cn("mx-auto grid size-16 place-items-center rounded-full [&_svg]:size-8", tone)}>
          <Icon aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-black tracking-[-0.035em]" role="status">
          {title}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-strong">{text}</p>

        <dl className="mt-6 grid gap-3 rounded-2xl border border-line-soft bg-[#fbf9fc] p-4 text-start text-xs">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted">{t("Ürün")}</dt>
            <dd className="text-end font-extrabold">{tx.item.label}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">{t("Tür")}</dt>
            <dd className="font-bold">{t(TX_KIND_LABELS[tx.kind])}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">{t("Tutar")}</dt>
            <dd className="font-extrabold">{formatMoney(tx.amount.amountMinor, tx.amount.currency)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">{t("Durum")}</dt>
            <dd className="font-bold">{canceledByUser ? t("İptal edildi") : t(TX_STATUS_LABELS[tx.status])}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">{t("Tarih")}</dt>
            <dd>{formatDateTime(tx.succeededAt ?? tx.createdAt)}</dd>
          </div>
          {wallet && (
            <div className="flex items-center justify-between border-t border-line-soft pt-3">
              <dt className="text-muted">{t("Güncel kredi bakiyen")}</dt>
              <dd className="font-extrabold">{t("{n} kredi", { n: formatNumber(wallet.balance) })}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {ok && tx.kind === "credit_purchase" && (
            <Link href="/app/wallet" className="flex h-11 items-center justify-center rounded-full bg-brand-500 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600 sm:col-span-2">
              {t("Cüzdanıma git")}
            </Link>
          )}
          {ok && tx.kind === "subscription" && (
            <>
              <Link href="/app/subscriptions" className="flex h-11 items-center justify-center rounded-full bg-brand-500 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                {t("Üyeliklerim")}
              </Link>
              <Link href="/chat" className="flex h-11 items-center justify-center rounded-full border border-brand-300 text-xs font-extrabold text-brand-600 hover:bg-brand-50">
                {t("Sohbetlere git")}
              </Link>
            </>
          )}
          {ok && tx.kind === "content_purchase" && tx.item.refId && (
            <>
              <Link href={`/content/${tx.item.refId.toString()}`} className="flex h-11 items-center justify-center rounded-full bg-brand-500 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                {t("İçeriği aç")}
              </Link>
              <Link href="/app/settings" className="flex h-11 items-center justify-center rounded-full border border-brand-300 text-xs font-extrabold text-brand-600 hover:bg-brand-50">
                {t("Ödeme geçmişi")}
              </Link>
            </>
          )}
          {failed && (
            <>
              <Link href={retryHref(tx)} className="flex h-11 items-center justify-center rounded-full bg-brand-500 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                {t("Tekrar dene")}
              </Link>
              <Link href="/app/wallet" className="flex h-11 items-center justify-center rounded-full border border-brand-300 text-xs font-extrabold text-brand-600 hover:bg-brand-50">
                {t("Cüzdanıma dön")}
              </Link>
            </>
          )}
          {waiting && (
            <Link href={`/checkout/result?tx=${tx._id.toString()}`} className="flex h-11 items-center justify-center rounded-full border border-brand-300 text-xs font-extrabold text-brand-600 hover:bg-brand-50 sm:col-span-2">
              {t("Şimdi yenile")}
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
