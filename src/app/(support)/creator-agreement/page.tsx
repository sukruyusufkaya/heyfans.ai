import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalDocument, legalMetadata } from "@/features/support/legal";
import { getFormatters, getT } from "@/i18n/server";
import { m } from "@/i18n/m";
import { getPlatformSettings } from "@/services/platform/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return legalMetadata("creator-agreement", t("Creator Sözleşmesi — AI İkizi Yetkilendirme İlkeleri"), t("AI ikizi oluşturma izinleri, kişilik ve içerik sınırları, gelir modeli ve iptal hakları için şeffaf bir sözleşme yapısı."), "/creator-agreement");
}

const SCOPE = [
  { k: m("Kullanım amacı ve kapsamı"), v: m("Açıkça tanımlanır") },
  { k: m("Ses ve görsel benzerlik"), v: m("Ayrı ve açık izin") },
  { k: m("İçerik ve fiyat yönetimi"), v: m("Creator kontrolünde") },
  { k: m("İzni geri çekme"), v: m("Her an, açık süreçle") },
];

export default async function CreatorAgreementPage() {
  const [settings, t, { formatPercent }] = await Promise.all([getPlatformSettings(), getT(), getFormatters()]);
  return (
    <LegalDocument
      slug="creator-agreement"
      eyebrow={t("Creator Agreement / Yetkilendirme")}
      title={t("İçerik üreticisinin")}
      highlight={t("kontrolü kendisinde.")}
      description={t("AI ikizi oluşturma izinleri, kişilik ve içerik sınırları, kazanç modeli ve iptal hakları için şeffaf bir sözleşme yapısı.")}
      icon={<Handshake />}
      extra={
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line p-5">
            <h3 className="text-sm font-extrabold">{t("Yetki kapsamı özeti")}</h3>
            <ul className="mt-3 grid gap-2">
              {SCOPE.map((s) => (
                <li key={s.k} className="flex items-center justify-between gap-3 rounded-xl bg-soft px-3.5 py-2.5 text-xs">
                  <span className="flex items-center gap-2 font-bold text-ink-soft">
                    <Check className="size-3.5 text-brand-500" strokeWidth={3} aria-hidden /> {t(s.k)}
                  </span>
                  <span className="font-extrabold text-ink">{t(s.v)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-brand-50/60 p-5">
            <h3 className="text-sm font-extrabold">{t("Gelir ve hak yönetimi (taslak ayar)")}</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              {t.rich("Platformda şu anda tanımlı gelir paylaşımı: net gelirin <b>{share}</b> creator'a, kalanı platforma. Bu oran, “net gelir” tanımı (ödeme kuruluşu ücreti, vergiler, iade ve ters ibraz) hukuken netleştirilene kadar <b>nihai sözleşme hükmü değildir</b>.", { share: formatPercent(settings.revenue.creatorShareBps), b: (c) => <b>{c}</b> })}
            </p>
          </div>
        </div>
      }
      actions={
        <>
          <p className="text-xs font-bold text-ink-soft">{t("Sözleşmeyi gözden geçirdin mi? Creator Studio'dan devam edebilirsin.")}</p>
          <Button asChild shape="pill" size="md">
            <Link href="/studio">
              {t("Creator Studio'ya Git")} <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </>
      }
    />
  );
}
