import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Eye, Lock, RefreshCw, Scale, ShieldCheck, Sparkles, TriangleAlert, ClipboardCheck } from "lucide-react";
import { DraftBadge, DraftNotice, legalMetadata } from "@/features/support/legal";
import { SafetyReportForm } from "@/features/support/safety-report-form";
import { PageBody, SupportHero } from "@/features/support/support-ui";
import { getSession } from "@/lib/auth/session";
import { getCmsPage } from "@/services/cms/cms";
import { SAFETY_REASON_LABELS } from "@/services/support/reports";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return legalMetadata("trust-and-safety", t("Güven ve Güvenlik — Gerçek Creator'lar, Gerçek Rıza"), t("Doğrulanmış kimlikler, açık AI bildirimi, creator onayı, moderasyon ve itiraz süreçleriyle HEYFANS'ın güvenlik yaklaşımı. Sorun bildir."), "/trust-and-safety");
}

const ICONS = [BadgeCheck, Sparkles, ShieldCheck, Lock, TriangleAlert, Scale];

const FALLBACK = [
  { heading: m("Doğrulanmış Creator"), body: m("Kimlik ve hesap sahipliği doğrulanmadan creator profili yayına alınmaz.") },
  { heading: m("Açık AI Bildirimi"), body: m("AI ikizi yanıtları her zaman “AI İkizi” etiketiyle gösterilir.") },
  { heading: m("Creator Onayı ve İzin Yönetimi"), body: m("AI ikizi ve benzerlik özellikleri yalnız creator'ın açık izniyle çalışır ve geri çekilebilir.") },
  { heading: m("İçerik Moderasyonu"), body: m("Otomatik filtreler ve insan incelemesi birlikte çalışır.") },
  { heading: m("Şikâyet ve İtiraz"), body: m("Her karar için itiraz hakkı vardır.") },
];

const REASON_ORDER = ["impersonation", "harassment", "sexual_content", "minor_safety", "hate", "self_harm", "spam", "privacy", "ai_misbehavior", "copyright", "other"] as const;

export default async function TrustAndSafetyPage() {
  const [page, session, t] = await Promise.all([getCmsPage("trust-and-safety"), getSession(), getT()]);
  const cards = page?.sections.length ? page.sections : FALLBACK.map((s, i) => ({ id: `s${i + 1}`, ...s }));
  const reasons = REASON_ORDER.map((value) => ({ value, label: t(SAFETY_REASON_LABELS[value]) }));

  return (
    <>
      <SupportHero
        eyebrow={t("Güven & Güvenlik / HEYFANS")}
        title={t("Gerçek creator'lar.")}
        highlight={t("Gerçek rıza. Güvenli deneyimler.")}
        description={t("HEYFANS'ta doğrulanmış kimlikler, AI etkileşim şeffaflığı, creator izinleri ve kullanıcıların kontrolü üzerine kurulu bir güvenlik yaklaşımı benimsiyoruz.")}
        icon={<ShieldCheck />}
      >
        <DraftBadge page={page} />
      </SupportHero>

      <PageBody className="grid gap-8">
        <section aria-labelledby="approach-title">
          <div className="mb-4">
            <h2 id="approach-title" className="text-xl font-extrabold tracking-[-0.03em]">
              {t("Güven yaklaşımımız")}
            </h2>
            <p className="mt-1 text-xs text-muted">{t("Platformun güvenlik temelini oluşturan kontroller")}</p>
          </div>
          <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {cards.map((c, i) => {
              const Icon = ICONS[i % ICONS.length]!;
              return (
                <li key={c.id} className="hf-card p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-100 text-brand-500">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-sm font-extrabold">{t(c.heading)}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-strong">{t(c.body)}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <section className="hf-card p-6" aria-labelledby="transparency-title">
            <h2 id="transparency-title" className="text-xl font-extrabold tracking-[-0.03em]">
              {t("AI ikizi için şeffaflık")}
            </h2>
            <ul className="mt-4 divide-y divide-line-soft">
              {[
                { icon: Eye, title: t("AI olduğunun açıkça belirtilmesi"), text: t("Mesajlaşmada dijital ikiz kimliği her zaman görünür olmalı.") },
                { icon: ClipboardCheck, title: t("Kapsamlı izin yönetimi"), text: t("Ses, görüntü ve konuşma sınırları içerik üreticisi tarafından yönetilir.") },
                { icon: RefreshCw, title: t("İzni geri çekebilme"), text: t("İçerik üreticisi izinlerini istediği an geri çekebilir; ilgili özellikler derhal durdurulur.") },
              ].map((r) => (
                <li key={r.title} className="flex items-start gap-3.5 py-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-500">
                    <r.icon className="size-[18px]" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-[13px] font-extrabold">{r.title}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{r.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="hf-card p-6" aria-labelledby="problem-title">
            <h2 id="problem-title" className="text-xl font-extrabold tracking-[-0.03em]">
              {t("Bir sorunla karşılaşırsan")}
            </h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { title: t("Bildirim"), desc: t("İhlali veya içeriği bildir.") },
                { title: t("İnceleme"), desc: t("Talep ilgili kontrol akışında değerlendirilir.") },
                { title: t("Sonuç"), desc: t("Karar ve itiraz yolları sunulur.") },
              ].map((s, i) => (
                <li key={s.title} className="rounded-xl border border-line p-4">
                  <span className="grid size-6 place-items-center rounded-full bg-brand-500 text-[11px] font-black text-white">{i + 1}</span>
                  <h3 className="mt-3 text-[13px] font-extrabold">{s.title}</h3>
                  <p className="mt-1 text-[11px] leading-snug text-muted">{s.desc}</p>
                </li>
              ))}
            </ol>
            <div className="mt-4">
              <DraftNotice page={page} />
            </div>
            <Link href="/community-guidelines" className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-600 hover:underline">
              {t("Topluluk Kuralları")} <ArrowRight className="rtl:-scale-x-100 size-3.5" aria-hidden />
            </Link>
          </section>
        </div>

        <section id="bildir" className="hf-card scroll-mt-28 p-6 sm:p-8" aria-labelledby="report-title">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-500">
                <TriangleAlert className="size-6" aria-hidden />
              </span>
              <h2 id="report-title" className="mt-4 font-display text-2xl font-extrabold tracking-tight">
                {t("Güvenlik bildirimi oluştur")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-strong">
                {t("Kimliğe bürünme, taciz, izinsiz içerik veya başka bir ihlal gördüysen buradan bildir. Giriş yaptıysan bildirimin doğrudan moderasyon kuyruğuna girer; misafir bildirimleri güvenlik ekibinin destek kuyruğuna düşer.")}
              </p>
              <ul className="mt-4 grid gap-2 text-xs text-ink-soft">
                {[t("Bildirdiğin kişiye kimliğin gösterilmez."), t("Her karar için itiraz hakkı vardır."), t("Acil tehlikede önce 112'yi ara.")].map((line) => (
                  <li key={line} className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-brand-500" aria-hidden /> {line}
                  </li>
                ))}
              </ul>
            </div>
            <SafetyReportForm reasons={reasons} authed={Boolean(session)} />
          </div>
        </section>
      </PageBody>
    </>
  );
}
