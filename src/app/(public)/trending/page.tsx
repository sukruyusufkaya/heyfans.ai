import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flame, LayoutGrid, MessageCircle, Play, Rocket, TrendingUp, Users, BarChart3, Crown, Sparkles } from "lucide-react";
import { CategoryIcon } from "@/components/creator/category-icon";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { FollowButton } from "@/components/creator/social-buttons";
import { Verified } from "@/components/creator/creator-cards";
import { Sparkline } from "@/components/charts/charts";
import { HeroStats, PrimaryCta, PublicHero, Section, SecondaryCta, SeeAll, getStat } from "@/components/public/marketing";
import { Badge } from "@/components/ui/badge";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState, Progress, StatCard } from "@/components/ui/display";
import { TrendChart } from "@/features/public/trend-chart";
import { getSession } from "@/lib/auth/session";
import { getFormatters, getT, localeAlternates } from "@/i18n/server";
import type { Translator } from "@/i18n/translate";
import { cn } from "@/lib/utils";
import { listCategories, platformCounters, trendingCreators, trendingSummary, viewerRelations, type TrendingCreator } from "@/services/creators/public";
import { creatorActivitySeries, fillDailySeries } from "@/services/public/discover";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Trendler — Şu Anda Yükselen AI İkizleri ve İçerik Üreticileri"),
    description: t("Son 7 günde en çok takip edilen, en çok sohbet edilen ve en hızlı yükselen AI ikizlerini ve içerik üreticilerini keşfet."),
    alternates: await localeAlternates("/trending"),
    openGraph: { title: t("Trendler | HEYFANS"), description: t("Şu anda en çok konuşulan AI ikizleri ve içerik üreticileri."), url: "/trending", type: "website" },
  };
}

function trendLabel(c: TrendingCreator, t: Translator): { text: string; tone: "solid" | "pink" | "white" } {
  if (c.growthPct !== null && c.growthPct >= 100) return { text: t("Hızla Yükseliyor"), tone: "solid" };
  if (c.newFollowers > 0 && (c.growthPct === null || c.growthPct > 0)) return { text: t("Yükselişte"), tone: "pink" };
  return { text: t("Trendde"), tone: "white" };
}

