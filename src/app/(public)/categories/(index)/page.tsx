import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flame, Heart, Hash, LayoutGrid, Sparkles, Users, Crown } from "lucide-react";
import { CategoryIcon } from "@/components/creator/category-icon";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { CreatorTile } from "@/components/creator/creator-cards";
import { CtaBand, HeroStats, PolaroidStack, PrimaryCta, PublicHero, Section, SeeAll, getStat } from "@/components/public/marketing";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/display";
import { getFormatters, getT } from "@/i18n/server";
import { listCategories, listCreators, platformCounters } from "@/services/creators/public";
import { categoryTopTags } from "@/services/public/discover";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Kategoriler — İlgi Alanına Göre İçerik Üreticilerini Keşfet"),
    description: t("Yaşam tarzı, fitness, seyahat, oyun, müzik ve daha fazlası: ilgi alanlarına uygun içerik üreticilerini ve AI ikizlerini kategorilere göre keşfet."),
    alternates: { canonical: "/categories" },
    openGraph: { title: t("Kategoriler | HEYFANS"), description: t("İlgi alanına uygun içerik üreticilerini kategorilere göre keşfet."), url: "/categories", type: "website" },
  };
}

export default async function CategoriesPage() {
  const [t, stat, { formatNumber, compare }] = await Promise.all([getT(), getStat(), getFormatters()]);
  const [all, counters, tags] = await Promise.all([listCategories(), platformCounters(), categoryTopTags(null, 14)]);
  const top = all.filter((c) => !c.parentSlug).sort((a, b) => b.creatorCount - a.creatorCount || compare(t(a.name), t(b.name)));
  const trendCats = top.filter((c) => c.creatorCount > 0).slice(0, 6);
  // Her kategori için en popüler creator; aynı creator birden fazla kategoride çıkmasın diye kullanılmamış ilkini seç
  const perCategory = await Promise.all(trendCats.map((c) => listCreators("popular", 4, c.slug)));
  const used = new Set<string>();
  const trendCreators = perCategory
    .map((list, i) => {
      const creator = list.find((x) => !used.has(x.id));
      if (creator) used.add(creator.id);
      return { category: trendCats[i]!, creator };
    })
    .filter((x) => x.creator);
  const heroPeople = trendCreators.slice(0, 2).map((x) => x.creator!);

  return (
    <>
      <PublicHero
        badge={t("İlgi alanına uygun içerik üreticilerini keşfet")}
        title={
          <>
            {t("Kategorilere Göre")}
            <br />
            {t("İçerik")} <span className="text-brand-500">{t("Üreticilerini Keşfet.")}</span>
          </>
        }
        description={t("İlgi alanlarına, zevklerine ve ruh haline uygun içerik üreticilerini kategoriler arasında keşfet. Sadece seni ilgilendiren içeriklere daha kolay ulaş, gerçek bağlantılar kur.")}
        actions={<PrimaryCta href="#populer">{t("Şimdi Kategorileri Keşfet")}</PrimaryCta>}
        stats={
          <HeroStats
            items={[
              { icon: <LayoutGrid />, value: formatNumber(all.length), label: t("İçerik Kategorisi") },
              { icon: <Users />, value: stat(counters.creators), label: t("İçerik Üreticisi") },
              { icon: <Sparkles />, value: stat(counters.liveTwins, ""), label: t("Yayındaki AI İkizi") },
            ]}
          />
        }
        note={t("İlgi alanına uygun kişileri keşfet")}
        art={heroPeople.length ? <PolaroidStack people={heroPeople.map((c) => ({ name: c.displayName, image: c.avatarUrl }))} caption={t("Sevdiğin kategoride gerçek insanlarla tanış")} /> : undefined}
      />

      <Section id="populer" className="scroll-mt-24">
        <SectionTitle title={t("Popüler Kategoriler")} icon={<Flame className="fill-brand-500" />} action={<SeeAll href="/explore" label={t("Tüm İçerik Üreticileri")} />} />
        {top.length ? (
          <div className="grid grid-cols-1 gap-3.5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {top.map((c) => (
              <Link key={c.slug} href={`/categories/${c.slug}`} className="group relative block aspect-[16/10] overflow-hidden rounded-2xl shadow-[var(--shadow-card)]">
                <CreatorPhoto src={c.coverUrl} name={t(c.name)} rounded="rounded-none" showMonogram={false} className="transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
                <span className="absolute start-3.5 top-3.5 grid size-10 place-items-center rounded-xl bg-white text-brand-500 shadow">
                  <CategoryIcon name={c.icon} className="size-5" />
                </span>
                <span className="absolute inset-x-3.5 bottom-3.5 text-white">
                  <span className="block text-base font-extrabold leading-tight">{t(c.name)}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-white/90">
                    {t("{creators} içerik üreticisi", { creators: formatNumber(c.creatorCount) })} <ArrowRight className="rtl:-scale-x-100 size-3" aria-hidden />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Card padded={false}>
            <EmptyState title={t("Henüz kategori bulunmuyor")} description={t("Kategoriler yönetici panelinden eklendiğinde burada listelenir.")} />
          </Card>
        )}
      </Section>

      {tags.length > 0 && (
        <Section className="py-4">
          <SectionTitle title={t("Etiketlere Göre Keşfet")} icon={<Hash />} subtitle={t("İçerik üreticilerinin en çok kullandığı etiketler.")} />
          <ul className="flex flex-wrap gap-2">
            {tags.map((tg) => (
              <li key={tg.tag}>
                <Link href={`/explore?q=${encodeURIComponent(tg.tag)}`} className="inline-flex items-center gap-1.5 rounded-full border border-brand-150 bg-white px-4 py-2 text-xs font-bold text-ink-soft shadow-sm hover:border-brand-300 hover:text-brand-600">
                  <Heart className="size-3 text-brand-500" aria-hidden /> {tg.tag} <span className="text-[10px] font-semibold text-muted">{tg.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {trendCreators.length > 0 && (
        <Section>
          <SectionTitle title={t("Kategorilere Göre Trend İçerik Üreticileri")} icon={<Crown className="fill-brand-500" />} action={<SeeAll href="/trending" label={t("Tüm Trendler")} />} />
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
            {trendCreators.map(({ creator }) => (
              <CreatorTile key={creator!.id} creator={creator!} />
            ))}
          </div>
        </Section>
      )}

      <CtaBand className="pb-12" title={t("Senin Kategorin, Senin İnsanların.")} text={t("İlgi alanlarına uygun içerik üreticileriyle tanış, daha özel ve gerçek sohbetler yaşa.")} href="/explore" label={t("Hemen Keşfet")} />
    </>
  );
}
