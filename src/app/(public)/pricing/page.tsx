import type { Metadata } from "next";
import Link from "next/link";
import { Check, CircleHelp, Coins, CreditCard, Crown, Headset, Heart, Lock, MessageCircle, Minus, Settings2, ShieldCheck, Sparkles } from "lucide-react";
import { PostCover } from "@/components/public/post-cover";
import { CtaBand, HeroStats, PublicHero, Section, getStat } from "@/components/public/marketing";
import { Badge } from "@/components/ui/badge";
import { Card, SectionTitle } from "@/components/ui/card";
import { DataTable, EmptyState, Td, Th } from "@/components/ui/display";
import { PricingPlans, type PlanCardData } from "@/features/public/pricing-plans";
import { getFormatters, getT, localeAlternates } from "@/i18n/server";
import { m } from "@/i18n/m";
import { cn } from "@/lib/utils";
import type { Translator } from "@/i18n/translate";
import { TIER_LABELS } from "@/services/content/access";
import { platformCounters } from "@/services/creators/public";
import { getPlatformSettings } from "@/services/platform/settings";
import { listPlatformPlans, listPurchasableContent, yearlySavingPct, type PlatformPlanView } from "@/services/public/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Fiyatlandırma — Üyelik Planları ve Kredi Paketleri"),
    description: t("Ücretsiz başla; Temel, Premium veya VIP planıyla özel içeriklere eriş, AI ikizleriyle sohbet et. Sohbet kredisi paketleri ve tekil içerik satın alma seçenekleri."),
    alternates: await localeAlternates("/pricing"),
    openGraph: { title: t("Fiyatlandırma | HEYFANS"), description: t("Üyelik planları, sohbet kredisi paketleri ve özel içerik açma."), url: "/pricing", type: "website" },
  };
}

const FAQ_STATIC = [
  { q: m("Üyeliğimi istediğim zaman iptal edebilir miyim?"), a: m("Evet. Abonelikler, Aboneliklerim sayfasından dönem sonunda sona erecek şekilde iptal edilir. Erişimin mevcut dönem sonuna kadar devam eder; sonraki dönem ücretlendirilmez.") },
  { q: m("Ödemeler güvenli mi?"), a: m("Ödemeler lisanslı ödeme kuruluşu üzerinden alınır; kart bilgilerin HEYFANS sunucularında saklanmaz. Her ödeme sunucuda, veritabanındaki fiyat tanımlarından hesaplanır.") },
  { q: m("Sohbet kredileri nasıl kullanılır?"), a: m("Krediler AI ikizi mesajları, sesli/görüntülü görüşme dakikaları, hediyeler ve bahşişler için kullanılır. Her harcama Cüzdanım sayfasındaki hareket geçmişinde görünür. AI yanıtı üretilemezse harcanan kredi otomatik iade edilir.") },
  { q: m("Hangi ödeme yöntemleri kabul ediliyor?"), a: m("Kabul edilen yöntemler ödeme sayfasında, yapılandırılmış ödeme kuruluşuna göre listelenir. Ödeme yapmadan önce toplam tutarı ve ayrıntıları görürsün.") },
];

function entitlementRows(plans: PlatformPlanView[], t: Translator, formatNumber: (n: number) => string) {
  const chat = (p: PlatformPlanView) => (p.entitlements.unlimitedChat ? t("Sınırsız") : p.entitlements.dailyChatAllowance > 0 ? t("Günde {count} mesaj", { count: p.entitlements.dailyChatAllowance }) : t("Kredi ile"));
  return [
    { label: t("Herkese açık içerikleri görme"), cell: () => true as boolean | string },
    { label: t("Üyelik içeriklerine erişim"), cell: (p: PlatformPlanView) => (p.entitlements.contentAccess === "none" ? false : t("{tier} kademeye kadar", { tier: t(TIER_LABELS[p.entitlements.contentAccess] ?? p.entitlements.contentAccess) })) },
    { label: t("AI ikiziyle sohbet"), cell: chat },
    { label: t("Aylık sohbet kredisi"), cell: (p: PlatformPlanView) => (p.entitlements.monthlyCredits > 0 ? t("{credits} kredi", { credits: formatNumber(p.entitlements.monthlyCredits) }) : false) },
    { label: t("Özel istek gönderme"), cell: (p: PlatformPlanView) => p.entitlements.customRequests },
    { label: t("Öncelikli destek"), cell: (p: PlatformPlanView) => p.entitlements.prioritySupport },
  ].map((r) => ({ label: r.label, cells: plans.map((p) => r.cell(p)) }));
}

