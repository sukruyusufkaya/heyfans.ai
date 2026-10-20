import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Crown, Flame, Gem, Search, SearchX, Trophy } from "lucide-react";
import { z } from "zod";
import { CategoryIcon } from "@/components/creator/category-icon";
import { CreatorCardCompact, CreatorCardTall } from "@/components/creator/creator-cards";
import { PolaroidStack, PublicHero, Section, SeeAll } from "@/components/public/marketing";
import { SectionTitle } from "@/components/ui/card";
import { EmptyState, Pagination } from "@/components/ui/display";
import { ExploreFilters } from "@/features/public/explore-filters";
import { exploreHref, type FilterValues } from "@/features/public/explore-url";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { exploreCreators, listCategories, listCreators, viewerRelations, type CreatorCard } from "@/services/creators/public";

type SearchParams = Record<string, string | string[] | undefined>;

const SORTS = [
  { value: "popular", label: "Popüler" },
  { value: "new", label: "Yeni" },
  { value: "conversations", label: "En çok sohbet" },
  { value: "price_asc", label: "Fiyat (artan)" },
] as const;

const paramsSchema = z.object({
  q: z.string().trim().max(80).catch(""),
  price: z.enum(["all", "free", "0-100", "100-300", "300+"]).catch("all"),
  online: z.literal("1").optional().catch(undefined),
  verified: z.literal("1").optional().catch(undefined),
  sort: z.enum(["popular", "new", "conversations", "price_asc"]).catch("popular"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

function parseParams(sp: SearchParams, validCategories: Set<string>) {
  const p = paramsSchema.parse({ q: sp.q, price: sp.price, online: sp.online, verified: sp.verified, sort: sp.sort, page: sp.page });
  const raw = Array.isArray(sp.c) ? sp.c : sp.c ? [sp.c] : [];
  const categories = [...new Set(raw.filter((c) => validCategories.has(c)))].slice(0, 12);
  const values: FilterValues = { q: p.q, categories, price: p.price, online: p.online === "1", verified: p.verified === "1", sort: p.sort };
  const activeCount = (values.q ? 1 : 0) + categories.length + (values.price !== "all" ? 1 : 0) + (values.online ? 1 : 0) + (values.verified ? 1 : 0);
  return { values, page: p.page, activeCount };
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = ["q", "c", "price", "online", "verified", "sort", "page"].some((k) => sp[k] !== undefined);
  return {
    title: "Keşfet — İçerik Üreticilerini ve AI İkizlerini Bul",
    description: "Yetenekli içerik üreticilerini kategoriye, fiyata ve çevrimiçi durumuna göre keşfet; AI ikizleriyle sohbet et ve özel içeriklere eriş.",
    alternates: { canonical: "/explore" },
    openGraph: { title: "Keşfet | HEYFANS", description: "İlgi alanlarına uygun içerik üreticilerini keşfet, takip et ve onlarla daha yakın bir bağ kur.", url: "/explore", type: "website" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

const weekAgo = () => Date.now() - 7 * 86400_000;

export default async function ExplorePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const [session, allCategories] = await Promise.all([getSession(), listCategories()]);
  const { values, page, activeCount } = parseParams(sp, new Set(allCategories.map((c) => c.slug)));
  const filtered = activeCount > 0;
  const authed = Boolean(session);

  let results: Awaited<ReturnType<typeof exploreCreators>> | null = null;
  let featured: CreatorCard[] = [];
  let newcomers: CreatorCard[] = [];
  let popular: CreatorCard[] = [];
  if (filtered || sp.sort !== undefined || sp.page !== undefined) {
    results = await exploreCreators({
      q: values.q || undefined,
      categories: values.categories,
      price: values.price as "all" | "free" | "0-100" | "100-300" | "300+",
      online: values.online,
      verified: values.verified,
      sort: values.sort as "popular" | "new" | "conversations" | "price_asc",
      page,
      pageSize: 12,
    });
  } else {
    [featured, newcomers, popular] = await Promise.all([listCreators("featured", 6), listCreators("new", 12), listCreators("popular", 6)]);
  }

  const cutoff = weekAgo();
  const thisWeek = newcomers.filter((c) => new Date(c.createdAt).getTime() >= cutoff).slice(0, 6);
  const newSection = thisWeek.length ? thisWeek : newcomers.slice(0, 6);
  const newTitle = thisWeek.length ? "Bu Hafta Yeni" : "Yeni Katılanlar";

  const shown = results ? results.items : [...featured, ...newSection, ...popular];
  const relations = await viewerRelations(session?.user.id, [...new Set(shown.map((c) => c.id))]);
  const heroPeople = (results?.items.length ? results.items : [...featured, ...popular]).slice(0, 3);
  const topCategories = allCategories.filter((c) => !c.parentSlug).sort((a, b) => b.creatorCount - a.creatorCount).slice(0, 7);

  return (
    <>
      <PublicHero
        badge="Gerçek insanlar, gerçek bağlantılar"
        title={
          <>
            HEYFANS&apos;ta
            <br />
            İçerik Üreticilerini <span className="text-brand-500">Keşfet.</span>
          </>
        }
        description="Yetenekli ve özel içerik üreticileriyle tanış. İlgi alanlarına uygun içerik üreticilerini keşfet, takip et ve onlarla daha yakın bir bağ kur."
        actions={
          <Form action="/explore" role="search" className="flex w-full max-w-xl items-center gap-2 rounded-full border border-brand-150 bg-white p-1.5 ps-5 shadow-[var(--shadow-card)] focus-within:ring-4 focus-within:ring-brand-100">
            <Search className="size-5 shrink-0 text-muted" aria-hidden />
            <label htmlFor="explore-q" className="sr-only">
              İçerik üreticisi adı, kategori veya ilgi alanı
            </label>
            <input id="explore-q" name="q" defaultValue={values.q} maxLength={80} placeholder="İçerik üreticisi adı, kategori veya ilgi alanı ara..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#aaa5ae]" />
            <button type="submit" className="h-11 shrink-0 rounded-full bg-brand-500 px-7 text-sm font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
              Ara
            </button>
          </Form>
        }
        stats={
          topCategories.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-ink">Popüler Kategoriler:</span>
              {topCategories.map((c) => (
                <Link key={c.slug} href={exploreHref({ ...values, q: "", categories: [c.slug] })} className="inline-flex items-center gap-1.5 rounded-full border border-brand-150 bg-white px-3.5 py-2 text-xs font-bold text-ink-soft shadow-sm hover:border-brand-300 hover:text-brand-600">
                  <CategoryIcon name={c.icon} className="size-3.5 text-brand-500" /> {c.name}
                </Link>
              ))}
            </div>
          ) : undefined
        }
        note="Yeni içerik üreticilerini keşfet"
        art={heroPeople.length ? <PolaroidStack people={heroPeople.map((c) => ({ name: c.displayName, image: c.avatarUrl }))} caption="Senin için burada" /> : undefined}
      />

      <Section className="grid items-start gap-6 lg:grid-cols-[262px_1fr]">
        <ExploreFilters categories={allCategories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }))} values={values} activeCount={activeCount} />

        <div className="min-w-0">
          {results ? (
            <>
              <SectionTitle
                title={filtered ? "Arama Sonuçları" : "Tüm İçerik Üreticileri"}
                icon={<Search />}
                subtitle={`${results.total} içerik üreticisi${values.q ? ` · “${values.q}”` : ""}`}
                action={
                  <nav aria-label="Sıralama" className="no-scrollbar flex max-w-[52vw] gap-1.5 overflow-x-auto sm:max-w-none">
                    {SORTS.map((s) => (
                      <Link
                        key={s.value}
                        href={exploreHref({ ...values, sort: s.value })}
                        aria-current={values.sort === s.value ? "true" : undefined}
                        className={cn("shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold", values.sort === s.value ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink")}
                      >
                        {s.label}
                      </Link>
                    ))}
                  </nav>
                }
              />
              {results.items.length ? (
                <>
                  <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
                    {results.items.map((c) => (
                      <CreatorCardTall key={c.id} creator={c} authed={authed} favorite={relations.favorites.has(c.id)} cta={c.twinLive ? "chat" : "profile"} />
                    ))}
                  </div>
                  <Pagination className="mt-8" page={results.page} pageCount={results.pageCount} hrefFor={(p) => exploreHref(values, p)} />
                </>
              ) : (
                <div className="hf-card">
                  <EmptyState
                    icon={<SearchX />}
                    title="Aramana uygun içerik üreticisi bulunamadı"
                    description="Filtreleri azaltmayı veya farklı bir anahtar kelime denemeyi dene."
                    action={
                      <Link href="/explore" className="inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white">
                        Filtreleri Temizle
                      </Link>
                    }
                  />
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-10">
              <section>
                <SectionTitle title="Senin İçin Önerilen" icon={<Flame className="fill-brand-500" />} action={<SeeAll href="/explore?sort=popular" />} />
                {featured.length ? (
                  <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
                    {featured.map((c) => (
                      <CreatorCardTall key={c.id} creator={c} authed={authed} favorite={relations.favorites.has(c.id)} cta={c.twinLive ? "chat" : "profile"} />
                    ))}
                  </div>
                ) : (
                  <div className="hf-card">
                    <EmptyState title="Henüz önerilecek içerik üreticisi yok" description="Onaylanan içerik üreticileri burada listelenecek." />
                  </div>
                )}
              </section>

              {newSection.length > 0 && (
                <section>
                  <SectionTitle title={newTitle} icon={<Gem className="fill-brand-500" />} action={<SeeAll href="/explore?sort=new" />} />
                  <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
                    {newSection.map((c) => (
                      <CreatorCardCompact key={c.id} creator={c} authed={authed} favorite={relations.favorites.has(c.id)} badge={new Date(c.createdAt).getTime() >= cutoff ? "Yeni" : undefined} />
                    ))}
                  </div>
                </section>
              )}

              {popular.length > 0 && (
                <section>
                  <SectionTitle title="Popüler İçerik Üreticileri" icon={<Trophy className="fill-brand-500" />} action={<SeeAll href="/explore?sort=popular" />} />
                  <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
                    {popular.map((c, i) => (
                      <CreatorCardCompact key={c.id} creator={c} authed={authed} favorite={relations.favorites.has(c.id)} rank={i + 1} />
                    ))}
                  </div>
                </section>
              )}

              {!featured.length && !newSection.length && !popular.length && (
                <p className="flex items-center gap-2 text-xs text-muted">
                  <Crown className="size-4 text-brand-500" aria-hidden /> Platformda henüz yayında içerik üreticisi bulunmuyor.
                </p>
              )}
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
