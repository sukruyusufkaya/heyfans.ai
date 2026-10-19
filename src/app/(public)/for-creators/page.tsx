import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Check, Coins, Crown, FileImage, Info, Play, ShieldCheck, Sparkles, Star, UserCheck, Users, UsersRound, Wallet } from "lucide-react";
import { CreatorTile } from "@/components/creator/creator-cards";
import { CtaBand, HeroStats, PrimaryCta, PublicHero, Section, SecondaryCta, stat } from "@/components/public/marketing";
import { AiTwinLabel } from "@/components/ui/badge";
import { Card, SectionTitle } from "@/components/ui/card";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";
import { splitDirectPayment } from "@/services/billing/revenue";
import { listCreators, platformCounters } from "@/services/creators/public";
import { getPlatformSettings } from "@/services/platform/settings";
import { listPlatformPlans } from "@/services/public/pricing";

export const metadata: Metadata = {
  title: "İçerik Üreticileri İçin — Yaratıcılığını Gelire Dönüştür",
  description: "HEYFANS'ta içeriklerini paylaş, açık izninle AI ikizini oluştur, abonelik ve içerik satışıyla gelir elde et. Fiyatlar ve sınırlar tamamen senin kontrolünde.",
  alternates: { canonical: "/for-creators" },
  openGraph: { title: "İçerik Üreticileri İçin | HEYFANS", description: "Yaratıcılığını gerçek bir gelire dönüştür.", url: "/for-creators", type: "website" },
};

const APPLY_HREF = "/register?intent=creator";

const BENEFITS = [
  { icon: Bot, title: "AI İkizi Oluştur", text: "Açık izninle kendi AI ikizini kur; hayranlarınla 7/24 sohbet etsin, sen zamanını daha verimli kullan. Kişiliği, sınırları ve bilgi kaynakları senin onayınla çalışır." },
  { icon: Coins, title: "Daha Fazla Gelir", text: "Abonelikler, tekil içerik satışı, bahşişler ve AI ikizi etkileşimleriyle birden fazla gelir kaynağına sahip ol." },
  { icon: Crown, title: "Tam Kontrol", text: "İçeriklerini, fiyatlarını ve AI ikizinin sınırlarını sen belirlersin. İzinlerini istediğin an geri çekebilirsin." },
  { icon: FileImage, title: "Premium İçerik Yönetimi", text: "Fotoğraf, video, ses ve yazı gibi farklı içerik türlerini erişim seviyesine göre (herkese açık, takipçiye, abonelere, satın alanlara) yönet." },
  { icon: UsersRound, title: "Hedef Kitleni Büyüt", text: "Keşfet, Trendler ve kategori sayfalarında öne çık; takipçilerini ve abonelerini tek panelden izle." },
  { icon: ShieldCheck, title: "Güvenli ve Destekli", text: "Doğrulama, moderasyon, itiraz süreçleri ve şeffaf kurallarla hem sen hem hayranların korunur." },
];

const STEPS = [
  { icon: UserCheck, title: "Başvur ve doğrulan", text: "Hesabını aç, kimlik ve sosyal hesap doğrulama adımlarını tamamla." },
  { icon: FileImage, title: "Profilini ve planlarını kur", text: "Profilini hazırla, abonelik planlarını ve içerik erişim seviyelerini belirle." },
  { icon: Bot, title: "İstersen AI ikizini kur", text: "AI ikizi isteğe bağlıdır: açık rıza ver, kişiliği ve sınırları belirle, incelemeden sonra yayına al." },
  { icon: Wallet, title: "Yayına çık ve kazan", text: "Profilin incelemeden sonra yayına alınır; kazançlarını Gelirler sayfasından izle." },
];

