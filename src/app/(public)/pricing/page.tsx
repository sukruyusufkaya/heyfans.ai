import type { Metadata } from "next";
import Link from "next/link";
import { Check, CircleHelp, Coins, CreditCard, Crown, Headset, Heart, Lock, MessageCircle, Minus, Settings2, ShieldCheck, Sparkles } from "lucide-react";
import { PostCover } from "@/components/public/post-cover";
import { CtaBand, HeroStats, PublicHero, Section, stat } from "@/components/public/marketing";
import { Badge } from "@/components/ui/badge";
import { Card, SectionTitle } from "@/components/ui/card";
import { DataTable, EmptyState, Td, Th } from "@/components/ui/display";
import { PricingPlans, type PlanCardData } from "@/features/public/pricing-plans";
import { cn, formatMoney, formatNumber } from "@/lib/utils";
import { TIER_LABELS } from "@/services/content/access";
import { platformCounters } from "@/services/creators/public";
import { getPlatformSettings } from "@/services/platform/settings";
import { listPlatformPlans, listPurchasableContent, yearlySavingPct, type PlatformPlanView } from "@/services/public/pricing";

export const metadata: Metadata = {
  title: "Fiyatlandırma — Üyelik Planları ve Kredi Paketleri",
  description: "Ücretsiz başla; Temel, Premium veya VIP planıyla özel içeriklere eriş, AI ikizleriyle sohbet et. Sohbet kredisi paketleri ve tekil içerik satın alma seçenekleri.",
  alternates: { canonical: "/pricing" },
  openGraph: { title: "Fiyatlandırma | HEYFANS", description: "Üyelik planları, sohbet kredisi paketleri ve özel içerik açma.", url: "/pricing", type: "website" },
};

const FAQ_STATIC = [
  { q: "Üyeliğimi istediğim zaman iptal edebilir miyim?", a: "Evet. Abonelikler, Aboneliklerim sayfasından dönem sonunda sona erecek şekilde iptal edilir. Erişimin mevcut dönem sonuna kadar devam eder; sonraki dönem ücretlendirilmez." },
  { q: "Ödemeler güvenli mi?", a: "Ödemeler lisanslı ödeme kuruluşu üzerinden alınır; kart bilgilerin HEYFANS sunucularında saklanmaz. Her ödeme sunucuda, veritabanındaki fiyat tanımlarından hesaplanır." },
  { q: "Sohbet kredileri nasıl kullanılır?", a: "Krediler AI ikizi mesajları, sesli/görüntülü görüşme dakikaları, hediyeler ve bahşişler için kullanılır. Her harcama Cüzdanım sayfasındaki hareket geçmişinde görünür. AI yanıtı üretilemezse harcanan kredi otomatik iade edilir." },
  { q: "Hangi ödeme yöntemleri kabul ediliyor?", a: "Kabul edilen yöntemler ödeme sayfasında, yapılandırılmış ödeme kuruluşuna göre listelenir. Ödeme yapmadan önce toplam tutarı ve ayrıntıları görürsün." },
];

function entitlementRows(plans: PlatformPlanView[]) {
  const chat = (p: PlatformPlanView) => (p.entitlements.unlimitedChat ? "Sınırsız" : p.entitlements.dailyChatAllowance > 0 ? `Günde ${p.entitlements.dailyChatAllowance} mesaj` : "Kredi ile");
  return [
    { label: "Herkese açık içerikleri görme", cell: () => true as boolean | string },
    { label: "Üyelik içeriklerine erişim", cell: (p: PlatformPlanView) => (p.entitlements.contentAccess === "none" ? false : `${TIER_LABELS[p.entitlements.contentAccess] ?? p.entitlements.contentAccess} kademeye kadar`) },
    { label: "AI ikiziyle sohbet", cell: chat },
    { label: "Aylık sohbet kredisi", cell: (p: PlatformPlanView) => (p.entitlements.monthlyCredits > 0 ? `${formatNumber(p.entitlements.monthlyCredits)} kredi` : false) },
    { label: "Özel istek gönderme", cell: (p: PlatformPlanView) => p.entitlements.customRequests },
    { label: "Öncelikli destek", cell: (p: PlatformPlanView) => p.entitlements.prioritySupport },
  ].map((r) => ({ label: r.label, cells: plans.map((p) => r.cell(p)) }));
}