export default async function PricingPage() {
  const [t, stat, { formatMoney, formatNumber }] = await Promise.all([getT(), getStat(), getFormatters()]);
  const [plans, settings, content, counters] = await Promise.all([listPlatformPlans(), getPlatformSettings(), listPurchasableContent(4), platformCounters()]);
  const savingPct = yearlySavingPct(plans);
  const canYearly = plans.some((p) => p.tier !== "free" && p.priceYearlyMinor);
  const packs = settings.credits.packs;
  const perMessage = Math.max(1, settings.chat.defaultMessageCredits);
  const rows = entitlementRows(plans, t, formatNumber);
  const faq = [
    ...FAQ_STATIC.map((f) => ({ q: t(f.q), a: t(f.a) })),
    { q: t("Yıllık plan gerçekten daha mı avantajlı?"), a: savingPct ? t("Yıllık ödemede aylık fiyata göre en fazla %{pct} tasarruf edersin. Yıllık seçenek her plan için sunulmayabilir; fiyatlar yukarıdaki geçişten görülür.", { pct: savingPct }) : t("Şu anda yıllık ödeme seçeneği sunulan bir plan bulunmuyor.") },
    { q: t("Hatalı bir ödeme gördüm, ne yapmalıyım?"), a: t("Hatalı veya yetkisiz ödemeler için İletişim formundan 'Ödemeler ve krediler' konusuyla işlem numaranı ilet; talepler finans ekibi tarafından incelenir.") },
  ];
  const cards: PlanCardData[] = plans.map((p) => ({
    id: p.id,
    tier: p.tier,
    name: t(p.name),
    description: p.description ? t(p.description) : null,
    benefits: p.benefits.map((b) => t(b)),
    priceMonthlyMinor: p.priceMonthlyMinor,
    priceYearlyMinor: p.priceYearlyMinor,
    currency: p.currency,
    isPopular: p.isPopular,
    missing: [p.entitlements.contentAccess === "none" ? t("Üyelik içeriklerine erişim") : null, !p.entitlements.prioritySupport ? t("Öncelikli destek") : null, !p.entitlements.customRequests && p.tier === "free" ? t("Özel istek gönderme") : null].filter((x): x is string => Boolean(x)).slice(0, 2),
  }));

  return (
    <>
      <PublicHero
        compact
        badge={t("Daha yakın. Daha özel. Daha gerçek.")}
        title={
          <>
            {t("Favori İçerik Üreticilerine")}
            <br />
            <span className="text-brand-500">{t("Daha da Yakın Ol.")}</span>
          </>
        }
        description={t("Üyelik planlarımızla sevdiğin içerik üreticilerinin özel içeriklerine eriş, onlarla sohbet et ve daha samimi bir deneyim yaşa.")}
        stats={
          <div>
            <ul className="flex flex-wrap gap-x-8 gap-y-4">
              {[
                { icon: Heart, title: t("Özel içeriklere erişim"), text: t("Sadece üyelere özel") },
                { icon: MessageCircle, title: t("Doğrudan sohbet"), text: t("Gerçek bağlantılar kur") },
                { icon: Crown, title: t("Destekle ve yakınlaş"), text: t("Favori içerik üreticini destekle") },
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
                { icon: <Crown />, value: stat(counters.creators), label: t("İçerik Üreticisi") },
                { icon: <Sparkles />, value: stat(counters.liveTwins, ""), label: t("Yayındaki AI İkizi") },
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
            <EmptyState icon={<Crown />} title={t("Üyelik planları henüz yayınlanmadı")} description={t("Planlar yönetici panelinden tanımlandığında burada listelenecek.")} />
          </Card>
        )}
      </Section>

      <Section className="grid items-start gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
          {plans.length > 0 && (
            <section aria-labelledby="compare-title">
              <SectionTitle title={<span id="compare-title">{t("Plan Karşılaştırması")}</span>} icon={<Settings2 />} />
              <div className="hf-card p-3">
                <DataTable>
                  <thead>
                    <tr>
                      <Th>{t("Özellikler")}</Th>
                      {plans.map((p) => (
                        <Th key={p.id} className={cn("text-center", p.isPopular && "text-brand-600")}>
                          {t(p.name)}
                          {p.isPopular && <span className="mt-0.5 block text-[8px] normal-case tracking-normal text-brand-500">{t("En Popüler")}</span>}
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
                              <Check className="mx-auto size-4 text-brand-500" strokeWidth={3} aria-label={t("Var")} />
                            ) : c === false ? (
                              <Minus className="mx-auto size-4 text-muted/60" aria-label={t("Yok")} />
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
            <SectionTitle title={<span id="faq-title">{t("Sıkça Sorulan Sorular")}</span>} icon={<CircleHelp />} action={<Link href="/help" className="text-xs font-extrabold text-brand-500 hover:text-brand-600">{t("Tüm Soruları Gör →")}</Link>} />
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
            <SectionTitle title={<span id="packs-title">{t("Sohbet Kredisi Paketleri")}</span>} icon={<Coins />} subtitle={t("İçerik üreticileriyle daha fazla sohbet etmek için kredi satın al.")} />
            {packs.length ? (
              <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {packs.map((pk) => {
                  const total = pk.credits + (pk.bonusCredits ?? 0);
                  return (
                    <li key={pk.key} className={cn("relative flex flex-col items-center rounded-2xl border bg-white p-3.5 text-center", pk.isPopular ? "border-2 border-brand-500 shadow-[var(--shadow-pink)]" : "border-line")}>
                      {pk.isPopular && (
                        <Badge tone="solid" size="sm" className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          {t("En Popüler")}
                        </Badge>
                      )}
                      <p className="text-xs font-extrabold">{t("{credits} Kredi", { credits: formatNumber(pk.credits) })}</p>
                      {pk.bonusCredits ? <p className="text-[10px] font-bold text-success">{t("+{bonus} bonus", { bonus: formatNumber(pk.bonusCredits) })}</p> : <p className="text-[10px]">{"\u00a0"}</p>}
                      <p className="mt-1 font-display text-xl font-extrabold text-brand-600">{formatMoney(pk.priceMinor, "TRY", { decimals: false })}</p>
                      <p className="text-[10px] text-muted">{t("≈ {messages} mesaj", { messages: formatNumber(Math.floor(total / perMessage)) })}</p>
                      <Link href={`/checkout?type=credit_pack&pack=${encodeURIComponent(pk.key)}`} className={cn("mt-3 grid h-9 w-full place-items-center rounded-full text-[11px] font-extrabold", pk.isPopular ? "bg-brand-500 text-white shadow-[var(--shadow-pink)] hover:bg-brand-600" : "bg-brand-100 text-brand-600 hover:bg-brand-150")}>
                        {t("Satın Al")}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Card padded={false}>
                <EmptyState compact icon={<Coins />} title={t("Kredi paketi bulunmuyor")} />
              </Card>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              {t("Mesaj sayısı, varsayılan mesaj başına {credits} kredi üzerinden hesaplanan tahminidir; her AI ikizinin mesaj ücreti farklı olabilir. Fiyatlar KDV dahildir.", { credits: perMessage })}
            </p>
          </section>

          <section aria-labelledby="unlock-title">
            <SectionTitle title={<span id="unlock-title">{t("Özel İçerik Açma")}</span>} icon={<Lock />} subtitle={t("Beğendiğin içerikleri tek seferlik ödeme ile aç.")} />
            {content.length ? (
              <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {content.map((c) => (
                  <li key={c.id} className="hf-card overflow-hidden">
                    <Link href={`/content/${c.id}`} className="relative block aspect-[4/3]" aria-label={t("{title} — {price} ile aç", { title: c.title, price: formatMoney(c.priceMinor, c.currency, { decimals: false }) })}>
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
                          {t("Aç")}
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Card padded={false}>
                <EmptyState compact icon={<Lock />} title={t("Şu anda satın alınabilir içerik yok")} description={t("İçerik üreticileri tek seferlik satın alınabilir içerik yayınladığında burada görünür.")} />
              </Card>
            )}
          </section>
        </div>
      </Section>

      <Section className="py-4">
        <ul className="hf-card grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: CreditCard, title: t("Güvenli Ödeme"), text: t("Kart bilgilerin lisanslı ödeme kuruluşunda işlenir.") },
            { icon: ShieldCheck, title: t("Gizliliğin Bizim İçin Önemli"), text: t("Gizlilik tercihlerini sen yönetirsin.") },
            { icon: Sparkles, title: t("Şeffaf AI"), text: t("AI ikizi yanıtları her zaman açıkça etiketlenir.") },
            { icon: Headset, title: t("Destek"), text: t("Yardım Merkezi ve iletişim formu ile yanındayız.") },
          ].map((item) => (
            <li key={item.title} className="flex items-center gap-3.5">
              <item.icon className="size-8 shrink-0 text-brand-500" aria-hidden />
              <div>
                <p className="text-[13px] font-extrabold">{item.title}</p>
                <p className="text-[11px] leading-snug text-muted-strong">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand className="pb-12" title={t("Şimdi HEYFANS topluluğuna katıl.")} text={t("Favori içerik üreticilerine daha yakın ol, özel içeriklere eriş ve gerçek bağlantılar kur.")} href="/register" label={t("Hemen Başla")} />
    </>
  );
}
