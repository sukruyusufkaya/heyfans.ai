import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flame, Heart, Hash, LayoutGrid, Sparkles, Users, Crown } from "lucide-react";
import { CategoryIcon } from "@/components/creator/category-icon";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { CreatorTile } from "@/components/creator/creator-cards";
import { CtaBand, HeroStats, PolaroidStack, PrimaryCta, PublicHero, Section, SeeAll, stat } from "@/components/public/marketing";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/display";
import { formatNumber } from "@/lib/utils";
import { listCategories, listCreators, platformCounters } from "@/services/creators/public";
import { categoryTopTags } from "@/services/public/discover";

export const metadata: Metadata = {
  title: "Kategoriler — İlgi Alanına Göre İçerik Üreticilerini Keşfet",
  description: "Yaşam tarzı, fitness, seyahat, oyun, müzik ve daha fazlası: ilgi alanlarına uygun içerik üreticilerini ve AI ikizlerini kategorilere göre keşfet.",
  alternates: { canonical: "/categories" },
  openGraph: { title: "Kategoriler | HEYFANS", description: "İlgi alanına uygun içerik üreticilerini kategorilere göre keşfet.", url: "/categories", type: "website" },
};

export default async function CategoriesPage() {
  const [all, counters, tags] = await Promise.all([listCategories(), platformCounters(), categoryTopTags(null, 14)]);
  const top = all.filter((c) => !c.parentSlug).sort((a, b) => b.creatorCount - a.creatorCount || a.name.localeCompare(b.name, "tr"));
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
        badge="İlgi alanına uygun içerik üreticilerini keşfet"
        title={
          <>
            Kategorilere Göre
            <br />
            İçerik <span className="text-brand-500">Üreticilerini Keşfet.</span>
          </>
        }
        description="İlgi alanlarına, zevklerine ve ruh haline uygun içerik üreticilerini kategoriler arasında keşfet. Sadece seni ilgilendiren içeriklere daha kolay ulaş, gerçek bağlantılar kur."
        actions={<PrimaryCta href="#populer">Şimdi Kategorileri Keşfet</PrimaryCta>}
        stats={
          <HeroStats
            items={[
              { icon: <LayoutGrid />, value: formatNumber(all.length), label: "İçerik Kategorisi" },
              { icon: <Users />, value: stat(counters.creators), label: "İçerik Üreticisi" },
              { icon: <Sparkles />, value: stat(counters.liveTwins, ""), label: "Yayındaki AI İkizi" },
            ]}
          />
        }
        note="İlgi alanına uygun kişileri keşfet"
        art={heroPeople.length ? <PolaroidStack people={heroPeople.map((c) => ({ name: c.displayName, image: c.avatarUrl }))} caption="Sevdiğin kategoride gerçek insanlarla tanış" /> : undefined}
      />

      <Section id="populer" className="scroll-mt-24">
        <SectionTitle title="Popüler Kategoriler" icon={<Flame className="fill-brand-500" />} action={<SeeAll href="/explore" label="Tüm İçerik Üreticileri" />} />
        {top.length ? (
          <div className="grid grid-cols-1 gap-3.5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {top.map((c) => (
              <Link key={c.slug} href={`/categories/${c.slug}`} className="group relative block aspect-[16/10] overflow-hidden rounded-2xl shadow-[var(--shadow-card)]">
                <CreatorPhoto src={c.coverUrl} name={c.name} rounded="rounded-none" showMonogram={false} className="transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
                <span className="absolute left-3.5 top-3.5 grid size-10 place-items-center rounded-xl bg-white text-brand-500 shadow">
                  <CategoryIcon name={c.icon} className="size-5" />
                </span>
                <span className="absolute inset-x-3.5 bottom-3.5 text-white">
                  <span className="block text-base font-extrabold leading-tight">{c.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-white/90">
                    {formatNumber(c.creatorCount)} içerik üreticisi <ArrowRight className="size-3" aria-hidden />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Card padded={false}>
            <EmptyState title="Henüz kategori bulunmuyor" description="Kategoriler yönetici panelinden eklendiğinde burada listelenir." />
          </Card>
        )}
      </Section>

      {tags.length > 0 && (
        <Section className="py-4">
          <SectionTitle title="Etiketlere Göre Keşfet" icon={<Hash />} subtitle="İçerik üreticilerinin en çok kullandığı etiketler." />
          <ul className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <li key={t.tag}>
                <Link href={`/explore?q=${encodeURIComponent(t.tag)}`} className="inline-flex items-center gap-1.5 rounded-full border border-brand-150 bg-white px-4 py-2 text-xs font-bold text-ink-soft shadow-sm hover:border-brand-300 hover:text-brand-600">
                  <Heart className="size-3 text-brand-500" aria-hidden /> {t.tag} <span className="text-[10px] font-semibold text-muted">{t.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {trendCreators.length > 0 && (
        <Section>
          <SectionTitle title="Kategorilere Göre Trend İçerik Üreticileri" icon={<Crown className="fill-brand-500" />} action={<SeeAll href="/trending" label="Tüm Trendler" />} />
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
            {trendCreators.map(({ creator }) => (
              <CreatorTile key={creator!.id} creator={creator!} />
            ))}
          </div>
        </Section>
      )}

      <CtaBand className="pb-12" title="Senin Kategorin, Senin İnsanların." text="İlgi alanlarına uygun içerik üreticileriyle tanış, daha özel ve gerçek sohbetler yaşa." href="/explore" label="Hemen Keşfet" />
    </>
  );
}