export default async function PricingPage() {
  const [plans, settings, content, counters] = await Promise.all([listPlatformPlans(), getPlatformSettings(), listPurchasableContent(4), platformCounters()]);
  const savingPct = yearlySavingPct(plans);
  const canYearly = plans.some((p) => p.tier !== "free" && p.priceYearlyMinor);
  const packs = settings.credits.packs;
  const perMessage = Math.max(1, settings.chat.defaultMessageCredits);
  const rows = entitlementRows(plans);
  const faq = [
    ...FAQ_STATIC,
    { q: "Yıllık plan gerçekten daha mı avantajlı?", a: savingPct ? `Yıllık ödemede aylık fiyata göre en fazla %${savingPct} tasarruf edersin. Yıllık seçenek her plan için sunulmayabilir; fiyatlar yukarıdaki geçişten görülür.` : "Şu anda yıllık ödeme seçeneği sunulan bir plan bulunmuyor." },
    { q: "Hatalı bir ödeme gördüm, ne yapmalıyım?", a: "Hatalı veya yetkisiz ödemeler için İletişim formundan 'Ödemeler ve krediler' konusuyla işlem numaranı ilet; talepler finans ekibi tarafından incelenir." },
  ];
  const cards: PlanCardData[] = plans.map((p) => ({
    id: p.id,
    tier: p.tier,
    name: p.name,
    description: p.description,
    benefits: p.benefits,
    priceMonthlyMinor: p.priceMonthlyMinor,
    priceYearlyMinor: p.priceYearlyMinor,
    currency: p.currency,
    isPopular: p.isPopular,
    missing: [p.entitlements.contentAccess === "none" ? "Üyelik içeriklerine erişim" : null, !p.entitlements.prioritySupport ? "Öncelikli destek" : null, !p.entitlements.customRequests && p.tier === "free" ? "Özel istek gönderme" : null].filter((x): x is string => Boolean(x)).slice(0, 2),
  }));

  return (
    <>
      <PublicHero
        compact
        badge="Daha yakın. Daha özel. Daha gerçek."
        title={
          <>
            Favori İçerik Üreticilerine
            <br />
            <span className="text-brand-500">Daha da Yakın Ol.</span>
          </>
        }
        description="Üyelik planlarımızla sevdiğin içerik üreticilerinin özel içeriklerine eriş, onlarla sohbet et ve daha samimi bir deneyim yaşa."
        stats={
          <div>
            <ul className="flex flex-wrap gap-x-8 gap-y-4">
              {[
                { icon: Heart, title: "Özel içeriklere erişim", text: "Sadece üyelere özel" },
                { icon: MessageCircle, title: "Doğrudan sohbet", text: "Gerçek bağlantılar kur" },
                { icon: Crown, title: "Destekle ve yakınlaş", text: "Favori içerik üreticini destekle" },
              ].map((f) => (
                <li key={f.title} className="flex items-center gap-3">
                  <f.icon className="size-7 text-brand-500" aria-hidden />
                  <div>
                    <p className="text-xs font-extrabold">{f.title}</p>
                    <p className="text-[11px] text-muted-strong">{f.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <HeroStats
              items={[
                { icon: <Crown />, value: stat(counters.creators), label: "İçerik Üreticisi" },
                { icon: <Sparkles />, value: stat(counters.liveTwins, ""), label: "Yayındaki AI İkizi" },
              ]}
            />
          </div>
        }
      />

      <Section className="pt-10">
        {plans.length ? (
          <PricingPlans plans={cards} savingPct={savingPct} canYearly={canYearly} />
        ) : (
          <Card padded={false}>
            <EmptyState icon={<Crown />} title="Üyelik planları henüz yayınlanmadı" description="Planlar yönetici panelinden tanımlandığında burada listelenecek." />
          </Card>
        )}
      </Section>

      <Section className="grid items-start gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
          {plans.length > 0 && (
            <section aria-labelledby="compare-title">
              <SectionTitle title={<span id="compare-title">Plan Karşılaştırması</span>} icon={<Settings2 />} />
              <div className="hf-card p-3">
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Özellikler</Th>
                      {plans.map((p) => (
                        <Th key={p.id} className={cn("text-center", p.isPopular && "text-brand-600")}>
                          {p.name}
                          {p.isPopular && <span className="mt-0.5 block text-[8px] normal-case tracking-normal text-brand-500">En Popüler</span>}
                        </Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.label}>
                        <Td className="font-bold text-ink">{r.label}</Td>
                        {r.cells.map((c, i) => (
                          <Td key={plans[i]!.id} className={cn("text-center", plans[i]!.isPopular && "bg-brand-50/60")}>
                            {c === true ? (
                              <Check className="mx-auto size-4 text-brand-500" strokeWidth={3} aria-label="Var" />
                            ) : c === false ? (
                              <Minus className="mx-auto size-4 text-muted/60" aria-label="Yok" />
                            ) : (
                              <span className="text-[11px] font-bold">{c}</span>
                            )}
                          </Td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            </section>
          )}

          <section aria-labelledby="faq-title">
            <SectionTitle title={<span id="faq-title">Sıkça Sorulan Sorular</span>} icon={<CircleHelp />} action={<Link href="/help" className="text-xs font-extrabold text-brand-500 hover:text-brand-600">Tüm Soruları Gör →</Link>} />
            <div className="grid gap-2.5 md:grid-cols-2">
              {faq.map((f) => (
                <details key={f.q} className="hf-card group self-start px-4 py-3.5 open:shadow-[var(--shadow-card-hover)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-extrabold marker:hidden">
                    {f.q}
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600 transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-xs leading-relaxed text-muted-strong">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
          <section aria-labelledby="packs-title">
            <SectionTitle title={<span id="packs-title">Sohbet Kredisi Paketleri</span>} icon={<Coins />} subtitle="İçerik üreticileriyle daha fazla sohbet etmek için kredi satın al." />
            {packs.length ? (
              <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {packs.map((pk) => {
                  const total = pk.credits + (pk.bonusCredits ?? 0);
                  return (
                    <li key={pk.key} className={cn("relative flex flex-col items-center rounded-2xl border bg-white p-3.5 text-center", pk.isPopular ? "border-2 border-brand-500 shadow-[var(--shadow-pink)]" : "border-line")}>
                      {pk.isPopular && (
                        <Badge tone="solid" size="sm" className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          En Popüler
                        </Badge>
                      )}
                      <p className="text-xs font-extrabold">{formatNumber(pk.credits)} Kredi</p>
                      {pk.bonusCredits ? <p className="text-[10px] font-bold text-success">+{formatNumber(pk.bonusCredits)} bonus</p> : <p className="text-[10px]">&nbsp;</p>}
                      <p className="mt-1 font-display text-xl font-extrabold text-brand-600">{formatMoney(pk.priceMinor, "TRY", { decimals: false })}</p>
                      <p className="text-[10px] text-muted">≈ {formatNumber(Math.floor(total / perMessage))} mesaj</p>
                      <Link href={`/checkout?type=credit_pack&pack=${encodeURIComponent(pk.key)}`} className={cn("mt-3 grid h-9 w-full place-items-center rounded-full text-[11px] font-extrabold", pk.isPopular ? "bg-brand-500 text-white shadow-[var(--shadow-pink)] hover:bg-brand-600" : "bg-brand-100 text-brand-600 hover:bg-brand-150")}>
                        Satın Al
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Card padded={false}>
                <EmptyState compact icon={<Coins />} title="Kredi paketi bulunmuyor" />
              </Card>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Mesaj sayısı, varsayılan mesaj başına {perMessage} kredi üzerinden hesaplanan tahminidir; her AI ikizinin mesaj ücreti farklı olabilir. Fiyatlar KDV dahildir.
            </p>
          </section>

          <section aria-labelledby="unlock-title">
            <SectionTitle title={<span id="unlock-title">Özel İçerik Açma</span>} icon={<Lock />} subtitle="Beğendiğin içerikleri tek seferlik ödeme ile aç." />
            {content.length ? (
              <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {content.map((c) => (
                  <li key={c.id} className="hf-card overflow-hidden">
                    <Link href={`/content/${c.id}`} className="relative block aspect-[4/3]" aria-label={`${c.title} — ${formatMoney(c.priceMinor, c.currency, { decimals: false })} ile aç`}>
                      <PostCover title={c.title} type={c.type} locked />
                      <span className="absolute inset-0 grid place-items-center text-white">
                        <Lock className="size-6" aria-hidden />
                      </span>
                    </Link>
                    <div className="p-3">
                      <p className="truncate text-[11px] font-extrabold" title={c.title}>
                        {c.title}
                      </p>
                      <Link href={`/creators/${c.creatorUsername}`} className="block truncate text-[10px] text-muted hover:text-brand-600">
                        {c.creatorName}
                      </Link>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-extrabold text-brand-600">{formatMoney(c.priceMinor, c.currency, { decimals: false })}</span>
                        <Link href={`/content/${c.id}`} className="rounded-full bg-brand-500 px-3.5 py-1.5 text-[10px] font-extrabold text-white hover:bg-brand-600">
                          Aç
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Card padded={false}>
                <EmptyState compact icon={<Lock />} title="Şu anda satın alınabilir içerik yok" description="İçerik üreticileri tek seferlik satın alınabilir içerik yayınladığında burada görünür." />
              </Card>
            )}
          </section>
        </div>
      </Section>

      <Section className="py-4">
        <ul className="hf-card grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: CreditCard, title: "Güvenli Ödeme", text: "Kart bilgilerin lisanslı ödeme kuruluşunda işlenir." },
            { icon: ShieldCheck, title: "Gizliliğin Bizim İçin Önemli", text: "Gizlilik tercihlerini sen yönetirsin." },
            { icon: Sparkles, title: "Şeffaf AI", text: "AI ikizi yanıtları her zaman açıkça etiketlenir." },
            { icon: Headset, title: "Destek", text: "Yardım Merkezi ve iletişim formu ile yanındayız." },
          ].map((t) => (
            <li key={t.title} className="flex items-center gap-3.5">
              <t.icon className="size-8 shrink-0 text-brand-500" aria-hidden />
              <div>
                <p className="text-[13px] font-extrabold">{t.title}</p>
                <p className="text-[11px] leading-snug text-muted-strong">{t.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand className="pb-12" title="Şimdi HEYFANS topluluğuna katıl." text="Favori içerik üreticilerine daha yakın ol, özel içeriklere eriş ve gerçek bağlantılar kur." href="/register" label="Hemen Başla" />
    </>
  );
}
