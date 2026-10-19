import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MockPaymentButtons } from "@/features/fan/mock-payment-buttons";
import { requireUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { formatMoney } from "@/lib/utils";
import { getMockSession } from "@/services/billing/mock";
import { TX_KIND_LABELS } from "@/services/fan/wallet";

export const metadata: Metadata = { title: "Test Ödemesi" };
export const dynamic = "force-dynamic";

/** Mock ödeme sağlayıcısının sahte "ödeme sayfası". Üretimde (APP_MODE=production) 404 döner. */
export default async function MockPaymentPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const { user } = await requireUser(`/checkout/test/${sessionId}`);
  let tx: Awaited<ReturnType<typeof getMockSession>>;
  try {
    tx = await getMockSession(user.id, sessionId);
  } catch (err) {
    if (err instanceof AppError && err.code === "not_found") notFound();
    throw err;
  }
  if (tx.status !== "pending") redirect(`/checkout/result?tx=${tx._id.toString()}`);

  return (
    <div className="mx-auto max-w-lg">
      <div role="note" className="mb-4 flex items-start gap-3 rounded-2xl border border-[#f3dca8] bg-warning-soft px-4 py-3.5">
        <FlaskConical className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
        <div>
          <p className="text-xs font-black tracking-wider text-warning">TEST ÖDEMESİ</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">Bu sayfa gerçek bir ödeme sağlayıcısını taklit eder. Kart bilgisi girilmez, gerçek para tahsil edilmez.</p>
        </div>
      </div>
      <Card>
        <p className="eyebrow">TEST ÖDEME SAĞLAYICISI</p>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.035em]">Ödemeyi onayla</h1>
        <dl className="mt-5 grid gap-3 rounded-2xl border border-line-soft bg-[#fbf9fc] p-4 text-xs">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted">Ürün</dt>
            <dd className="text-right font-extrabold">{tx.item.label}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">Tür</dt>
            <dd className="font-bold">{TX_KIND_LABELS[tx.kind]}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-line-soft pt-3">
            <dt className="text-sm font-extrabold">Tutar</dt>
            <dd className="text-2xl font-black tracking-[-0.04em]">{formatMoney(tx.amount.amountMinor, tx.amount.currency)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-[11px] leading-relaxed text-muted">“Onayla”, başarılı bir ödeme webhook’unu; “Reddet”, başarısız bir ödemeyi simüle eder. Sonuç, gerçek sağlayıcıdaki gibi imzalı webhook ile kesinleşir.</p>
        <div className="mt-5">
          <MockPaymentButtons sessionId={sessionId} />
        </div>
        <Link href="/app/wallet" className="mt-4 block text-center text-xs font-bold text-muted hover:text-brand-600">
          Vazgeç ve cüzdana dön
        </Link>
      </Card>
    </div>
  );
}
