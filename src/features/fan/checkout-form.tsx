"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/form-controls";
import { startCheckoutAction } from "@/features/fan/actions";
import type { CheckoutParams } from "@/features/fan/checkout-schema";

/**
 * Ödeme onayı: kart bilgisi ASLA bu uygulamada toplanmaz — kullanıcı ödeme sağlayıcısının güvenli sayfasına yönlendirilir.
 * Tutar istemciden gönderilmez; sunucu fiyatı veritabanından yeniden hesaplar.
 */
export function CheckoutForm({ params, disabledReason, isTest }: { params: CheckoutParams; disabledReason: string | null; isTest: boolean }) {
  const router = useRouter();
  const [terms, setTerms] = React.useState(false);
  const [preInfo, setPreInfo] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Çift tıklamada aynı işlem açılsın diye istemci anahtarı bir kez üretilir.
  const [clientKey] = React.useState(() => crypto.randomUUID());
  const termsId = React.useId();
  const preId = React.useId();

  async function submit() {
    if (busy || disabledReason) return;
    setBusy(true);
    setError(null);
    const res = await startCheckoutAction({ ...params, clientKey, acceptTerms: terms, acceptPreInfo: preInfo });
    if (!res.ok) {
      setBusy(false);
      setError(res.fieldErrors ? Object.values(res.fieldErrors).flat()[0] ?? res.error : res.error);
      toast.error(res.error);
      return;
    }
    // Yönlendirme sırasında düğme kilitli kalır (çift işlem olmasın).
    if (res.data.redirectUrl.startsWith("/")) router.push(res.data.redirectUrl);
    else window.location.assign(res.data.redirectUrl);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-xl border border-line-soft bg-[#fbf9fc] p-4">
        <label htmlFor={termsId} className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-ink-soft">
          <Checkbox id={termsId} checked={terms} onCheckedChange={(v) => setTerms(v === true)} className="mt-0.5" aria-required />
          <span>
            <Link href="/terms" target="_blank" className="font-extrabold text-brand-600 hover:underline">
              Kullanım Şartları
            </Link>{" "}
            ve{" "}
            <Link href="/privacy" target="_blank" className="font-extrabold text-brand-600 hover:underline">
              Gizlilik Politikası
            </Link>
            &apos;nı okudum, kabul ediyorum.
          </span>
        </label>
        <label htmlFor={preId} className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-ink-soft">
          <Checkbox id={preId} checked={preInfo} onCheckedChange={(v) => setPreInfo(v === true)} className="mt-0.5" aria-required />
          <span>
            <Link href="/terms#mesafeli-satis" target="_blank" className="font-extrabold text-brand-600 hover:underline">
              Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi
            </Link>
            &apos;ni (taslak) okudum ve onaylıyorum.
          </span>
        </label>
        <p className="text-[10px] text-muted">Hukuki metinler taslak aşamasındadır ve yayın öncesi hukuki incelemeden geçecektir.</p>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
      <Button size="lg" shape="pill" className="w-full" onClick={submit} loading={busy} disabled={!terms || !preInfo || Boolean(disabledReason)}>
        <Lock /> {isTest ? "Test ödemesine geç" : "Ödemeyi Tamamla"}
      </Button>
      {disabledReason && <p className="text-center text-[11px] font-semibold text-danger">{disabledReason}</p>}
      <p className="text-center text-[10px] text-muted">Ödeme tamamlanmadan ücret alınmaz. Kart bilgilerini yalnızca ödeme sağlayıcısının güvenli sayfasına girersin.</p>
    </div>
  );
}