export default async function TrendingPage() {
  const [t, stat, { formatCompact, formatNumber }] = await Promise.all([getT(), getStat(), getFormatters()]);
  const [session, trending, summary, counters, categories] = await Promise.all([getSession(), trendingCreators(7, 10), trendingSummary(30), platformCounters(), listCategories()]);
  const authed = Boolean(session);

  const risers = [...trending].filter((c) => c.newFollowers > 0).sort((a, b) => b.newFollowers - a.newFollowers || (b.growthPct ?? -1) - (a.growthPct ?? -1)).slice(0, 3);
  const chatters = [...trending].filter((c) => c.chats > 0).sort((a, b) => b.chats - a.chats).slice(0, 3);
  const maxChats = Math.max(1, ...chatters.map((c) => c.chats));
  const [relations, activity] = await Promise.all([
    viewerRelations(session?.user.id, [...new Set(risers.map((c) => c.id))]),
    creatorActivitySeries(risers.map((c) => c.id), 7),
  ]);
  const series = fillDailySeries(summary.daily, 30);
  const hasSeries = series.some((p) => p.value > 0);
  const trendCats = categories
    .filter((c) => !c.parentSlug)
    .sort((a, b) => b.liveTwinCount - a.liveTwinCount || b.creatorCount - a.creatorCount)
    .slice(0, 7);
  const hero = trending.slice(0, 3);

  return (
    <>
      <PublicHero
        badge={t("Şu anda trend olan AI ikizleri ve içerik üreticileri")}
        title={
          <>
            {t("Trend Olan AI İkizlerini")}
            <br />
            {t("ve İçerik")} <span className="text-brand-500">{t("Üreticilerini Keşfet.")}</span>
          </>
        }
        description={t("HEYFANS topluluğunda şu anda en çok konuşulan, en hızlı yükselen AI ikizlerini ve gerçek içerik üreticilerini keşfet. Trendleri yakala, sohbetlere katıl, favorilerini takip et.")}
        actions={
          <>
            <PrimaryCta href="#top10">{t("Trendleri Keşfet")}</PrimaryCta>
            <SecondaryCta href="/how-it-works" icon={<Play fill="currentColor" />}>
              {t("Nasıl Çalışır?")}
            </SecondaryCta>
          </>
        }
        stats={
          <HeroStats
            items={[
              { icon: <Users />, value: stat(counters.users), label: t("Aktif Kullanıcı") },
              { icon: <MessageCircle />, value: stat(counters.messages), label: t("Gönderilen Mesaj") },
              { icon: <Crown />, value: stat(counters.creators), label: t("İçerik Üreticisi") },
              { icon: <Sparkles />, value: stat(counters.liveTwins, ""), label: t("Yayındaki AI İkizi") },
            ]}
          />
        }
        note={t("Şu anda trend olan AI ikizleri keşfet!")}
        art={
          hero.length ? (
            <div className="relative flex h-full min-h-[300px] items-center justify-center gap-3 lg:justify-end">
              {hero.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/creators/${c.username}`}
                  className={cn(
                    "relative block w-[30%] max-w-[210px] rounded-2xl bg-white p-2.5 pb-3 shadow-xl transition-transform hover:-translate-y-1",
                    i === 0 && "z-10 -mb-6 w-[38%] max-w-[250px] scale-105",
                    i === 1 && "-rotate-[5deg]",
                    i === 2 && "rotate-[5deg]",
                  )}
                  aria-label={t("{name} profili", { name: c.displayName })}
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
                    <CreatorPhoto src={c.avatarUrl ?? c.coverUrl} name={c.displayName} rounded="rounded-xl" />
                    <span className="absolute start-2 top-2 grid size-6 place-items-center rounded-full bg-brand-500 text-[11px] font-black text-white">{i + 1}</span>
                  </div>
                  <p className="mt-2 truncate text-xs font-extrabold">{c.displayName}</p>
                  <p className="text-[10px] text-muted">{t("{followers} takipçi", { followers: formatCompact(c.followers) })}</p>
                  {c.newFollowers > 0 && <p className="mt-0.5 text-[11px] font-black text-success">{t("+{followers} yeni takipçi", { followers: formatNumber(c.newFollowers) })}</p>}
                </Link>
              ))}
            </div>
          ) : undefined
        }
      />

      <Section id="top10" className="scroll-mt-24">
        <SectionTitle
          title={t("En Trend 10 AI İkiz")}
          icon={<Crown className="fill-brand-500" />}
          subtitle={t("Son 7 günde takip, sohbet ve profil görüntüleme etkileşimlerine göre sıralanır.")}
          action={<SeeAll href="/explore?sort=conversations" label={t("Tüm AI İkizleri")} />}
        />
        {trending.length ? (
          <ol className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            {trending.map((c, i) => {
              const label = trendLabel(c, t);
              return (
                <li key={c.id} className="hf-card flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-card-hover)]">
                  <Link href={`/creators/${c.username}`} className="relative block aspect-[4/5]" aria-label={t("{rank}. sıra: {name}", { rank: i + 1, name: c.displayName })}>
                    <CreatorPhoto src={c.avatarUrl ?? c.coverUrl} name={c.displayName} rounded="rounded-none" />
                    <span className="absolute start-2.5 top-2.5 grid size-7 place-items-center rounded-full bg-brand-500 text-xs font-black text-white shadow">{i + 1}</span>
                    <Badge tone={label.tone} size="sm" className="absolute end-2.5 top-2.5">
                      <Flame aria-hidden /> {label.text}
                    </Badge>
                    {c.isOnline && (
                      <span className="absolute bottom-2.5 start-2.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[9px] font-bold text-white backdrop-blur">
                        <span className="size-1.5 rounded-full bg-[#2ee59d]" /> {t("Çevrimiçi")}
                      </span>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="flex items-center gap-1 truncate text-[13px] font-extrabold">
                      {c.displayName} {c.verified && <Verified className="size-3.5" />}
                    </p>
                    <p className="text-[10px] text-muted">{t("{followers} takipçi", { followers: formatCompact(c.followers) })}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-ink-soft">
                      <MessageCircle className="size-3.5 text-brand-500" aria-hidden /> {t("{chats} sohbet", { chats: formatCompact(c.chats) })} <span className="font-normal text-muted">{t("(7 gün)")}</span>
                    </p>
                    <Link href={`/creators/${c.username}`} className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-full bg-brand-500 text-[11px] font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                      {t("Profili Gör")} <ArrowRight className="rtl:-scale-x-100 size-3.5" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <Card padded={false}>
            <EmptyState icon={<TrendingUp />} title={t("Henüz trend verisi bulunmuyor")} description={t("Trendler, son 7 gündeki takip, sohbet ve profil görüntüleme olaylarından hesaplanır. Etkileşim oluştukça burada görünecek.")} action={<Link href="/explore" className="inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white">{t("İçerik Üreticilerini Keşfet")}</Link>} />
          </Card>
        )}
      </Section>

      <Section className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <SectionTitle title={t("Hızla Yükselenler")} icon={<Rocket className="fill-brand-500" />} subtitle={t("Son 7 günde en çok yeni takipçi kazananlar.")} />
          {risers.length ? (
            <ol className="grid gap-3">
              {risers.map((c, i) => (
                <li key={c.id} className="hf-card flex items-center gap-3 p-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-black text-white">{i + 1}</span>
                  <Link href={`/creators/${c.username}`} className="size-12 shrink-0 overflow-hidden rounded-xl" aria-label={t("{name} profili", { name: c.displayName })}>
                    <CreatorPhoto src={c.avatarUrl} name={c.displayName} rounded="rounded-xl" showMonogram={false} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/creators/${c.username}`} className="flex items-center gap-1 truncate text-[13px] font-extrabold hover:text-brand-600">
                      {c.displayName} {c.verified && <Verified className="size-3.5" />}
                    </Link>
                    <p className="text-[11px] text-muted">{t("{followers} takipçi", { followers: formatCompact(c.followers) })}</p>
                  </div>
                  <div className="hidden text-end sm:block">
                    <p className="text-[11px] font-black text-success">+{formatNumber(c.newFollowers)}</p>
                    {c.growthPct !== null && <p className="text-[10px] font-bold text-success">↑ %{formatNumber(c.growthPct)}</p>}
                  </div>
                  <span className="hidden 2xl:block">
                    <Sparkline data={activity.get(c.id) ?? []} width={64} height={30} />
                  </span>
                  <FollowButton creatorId={c.id} initial={relations.following.has(c.id)} authed={authed} size="sm" />
                </li>
              ))}
            </ol>
          ) : (
            <Card padded={false}>
              <EmptyState compact title={t("Henüz yükselen kimse yok")} description={t("Yeni takipçi kazanımı oluştukça burada listelenir.")} />
            </Card>
          )}
        </div>

        <div>
          <SectionTitle title={t("En Çok Sohbet Edilenler")} icon={<MessageCircle className="fill-brand-500" />} subtitle={t("Son 7 günde en çok sohbet başlatılan AI ikizleri.")} />
          {chatters.length ? (
            <ol className="grid gap-3">
              {chatters.map((c, i) => (
                <li key={c.id} className="hf-card flex items-center gap-3 p-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-black text-white">{i + 1}</span>
                  <Link href={`/creators/${c.username}`} className="size-12 shrink-0 overflow-hidden rounded-xl" aria-label={t("{name} profili", { name: c.displayName })}>
                    <CreatorPhoto src={c.avatarUrl} name={c.displayName} rounded="rounded-xl" showMonogram={false} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-[13px] font-extrabold">
                      {c.displayName} {c.verified && <Verified className="size-3.5" />}
                      {c.isOnline && <span className="ms-auto text-[9px] font-bold text-success">{t("Canlı")}</span>}
                    </p>
                    <p className="text-[11px] text-muted">{t("{chats} sohbet", { chats: formatCompact(c.chats) })}</p>
                    <Progress value={(c.chats / maxChats) * 100} className="mt-1.5" label={t("{name} sohbet oranı", { name: c.displayName })} />
                  </div>
                  <Link href={c.twinLive ? `/chat/${c.username}` : `/creators/${c.username}`} className="shrink-0 rounded-full border border-brand-300 px-3.5 py-2 text-[11px] font-extrabold text-brand-600 hover:bg-brand-50">
                    {c.twinLive ? t("Sohbet Et") : t("Profil")}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <Card padded={false}>
              <EmptyState compact title={t("Henüz sohbet verisi yok")} description={t("Sohbetler başladıkça en çok konuşulan AI ikizleri burada görünür.")} />
            </Card>
          )}
        </div>

        <div>
          <SectionTitle
            title={t("Trend İstatistikleri")}
            icon={<BarChart3 />}
            subtitle={t("Son 30 gün")}
          />
          <Card>
            {summary.chats + summary.follows + summary.contentViews > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <StatCard label={t("Toplam Sohbet")} value={formatCompact(summary.chats)} icon={<MessageCircle />} className="!p-3" />
                  <StatCard label={t("Yeni Takipçi")} value={formatCompact(summary.follows)} icon={<Users />} tone="violet" className="!p-3" />
                  <StatCard label={t("Yayındaki AI İkizi")} value={formatNumber(summary.liveTwins)} icon={<Sparkles />} tone="teal" className="!p-3" />
                  <StatCard label={t("İçerik Görüntüleme")} value={formatCompact(summary.contentViews)} icon={<Flame />} tone="orange" className="!p-3" />
                </div>
                <p className="mb-1 mt-4 text-[11px] font-extrabold text-ink-soft">{t("Günlük sohbet mesajı")}</p>
                {hasSeries ? <TrendChart data={series} height={190} seriesLabel={t("Mesaj")} /> : <p className="py-6 text-center text-xs text-muted">{t("Bu dönemde günlük sohbet verisi yok.")}</p>}
              </>
            ) : (
              <EmptyState compact icon={<BarChart3 />} title={t("Henüz veri bulunmuyor")} description={t("Son 30 günde kayıtlı etkileşim yok.")} />
            )}
          </Card>
        </div>
      </Section>

      <Section>
        <SectionTitle title={t("Trend Kategoriler")} icon={<LayoutGrid />} subtitle={t("Şu anda en çok AI ikizi barındıran kategoriler.")} action={<SeeAll href="/categories" label={t("Tüm Kategoriler")} />} />
        {trendCats.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {trendCats.map((c) => (
              <Link key={c.slug} href={`/categories/${c.slug}`} className="group relative block aspect-[4/3] overflow-hidden rounded-2xl shadow-[var(--shadow-card)]">
                <CreatorPhoto src={c.coverUrl} name={t(c.name)} rounded="rounded-none" showMonogram={false} className="transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" aria-hidden />
                <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-white">
                  <span className="min-w-0">
                    <CategoryIcon name={c.icon} className="mb-1 size-4" />
                    <span className="block truncate text-sm font-extrabold">{t(c.name)}</span>
                    <span className="block text-[10px] text-white/85">{t("{twins} AI ikizi", { twins: formatNumber(c.liveTwinCount) })}</span>
                  </span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-brand-500">
                    <ArrowRight className="rtl:-scale-x-100 size-4" aria-hidden />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Card padded={false}>
            <EmptyState compact title={t("Henüz kategori bulunmuyor")} />
          </Card>
        )}
      </Section>
    </>
  );
}
