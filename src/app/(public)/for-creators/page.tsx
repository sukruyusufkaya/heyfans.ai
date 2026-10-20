import type { Metadata } from "next";
import { m } from "@/i18n/m";
import Link from "next/link";
import { ArrowRight, Bot, Check, Coins, Crown, FileImage, Info, Play, ShieldCheck, Sparkles, Star, UserCheck, Users, UsersRound, Wallet } from "lucide-react";
import { CreatorTile } from "@/components/creator/creator-cards";
import { CtaBand, HeroStats, PrimaryCta, PublicHero, Section, SecondaryCta, getStat } from "@/components/public/marketing";
import { AiTwinLabel } from "@/components/ui/badge";
import { Card, SectionTitle } from "@/components/ui/card";
import { getFormatters, getT, localeAlternates } from "@/i18n/server";
import { splitDirectPayment } from "@/services/billing/revenue";
import { listCreators, platformCounters } from "@/services/creators/public";
import { getPlatformSettings } from "@/services/platform/settings";
import { listPlatformPlans } from "@/services/public/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("İçerik Üreticileri İçin — Yaratıcılığını Gelire Dönüştür"),
    description: t("HEYFANS'ta içeriklerini paylaş, açık izninle AI ikizini oluştur, abonelik ve içerik satışıyla gelir elde et. Fiyatlar ve sınırlar tamamen senin kontrolünde."),
    alternates: await localeAlternates("/for-creators"),
    openGraph: { title: t("İçerik Üreticileri İçin | HEYFANS"), description: t("Yaratıcılığını gerçek bir gelire dönüştür."), url: "/for-creators", type: "website" },
  };
}

const APPLY_HREF = "/register?intent=creator";

const BENEFITS = [
  { icon: Bot, title: m("AI İkizi Oluştur"), text: m("Açık izninle kendi AI ikizini kur; hayranlarınla 7/24 sohbet etsin, sen zamanını daha verimli kullan. Kişiliği, sınırları ve bilgi kaynakları senin onayınla çalışır.") },
  { icon: Coins, title: m("Daha Fazla Gelir"), text: m("Abonelikler, tekil içerik satışı, bahşişler ve AI ikizi etkileşimleriyle birden fazla gelir kaynağına sahip ol.") },
  { icon: Crown, title: m("Tam Kontrol"), text: m("İçeriklerini, fiyatlarını ve AI ikizinin sınırlarını sen belirlersin. İzinlerini istediğin an geri çekebilirsin.") },
  { icon: FileImage, title: m("Premium İçerik Yönetimi"), text: m("Fotoğraf, video, ses ve yazı gibi farklı içerik türlerini erişim seviyesine göre (herkese açık, takipçiye, abonelere, satın alanlara) yönet.") },
  { icon: UsersRound, title: m("Hedef Kitleni Büyüt"), text: m("Keşfet, Trendler ve kategori sayfalarında öne çık; takipçilerini ve abonelerini tek panelden izle.") },
  { icon: ShieldCheck, title: m("Güvenli ve Destekli"), text: m("Doğrulama, moderasyon, itiraz süreçleri ve şeffaf kurallarla hem sen hem hayranların korunur.") },
];

const STEPS = [
  { icon: UserCheck, title: m("Başvur ve doğrulan"), text: m("Hesabını aç, kimlik ve sosyal hesap doğrulama adımlarını tamamla.") },
  { icon: FileImage, title: m("Profilini ve planlarını kur"), text: m("Profilini hazırla, abonelik planlarını ve içerik erişim seviyelerini belirle.") },
  { icon: Bot, title: m("İstersen AI ikizini kur"), text: m("AI ikizi isteğe bağlıdır: açık rıza ver, kişiliği ve sınırları belirle, incelemeden sonra yayına al.") },
  { icon: Wallet, title: m("Yayına çık ve kazan"), text: m("Profilin incelemeden sonra yayına alınır; kazançlarını Gelirler sayfasından izle.") },
];

