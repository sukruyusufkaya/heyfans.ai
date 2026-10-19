import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Bot, Crown, Flame, Hash, Heart, LayoutGrid, MessageCircle, Sparkles, Users } from "lucide-react";
import { CategoryIcon } from "@/components/creator/category-icon";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { CreatorTile, Verified } from "@/components/creator/creator-cards";
import { FollowButton } from "@/components/creator/social-buttons";
import { AiTwinLabel } from "@/components/ui/badge";
import { CtaBand, HeroStats, PublicHero, Section, SeeAll } from "@/components/public/marketing";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/display";
import { getSession } from "@/lib/auth/session";
import { formatCompact, formatNumber } from "@/lib/utils";
import { exploreCreators, listCategories, viewerRelations } from "@/services/creators/public";
import { categoryTopTags, getCategoryCached, listTwinCreators } from "@/services/public/discover";
import { Breadcrumbs } from "@/features/support/support-ui";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryCached(slug);
  if (!data) return { title: "Kategori bulunamadı", robots: { index: false } };
  const { category } = data;
  const description = category.heroText ?? category.description ?? `${category.name} kategorisindeki içerik üreticilerini ve AI ikizlerini keşfet.`;
  return {
    title: `${category.name} — İçerik Üreticileri ve AI İkizleri`,
    description,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: { title: `${category.name} | HEYFANS`, description, url: `/categories/${category.slug}`, type: "website" },
  };
}

function splitTitle(title: string) {
  const parts = title.trim().split(/\s+/);
  if (parts.length < 2) return <span className="text-brand-500">{title}</span>;
  const last = parts.pop()!;
  return (
    <>
      {parts.join(" ")} <span className="text-brand-500">{last}</span>
    </>
  );
}

