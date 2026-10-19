import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalDocument, legalMetadata } from "@/features/support/legal";
import { formatPercent } from "@/lib/utils";
import { getPlatformSettings } from "@/services/platform/settings";

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata("creator-agreement", "Creator Sözleşmesi — AI İkizi Yetkilendirme İlkeleri", "AI ikizi oluşturma izinleri, kişilik ve içerik sınırları, gelir modeli ve iptal hakları için şeffaf bir sözleşme yapısı.", "/creator-agreement");
}

const SCOPE = [
  { k: "Kullanım amacı ve kapsamı", v: "Açıkça tanımlanır" },
  { k: "Ses ve görsel benzerlik", v: "Ayrı ve açık izin" },
  { k: "İçerik ve fiyat yönetimi", v: "Creator kontrolünde" },
  { k: "İzni geri çekme", v: "Her an, açık süreçle" },
];

export default async function CreatorAgreementPage() {
  const settings = await getPlatformSettings();
  return (
    <LegalDocument
      slug="creator-agreement"
      eyebrow="Creator Agreement / Yetkilendirme"
      title="İçerik üreticisinin"
      highlight="kontrolü kendisinde."
      description="AI ikizi oluşturma izinleri, kişilik ve içerik sınırları, kazanç modeli ve iptal hakları için şeffaf bir sözleşme yapısı."
      icon={<Handshake />}
      extra={
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line p-5">
            <h3 className="text-sm font-extrabold">Yetki kapsamı özeti</h3>
            <ul className="mt-3 grid gap-2">
              {SCOPE.map((s) => (
                <li key={s.k} className="flex items-center justify-between gap-3 rounded-xl bg-soft px-3.5 py-2.5 text-xs">
                  <span className="flex items-center gap-2 font-bold text-ink-soft">
                    <Check className="size-3.5 text-brand-500" strokeWidth={3} aria-hidden /> {s.k}
                  </span>
                  <span className="font-extrabold text-ink">{s.v}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-brand-50/60 p-5">
            <h3 className="text-sm font-extrabold">Gelir ve hak yönetimi (taslak ayar)</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Platformda şu anda tanımlı gelir paylaşımı: net gelirin <b>{formatPercent(settings.revenue.creatorShareBps)}</b> creator&apos;a, kalanı platforma. Bu oran, “net gelir” tanımı (ödeme kuruluşu ücreti, vergiler, iade ve ters ibraz) hukuken netleştirilene kadar{" "}
              <b>nihai sözleşme hükmü değildir</b>.
            </p>
          </div>
        </div>
      }
      actions={
        <>
          <p className="text-xs font-bold text-ink-soft">Sözleşmeyi gözden geçirdin mi? Creator Studio&apos;dan devam edebilirsin.</p>
          <Button asChild shape="pill" size="md">
            <Link href="/studio">
              Creator Studio&apos;ya Git <ArrowRight />
            </Link>
          </Button>
        </>
      }
    />
  );
}
