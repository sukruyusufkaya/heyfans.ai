import type { Metadata } from "next";
import { Flame, LayoutGrid, MessageCircle, Percent, ShieldCheck, Star, Timer, Users } from "lucide-react";
import { CreatorTile } from "@/components/creator/creator-cards";
import { Section, SeeAll } from "@/components/public/marketing";
import { SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/display";
import { siteConfig } from "@/config/site";
import { CompareSection, CreatorAdvantageSection, FanExperienceSection, FinalCta, HomeHero, JourneySection, RevenueSection, TrustSection, compactStat, type HeroStat } from "@/features/public/home-sections";
import { getFormatters, getT } from "@/i18n/server";
import { getSections } from "@/services/cms/cms";
import { listCategories, listCreators, platformCounters } from "@/services/creators/public";
import { getPlatformSettings } from "@/services/platform/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: `${siteConfig.name} — ${t(siteConfig.tagline)}` },
    description: t(siteConfig.description),
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const [t, { formatCompact, formatNumber, formatPercent }] = await Promise.all([getT(), getFormatters()]);
  const [sections, featured, popular, categories, counters, settings] = await Promise.all([
    getSections("home"),
    listCreators("featured", 6),
    listCreators("popular", 12),
    listCategories(),
    platformCounters(),
    getPlatformSettings(),
  ]);
  const hero = sections.hero;
  const cfg = (hero?.config ?? {}) as { badge?: string; primaryCta?: { label: string; href: string }; secondaryCta?: { label: string; href: string } };
  const announcement = sections.announcement;

  // Görsel bölümler için kişiler: önce öne çıkanlar, sonra popüler creator'lar (tekrarsız).
  const seen = new Set<string>();
  const people = [...featured, ...popular].filter((c) => !seen.has(c.id) && seen.add(c.id));
  const catIcons = Object.fromEntries(categories.map((c) => [c.slug, c.icon]));
  const creatorPercent = Math.round(settings.revenue.creatorShareBps / 100);

  // İstatistik şeridi: oluşmuş gerçek sayılar önce, ardından platformun sabit özellikleri (en fazla 4).
  const candidates: (HeroStat | false)[] = [
    counters.users > 0 && { icon: <Users />, value: compactStat(formatCompact, counters.users), label: t("Aktif kullanıcı"), hint: t("Topluluğa katılan hayranlar") },
    counters.messages > 0 && { icon: <MessageCircle />, value: compactStat(formatCompact, counters.messages), label: t("Gönderilen mesaj"), hint: t("AI ikizleriyle sohbetler") },
    counters.creators > 0 && { icon: <Star />, value: compactStat(formatCompact, counters.creators), label: t("İçerik üreticisi"), hint: t("Doğrulanmış profiller") },
    categories.length > 0 && { icon: <LayoutGrid />, value: formatNumber(categories.length), label: t("Kategori"), hint: t("Yaşam tarzından oyuna") },
    { icon: <Timer />, value: "7/24", label: t("Her an ulaşılabilir"), hint: t("AI ikizleri hiç uyumaz") },
    { icon: <Percent />, value: formatPercent(creatorPercent * 100), label: t("Creator gelir payı"), hint: t("Net gelir üzerinden") },
    { icon: <ShieldCheck />, value: "18+", label: t("Güvenli topluluk"), hint: t("Yaş ve içerik kuralları") },
  ];
  const stats = candidates.filter((s): s is HeroStat => Boolean(s)).slice(0, 4);

  return (
    <>
      <HomeHero
        people={people}
        catIcons={catIcons}
        badge={cfg.badge ? t(cfg.badge) : t("AI ile daha yakın, daha gerçek bağlantılar")}
        title={hero?.title ? t(hero.title) : t(siteConfig.tagline)}
        description={hero?.subtitle ? t(hero.subtitle) : t("Sevdiğin içerik üreticilerinin AI ikizleriyle 7/24 sohbet et, özel içeriklere eriş ve onlarla her zamankinden daha yakın bir bağ kur.")}
        primary={{ label: cfg.primaryCta?.label ? t(cfg.primaryCta.label) : t("İçerik Üreticilerini Keşfet"), href: cfg.primaryCta?.href ?? "/explore" }}
        secondary={{ label: cfg.secondaryCta?.label ? t(cfg.secondaryCta.label) : t("Nasıl Çalışır?"), href: cfg.secondaryCta?.href ?? "/how-it-works" }}
        stats={stats}
      />

      <JourneySection people={people} />

      <Section className="pb-16">
        <p className="mb-3 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em] text-muted">
          <span className="font-display text-brand-500">03</span>
          <span className="h-px w-10 bg-brand-200" aria-hidden />
          {t("Topluluk")}
        </p>
        <SectionTitle title={t("Öne Çıkan İçerik Üreticileri")} icon={<Flame className="fill-brand-500" />} action={<SeeAll href="/explore" />} />
        {featured.length ? (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
            {featured.map((c) => (
              <CreatorTile key={c.id} creator={c} />
            ))}
          </div>
        ) : (
          <EmptyState title={t("Topluluğu keşfet")} description={t("Keşfet sayfasından tüm içerik üreticilerine göz atabilirsin.")} />
        )}
      </Section>

      <FanExperienceSection people={people} catIcons={catIcons} />
      <CreatorAdvantageSection people={people} />
      <RevenueSection creatorPercent={creatorPercent} />
      <CompareSection people={people} />
      <TrustSection />
      <FinalCta people={people} title={announcement?.title ? t(announcement.title) : t("Şimdi HEYFANS topluluğuna katıl.")} text={announcement?.subtitle ? t(announcement.subtitle) : null} />
    </>
  );
}
