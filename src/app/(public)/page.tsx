import type { Metadata } from "next";
import { Flame, LayoutGrid, MessageCircle, Percent, ShieldCheck, Star, Timer, Users } from "lucide-react";
import { CreatorTile } from "@/components/creator/creator-cards";
import { Section, SeeAll } from "@/components/public/marketing";
import { SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/display";
import { siteConfig } from "@/config/site";
import { CompareSection, CreatorAdvantageSection, FanExperienceSection, FinalCta, HomeHero, JourneySection, RevenueSection, TrustSection, compactStat, type HeroStat } from "@/features/public/home-sections";
import { getSections } from "@/services/cms/cms";
import { listCategories, listCreators, platformCounters } from "@/services/creators/public";
import { getPlatformSettings } from "@/services/platform/settings";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} — ${siteConfig.tagline}` },
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
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
    counters.users > 0 && { icon: <Users />, value: compactStat(counters.users), label: "Aktif kullanıcı", hint: "Topluluğa katılan hayranlar" },
    counters.messages > 0 && { icon: <MessageCircle />, value: compactStat(counters.messages), label: "Gönderilen mesaj", hint: "AI ikizleriyle sohbetler" },
    counters.creators > 0 && { icon: <Star />, value: compactStat(counters.creators), label: "İçerik üreticisi", hint: "Doğrulanmış profiller" },
    categories.length > 0 && { icon: <LayoutGrid />, value: String(categories.length), label: "Kategori", hint: "Yaşam tarzından oyuna" },
    { icon: <Timer />, value: "7/24", label: "Her an ulaşılabilir", hint: "AI ikizleri hiç uyumaz" },
    { icon: <Percent />, value: `%${creatorPercent}`, label: "Creator gelir payı", hint: "Net gelir üzerinden" },
    { icon: <ShieldCheck />, value: "18+", label: "Güvenli topluluk", hint: "Yaş ve içerik kuralları" },
  ];
  const stats = candidates.filter((s): s is HeroStat => Boolean(s)).slice(0, 4);

  return (
    <>
      <HomeHero
        people={people}
        catIcons={catIcons}
        badge={cfg.badge ?? "AI ile daha yakın, daha gerçek bağlantılar"}
        title={hero?.title ?? "Gerçek İçerik Üreticileri. AI İkizler. Gerçek Bağlantılar."}
        description={hero?.subtitle ?? "Sevdiğin içerik üreticilerinin AI ikizleriyle 7/24 sohbet et, özel içeriklere eriş ve onlarla her zamankinden daha yakın bir bağ kur."}
        primary={{ label: cfg.primaryCta?.label ?? "İçerik Üreticilerini Keşfet", href: cfg.primaryCta?.href ?? "/explore" }}
        secondary={{ label: cfg.secondaryCta?.label ?? "Nasıl Çalışır?", href: cfg.secondaryCta?.href ?? "/how-it-works" }}
        stats={stats}
      />

      <JourneySection people={people} />

      <Section className="pb-16">
        <p className="mb-3 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em] text-muted">
          <span className="font-display text-brand-500">03</span>
          <span className="h-px w-10 bg-brand-200" aria-hidden />
          Topluluk
        </p>
        <SectionTitle title="Öne Çıkan İçerik Üreticileri" icon={<Flame className="fill-brand-500" />} action={<SeeAll href="/explore" />} />
        {featured.length ? (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
            {featured.map((c) => (
              <CreatorTile key={c.id} creator={c} />
            ))}
          </div>
        ) : (
          <EmptyState title="Topluluğu keşfet" description="Keşfet sayfasından tüm içerik üreticilerine göz atabilirsin." />
        )}
      </Section>

      <FanExperienceSection people={people} catIcons={catIcons} />
      <CreatorAdvantageSection people={people} />
      <RevenueSection creatorPercent={creatorPercent} />
      <CompareSection people={people} />
      <TrustSection />
      <FinalCta people={people} title={announcement?.title ?? "Şimdi HEYFANS topluluğuna katıl."} text={announcement?.subtitle ?? null} />
    </>
  );
}