export default async function ForCreatorsPage() {
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
        badge="Yaratıcılığını gelire dönüştür"
        title={
          <>
            Yaratıcılığını Gerçek
            <br />
            <span className="text-brand-500">Bir Gelire Dönüştür.</span>
          </>
        }
        description="HEYFANS ile kendi içeriklerini paylaş, açık izninle AI ikizini oluştur, hayran kitleni büyüt ve kontrol sende kalsın. Zamanından ve tutkundan gelir elde et."
        actions={
          <>
            <PrimaryCta href={APPLY_HREF}>İçerik Üreticisi Olarak Başvur</PrimaryCta>
            <SecondaryCta href="/how-it-works" icon={<Play fill="currentColor" />}>
              Nasıl Çalışır?
            </SecondaryCta>
          </>
        }
        stats={
          <HeroStats
            items={[
              { icon: <Users />, value: stat(counters.creators), label: "İçerik Üreticisi" },
              { icon: <Sparkles />, value: stat(counters.liveTwins, ""), label: "Yayındaki AI İkizi" },
              { icon: <Star />, value: stat(counters.messages), label: "Gönderilen Mesaj" },
            ]}
          />
        }
        note="Kendi kurallarınla, kendi başarınla"
        art={
          <div className="relative mx-auto max-w-md lg:ml-auto">
            <Card className="shadow-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-wider text-brand-500">Örnek senaryo</p>
                <span className="rounded-full bg-soft px-2.5 py-1 text-[9px] font-bold text-muted-strong">Gerçek kazanç değildir</span>
              </div>
              <p className="text-[13px] font-extrabold text-ink">
                {exampleSubs} abone × {formatMoney(examplePrice, "TRY", { decimals: false })} / ay
              </p>
              <dl className="mt-3 grid gap-2 text-xs">
                <Row label="Brüt tahsilat" value={formatMoney(total.gross)} />
                <Row label="KDV" value={`− ${formatMoney(total.tax)}`} muted />
                <Row label="Ödeme kuruluşu ücreti" value={`− ${formatMoney(total.fee)}`} muted />
                <Row label="Net gelir" value={formatMoney(total.net)} />
                <div className="mt-1 flex items-center justify-between rounded-xl bg-brand-50 px-3.5 py-3">
                  <dt className="text-[13px] font-extrabold text-brand-700">Creator payı ({formatPercent(rules.creatorShareBps)})</dt>
                  <dd className="font-display text-xl font-extrabold text-brand-600">{formatMoney(total.creator)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[10px] leading-relaxed text-muted">Hesaplama güncel platform ayarlarıyla yapılmıştır; kazanç garantisi değildir. Gerçek gelir içeriğine, kitlene ve etkileşime bağlıdır.</p>
            </Card>
          </div>
        }
      />

      <Section>
        <SectionTitle title="Neden HEYFANS'ta İçerik Üreticisi Olmalısın?" icon={<Star className="fill-brand-500" />} />
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {BENEFITS.map((b) => (
            <li key={b.title} className="hf-card hf-gradient-pink flex gap-4 p-5">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-brand-500 shadow-sm">
                <b.icon className="size-7" aria-hidden />
              </span>
              <div>
                <h3 className="text-[15px] font-extrabold">{b.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{b.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="grid items-start gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section aria-labelledby="rev-title" className="hf-card p-5 sm:p-6">
          <h2 id="rev-title" className="flex items-center gap-2.5 text-xl font-extrabold tracking-[-0.03em]">
            <Wallet className="size-6 text-brand-500" aria-hidden /> Şeffaf Gelir Modeli
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-strong">Gelir paylaşımı kuralları aşağıdaki platform ayarlarıyla uygulanır. Nihai oranlar ve “net gelir” tanımı Creator Sözleşmesi&apos;nde (taslak) açıklanır.</p>
          <dl className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <Fact label="Creator payı" value={`${formatPercent(rules.creatorShareBps)} (net gelir üzerinden)`} />
            <Fact label="KDV" value={`Fiyatlara dahil (%${formatNumber(rules.vatBps / 100)})`} />
            <Fact label="Ödeme kuruluşu ücreti" value={`%${formatNumber(rules.processingFeeBps / 100)} + ${formatMoney(rules.processingFeeFixedMinor)}`} />
            <Fact label="Hak ediş bekleme süresi" value={`${formatNumber(rules.holdDays)} gün`} />
            <Fact label="Asgari ödeme talebi" value={formatMoney(rules.minPayoutMinor, "TRY", { decimals: false })} />
            <Fact label="AI maliyeti" value={rules.deductAiCostFromCreator ? "Net gelirden düşülür" : "Creator payından düşülmez"} />
          </dl>
          {!settings.features.payouts && (
            <p role="note" className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#f9d9aa] bg-[#fff7e9] px-4 py-3 text-xs text-[#7d4300]">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> Hak edişlerin Creator Studio&apos;da kayıt altına alınır; ödeme talepleri açıldığında tek tıkla talep edebilirsin.
            </p>
          )}
        </section>

        <section aria-labelledby="twin-title" className="hf-card hf-gradient-pink p-5 sm:p-6">
          <h2 id="twin-title" className="flex items-center gap-2.5 text-xl font-extrabold tracking-[-0.03em]">
            <Sparkles className="size-6 text-brand-500" aria-hidden /> AI İkizin Senin İçin Çalışsın
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">Sen dinlenirken bile AI ikizin hayranlarınla sohbet eder, soruları yanıtlar ve gelirini artırır. Sen yönetirsin: kişilik, sınırlar, bilgi kaynakları ve fiyat.</p>
          <div className="mt-4 grid gap-2.5">
            <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-white p-3 text-xs text-ink-soft shadow-sm">
              <AiTwinLabel className="mb-1.5" />
              <p>Merhaba! Bugün sana nasıl yardımcı olabilirim?</p>
            </div>
          </div>
          <ul className="mt-4 grid gap-1.5 text-xs text-ink-soft">
            {["Yalnızca açık rızanla oluşturulur ve her an durdurulabilir", "Yanıtlar her yerde “AI İkizi” etiketiyle gösterilir", "Konu sınırlarını ve davranış kurallarını sen belirlersin"].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-brand-500" strokeWidth={3} aria-hidden /> {t}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-muted">Örnek ifade — gerçek bir konuşma değildir.</p>
          <Link href={APPLY_HREF} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-brand-500 px-6 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
            AI İkizini Hemen Oluştur <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      </Section>

      <Section>
        <SectionTitle title="İçerik Üreticisi Olmanın Adımları" icon={<UserCheck />} subtitle="Başvurudan yayına kadar süreç." />
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="hf-card relative p-5">
              <span className="absolute right-4 top-4 font-display text-4xl font-black text-brand-100" aria-hidden>
                {i + 1}
              </span>
              <span className="grid size-12 place-items-center rounded-full bg-brand-100 text-brand-500">
                <s.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-3 text-[14px] font-extrabold">{s.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-strong">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {featured.length > 0 && (
        <Section className="pt-2">
          <SectionTitle title="Topluluktaki İçerik Üreticileri" icon={<Crown className="fill-brand-500" />} subtitle="Platformdaki mevcut profillere göz at." />
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
            {featured.map((c) => (
              <CreatorTile key={c.id} creator={c} />
            ))}
          </div>
        </Section>
      )}

      <CtaBand className="pb-12" title="Sen de HEYFANS içerik üretici topluluğuna katıl!" text="Yaratıcılığını gelire dönüştür, hayranlarınla buluş, kendi hikâyeni yaz." href={APPLY_HREF} label="Hemen Başvur" />
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