export default async function ForCreatorsPage() {
  const [t, stat, { formatMoney, formatPercent }] = await Promise.all([getT(), getStat(), getFormatters()]);
  const [counters, featured, settings, plans] = await Promise.all([platformCounters(), listCreators("popular", 6), getPlatformSettings(), listPlatformPlans()]);
  const rules = settings.revenue;

  // Örnek senaryo: gerçek platform kurallarıyla (KDV, ödeme kuruluşu ücreti, pay oranı) hesaplanır.
  const examplePrice = plans.find((p) => p.tier === "premium")?.priceMonthlyMinor ?? plans.find((p) => p.priceMonthlyMinor > 0)?.priceMonthlyMinor ?? 39_900;
  const exampleSubs = 100;
  const one = splitDirectPayment(examplePrice, rules);
  const total = { gross: one.grossMinor * exampleSubs, tax: one.taxMinor * exampleSubs, fee: one.processingFeeMinor * exampleSubs, net: one.netMinor * exampleSubs, creator: one.creatorShareMinor * exampleSubs };

  return (
    <>
      <PublicHero
        badge={t("Yaratıcılığını gelire dönüştür")}
        title={
          <>
            {t("Yaratıcılığını Gerçek")}
            <br />
            <span className="text-brand-500">{t("Bir Gelire Dönüştür.")}</span>
          </>
        }
        description={t("HEYFANS ile kendi içeriklerini paylaş, açık izninle AI ikizini oluştur, hayran kitleni büyüt ve kontrol sende kalsın. Zamanından ve tutkundan gelir elde et.")}
        actions={
          <>
            <PrimaryCta href={APPLY_HREF}>{t("İçerik Üreticisi Olarak Başvur")}</PrimaryCta>
            <SecondaryCta href="/how-it-works" icon={<Play fill="currentColor" />}>
              {t("Nasıl Çalışır?")}
            </SecondaryCta>
          </>
        }
        stats={
          <HeroStats
            items={[
              { icon: <Users />, value: stat(counters.creators), label: t("İçerik Üreticisi") },
              { icon: <Sparkles />, value: stat(counters.liveTwins, ""), label: t("Yayındaki AI İkizi") },
              { icon: <Star />, value: stat(counters.messages), label: t("Gönderilen Mesaj") },
            ]}
          />
        }
        note={t("Kendi kurallarınla, kendi başarınla")}
        art={
          <div className="relative mx-auto max-w-md lg:ms-auto">
            <Card className="shadow-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-wider text-brand-500">{t("Örnek senaryo")}</p>
                <span className="rounded-full bg-soft px-2.5 py-1 text-[9px] font-bold text-muted-strong">{t("Gerçek kazanç değildir")}</span>
              </div>
              <p className="text-[13px] font-extrabold text-ink">
                {t("{subs} abone × {price} / ay", { subs: exampleSubs, price: formatMoney(examplePrice, "TRY", { decimals: false }) })}
              </p>
              <dl className="mt-3 grid gap-2 text-xs">
                <Row label={t("Brüt tahsilat")} value={formatMoney(total.gross)} />
                <Row label={t("KDV")} value={`− ${formatMoney(total.tax)}`} muted />
                <Row label={t("Ödeme kuruluşu ücreti")} value={`− ${formatMoney(total.fee)}`} muted />
                <Row label={t("Net gelir")} value={formatMoney(total.net)} />
                <div className="mt-1 flex items-center justify-between rounded-xl bg-brand-50 px-3.5 py-3">
                  <dt className="text-[13px] font-extrabold text-brand-700">{t("Creator payı ({percent})", { percent: formatPercent(rules.creatorShareBps) })}</dt>
                  <dd className="font-display text-xl font-extrabold text-brand-600">{formatMoney(total.creator)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[10px] leading-relaxed text-muted">{t("Hesaplama güncel platform ayarlarıyla yapılmıştır; kazanç garantisi değildir. Gerçek gelir içeriğine, kitlene ve etkileşime bağlıdır.")}</p>
            </Card>
          </div>
        }
      />

      <Section>
        <SectionTitle title={t("Neden HEYFANS'ta İçerik Üreticisi Olmalısın?")} icon={<Star className="fill-brand-500" />} />
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {BENEFITS.map((b) => (
            <li key={b.title} className="hf-card hf-gradient-pink flex gap-4 p-5">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-brand-500 shadow-sm">
                <b.icon className="size-7" aria-hidden />
              </span>
              <div>
                <h3 className="text-[15px] font-extrabold">{t(b.title)}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{t(b.text)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="grid items-start gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section aria-labelledby="rev-title" className="hf-card p-5 sm:p-6">
          <h2 id="rev-title" className="flex items-center gap-2.5 text-xl font-extrabold tracking-[-0.03em]">
            <Wallet className="size-6 text-brand-500" aria-hidden /> {t("Şeffaf Gelir Modeli")}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-strong">{t("Gelir paylaşımı kuralları aşağıdaki platform ayarlarıyla uygulanır. Nihai oranlar ve “net gelir” tanımı Creator Sözleşmesi'nde (taslak) açıklanır.")}</p>
          <dl className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <Fact label={t("Creator payı")} value={t("{percent} (net gelir üzerinden)", { percent: formatPercent(rules.creatorShareBps) })} />
            <Fact label={t("KDV")} value={t("Fiyatlara dahil ({percent})", { percent: formatPercent(rules.vatBps) })} />
            <Fact label={t("Ödeme kuruluşu ücreti")} value={`${formatPercent(rules.processingFeeBps)} + ${formatMoney(rules.processingFeeFixedMinor)}`} />
            <Fact label={t("Hak ediş bekleme süresi")} value={t("{count} gün", { count: rules.holdDays })} />
            <Fact label={t("Asgari ödeme talebi")} value={formatMoney(rules.minPayoutMinor, "TRY", { decimals: false })} />
            <Fact label={t("AI maliyeti")} value={rules.deductAiCostFromCreator ? t("Net gelirden düşülür") : t("Creator payından düşülmez")} />
          </dl>
          {!settings.features.payouts && (
            <p role="note" className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#f9d9aa] bg-[#fff7e9] px-4 py-3 text-xs text-[#7d4300]">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {t("Hak edişlerin Creator Studio'da kayıt altına alınır; ödeme talepleri açıldığında tek tıkla talep edebilirsin.")}
            </p>
          )}
        </section>

        <section aria-labelledby="twin-title" className="hf-card hf-gradient-pink p-5 sm:p-6">
          <h2 id="twin-title" className="flex items-center gap-2.5 text-xl font-extrabold tracking-[-0.03em]">
            <Sparkles className="size-6 text-brand-500" aria-hidden /> {t("AI İkizin Senin İçin Çalışsın")}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">{t("Sen dinlenirken bile AI ikizin hayranlarınla sohbet eder, soruları yanıtlar ve gelirini artırır. Sen yönetirsin: kişilik, sınırlar, bilgi kaynakları ve fiyat.")}</p>
          <div className="mt-4 grid gap-2.5">
            <div className="max-w-[88%] rounded-2xl rounded-es-sm bg-white p-3 text-xs text-ink-soft shadow-sm">
              <AiTwinLabel className="mb-1.5" />
              <p>{t("Merhaba! Bugün sana nasıl yardımcı olabilirim?")}</p>
            </div>
          </div>
          <ul className="mt-4 grid gap-1.5 text-xs text-ink-soft">
            {[t("Yalnızca açık rızanla oluşturulur ve her an durdurulabilir"), t("Yanıtlar her yerde “AI İkizi” etiketiyle gösterilir"), t("Konu sınırlarını ve davranış kurallarını sen belirlersin")].map((label) => (
              <li key={label} className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-brand-500" strokeWidth={3} aria-hidden /> {label}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-muted">{t("Örnek ifade — gerçek bir konuşma değildir.")}</p>
          <Link href={APPLY_HREF} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-brand-500 px-6 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
            {t("AI İkizini Hemen Oluştur")} <ArrowRight className="rtl:-scale-x-100 size-4" aria-hidden />
          </Link>
        </section>
      </Section>

      <Section>
        <SectionTitle title={t("İçerik Üreticisi Olmanın Adımları")} icon={<UserCheck />} subtitle={t("Başvurudan yayına kadar süreç.")} />
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="hf-card relative p-5">
              <span className="absolute end-4 top-4 font-display text-4xl font-black text-brand-100" aria-hidden>
                {i + 1}
              </span>
              <span className="grid size-12 place-items-center rounded-full bg-brand-100 text-brand-500">
                <s.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-3 text-[14px] font-extrabold">{t(s.title)}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-strong">{t(s.text)}</p>
            </li>
          ))}
        </ol>
      </Section>

      {featured.length > 0 && (
        <Section className="pt-2">
          <SectionTitle title={t("Topluluktaki İçerik Üreticileri")} icon={<Crown className="fill-brand-500" />} subtitle={t("Platformdaki mevcut profillere göz at.")} />
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
            {featured.map((c) => (
              <CreatorTile key={c.id} creator={c} />
            ))}
          </div>
        </Section>
      )}

      <CtaBand className="pb-12" title={t("Sen de HEYFANS içerik üretici topluluğuna katıl!")} text={t("Yaratıcılığını gelire dönüştür, hayranlarınla buluş, kendi hikâyeni yaz.")} href={APPLY_HREF} label={t("Hemen Başvur")} />
    </>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-soft pb-2">
      <dt className={muted ? "text-muted-strong" : "font-bold text-ink"}>{label}</dt>
      <dd className={muted ? "text-muted-strong" : "font-extrabold text-ink"}>{value}</dd>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-soft px-3.5 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 text-[13px] font-extrabold text-ink">{value}</dd>
    </div>
  );
}