export default async function CategoryDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = await getCategoryCached(slug);
  if (!data) notFound();
  const { category, subcategories } = data;
  const slugs = [category.slug, ...subcategories.map((s) => s.slug)];

  const [session, allCategories, featured, newcomers, twins, tags] = await Promise.all([
    getSession(),
    listCategories(),
    exploreCreators({ categories: slugs, sort: "popular", pageSize: 6 }),
    exploreCreators({ categories: slugs, sort: "new", pageSize: 5 }),
    listTwinCreators(slugs, 3),
    categoryTopTags(slugs, 12),
  ]);
  const relations = await viewerRelations(session?.user.id, newcomers.items.map((c) => c.id));
  const authed = Boolean(session);
  const parent = category.parentSlug ? allCategories.find((c) => c.slug === category.parentSlug) : null;
  const siblings = (parent ? allCategories.filter((c) => c.parentSlug === parent.slug && c.slug !== category.slug) : allCategories.filter((c) => !c.parentSlug && c.slug !== category.slug)).slice(0, 7);
  const related = subcategories.length ? subcategories : siblings;
  const relatedTitle = subcategories.length ? `${category.name} Alt Kategorileri` : parent ? `${parent.name} Kategorisindeki Diğerleri` : "Diğer Kategoriler";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} — İçerik Üreticileri ve AI İkizleri`,
    description: category.heroText ?? category.description ?? undefined,
    url: `/categories/${category.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PublicHero
        compact
        breadcrumb={
          <div className="-mb-3 mt-1">
            <Breadcrumbs items={[{ label: "Kategoriler", href: "/categories" }, ...(parent ? [{ label: parent.name, href: `/categories/${parent.slug}` }] : []), { label: category.name }]} />
          </div>
        }
        title={splitTitle(category.heroTitle ?? category.name)}
        description={category.heroText ?? category.description ?? `${category.name} kategorisindeki içerik üreticileri ve AI ikizleriyle tanış.`}
        stats={
          <HeroStats
            items={[
              { icon: <Users />, value: formatNumber(featured.total), label: `${category.name} İçerik Üreticisi` },
              { icon: <Bot />, value: formatNumber(category.liveTwinCount), label: "Yayındaki AI İkizi" },
              { icon: <CategoryIcon name={category.icon} />, value: formatNumber(subcategories.length), label: "Alt Kategori" },
            ]}
          />
        }
        art={
          <div className="grid h-full min-h-[200px] place-items-center">
            <span className="grid size-40 place-items-center rounded-[40px] bg-white/70 text-brand-500 shadow-[var(--shadow-pink)] backdrop-blur [&_svg]:size-16">
              <CategoryIcon name={category.icon} />
            </span>
          </div>
        }
      />

      {related.length > 0 && (
        <Section className="pb-2">
          <SectionTitle title={relatedTitle} icon={<LayoutGrid />} action={<SeeAll href="/categories" label="Tüm Kategoriler" />} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {related.map((c) => (
              <Link key={c.slug} href={`/categories/${c.slug}`} className="hf-card group flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-card-hover)]">
                <span className="relative block aspect-[16/10]">
                  <CreatorPhoto src={c.coverUrl} name={c.name} rounded="rounded-none" showMonogram={false} />
                  <span className="absolute left-2.5 top-2.5 grid size-8 place-items-center rounded-lg bg-white text-brand-500 shadow">
                    <CategoryIcon name={c.icon} className="size-4" />
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2 p-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-extrabold">{c.name}</span>
                    <span className="block text-[10px] text-muted">{formatNumber(c.creatorCount)} içerik üreticisi</span>
                  </span>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-500 text-white">
                    <ArrowRight className="size-3.5" aria-hidden />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section>
        <SectionTitle title={`Öne Çıkan ${category.name} İçerik Üreticileri`} icon={<Flame className="fill-brand-500" />} action={<SeeAll href={`/explore?c=${category.slug}`} />} />
        {featured.items.length ? (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
            {featured.items.map((c) => (
              <CreatorTile key={c.id} creator={c} />
            ))}
          </div>
        ) : (
          <Card padded={false}>
            <EmptyState title="Bu kategoride henüz içerik üreticisi yok" description="Onaylanan içerik üreticileri kategorilerine göre burada listelenir." action={<Link href="/explore" className="inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white">Tüm İçerik Üreticileri</Link>} />
          </Card>
        )}
      </Section>

      <Section className="grid items-start gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <SectionTitle title={`En İyi ${category.name} AI İkizleri`} icon={<Sparkles className="fill-brand-500" />} subtitle="Yayındaki AI ikizleri — yanıtların tümü açıkça etiketlenir." />
          {twins.length ? (
            <div className="grid gap-3.5 sm:grid-cols-3">
              {twins.map((t) => (
                <article key={t.id} className="hf-card flex flex-col overflow-hidden">
                  <Link href={`/creators/${t.username}`} className="relative block aspect-[4/3]" aria-label={`${t.displayName} profili`}>
                    <CreatorPhoto src={t.avatarUrl ?? t.coverUrl} name={t.displayName} rounded="rounded-none" />
                  </Link>
                  <div className="flex flex-1 flex-col p-3.5">
                    <AiTwinLabel className="self-start" />
                    <p className="mt-2 flex items-center gap-1 text-[15px] font-extrabold">
                      {t.twinName} {t.verified && <Verified className="size-3.5" />}
                    </p>
                    {t.greeting && <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted-strong">{t.greeting}</p>}
                    <Link href={`/chat/${t.username}`} className="mt-auto flex h-9 items-center justify-center gap-1.5 rounded-full bg-brand-500 pt-0 text-[11px] font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                      <MessageCircle className="size-3.5" aria-hidden /> Sohbet Et
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Card padded={false}>
              <EmptyState compact icon={<Bot />} title="Bu kategoride yayında AI ikizi yok" description="İçerik üreticileri AI ikizlerini onaylayıp yayına aldığında burada görünür." />
            </Card>
          )}
        </div>

        <div>
          <SectionTitle title={`${category.name} Kategorisinde Yeni Yüzler`} icon={<Crown className="fill-brand-500" />} action={<SeeAll href={`/explore?c=${category.slug}&sort=new`} />} />
          {newcomers.items.length ? (
            <ul className="grid gap-2.5">
              {newcomers.items.map((c) => (
                <li key={c.id} className="hf-card flex items-center gap-3 p-3">
                  <Link href={`/creators/${c.username}`} className="size-12 shrink-0 overflow-hidden rounded-xl" aria-label={`${c.displayName} profili`}>
                    <CreatorPhoto src={c.avatarUrl} name={c.displayName} rounded="rounded-xl" showMonogram={false} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/creators/${c.username}`} className="flex items-center gap-1 truncate text-[13px] font-extrabold hover:text-brand-600">
                      {c.displayName} {c.verified && <Verified className="size-3.5" />}
                    </Link>
                    <p className="text-[10px] text-muted">{formatCompact(c.followers)} takipçi</p>
                  </div>
                  <FollowButton creatorId={c.id} initial={relations.following.has(c.id)} authed={authed} size="sm" />
                </li>
              ))}
            </ul>
          ) : (
            <Card padded={false}>
              <EmptyState compact title="Henüz yeni yüz yok" />
            </Card>
          )}
        </div>
      </Section>

      {tags.length > 0 && (
        <Section className="py-4">
          <SectionTitle title="Popüler Etiketler" icon={<Hash />} subtitle={`${category.name} içerik üreticilerinin en çok kullandığı etiketler.`} />
          <ul className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <li key={t.tag}>
                <Link href={`/explore?q=${encodeURIComponent(t.tag)}`} className="inline-flex items-center gap-1.5 rounded-full border border-brand-150 bg-white px-4 py-2 text-xs font-bold text-ink-soft shadow-sm hover:border-brand-300 hover:text-brand-600">
                  <Heart className="size-3 text-brand-500" aria-hidden /> {t.tag}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <CtaBand className="pb-12" title="Şimdi HEYFANS topluluğuna katıl." text={`${category.name} içerik üreticileriyle tanış ve sana özel içeriklere eriş.`} href="/register" label="Hemen Başla" />
    </>
  );
}
