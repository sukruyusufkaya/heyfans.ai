import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Bot, Crown, Heart, ImageIcon, LayoutGrid, MessageCircle, Radio, Users, FileText, Pencil, Sparkles } from "lucide-react";
import { z } from "zod";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { Verified } from "@/components/creator/creator-cards";
import { FollowButton } from "@/components/creator/social-buttons";
import { AiTwinLabel, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DemoDataNotice, EmptyState, Pagination } from "@/components/ui/display";
import { isDemo } from "@/config/env";
import { AboutCard, PlansCard, PostGrid, SeeAllLink, TwinTeaserCard, TYPE_LABELS } from "@/features/public/profile-sections";
import { ProfileMenu } from "@/features/public/profile-menu";
import { SocialIcon, socialHref, socialLabel } from "@/features/public/social-icon";
import { getSession } from "@/lib/auth/session";
import { aiStatus } from "@/lib/ai/provider";
import { cn, formatCompact, formatNumber } from "@/lib/utils";
import { activeTierFor } from "@/services/content/access";
import { viewerRelations } from "@/services/creators/public";
import { getPublicCreator, listCreatorPosts, POST_TYPES, recordProfileView } from "@/services/public/profile";
import { siteConfig } from "@/config/site";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const TABS = [
  { key: "overview", label: "Genel Bakış", icon: LayoutGrid },
  { key: "posts", label: "Gönderiler", icon: FileText },
  { key: "media", label: "Medya", icon: ImageIcon },
  { key: "twin", label: "AI İkizi", icon: Bot },
  { key: "plans", label: "Abonelikler", icon: Crown },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const querySchema = z.object({
  tab: z.enum(["overview", "posts", "media", "twin", "plans"]).catch("overview"),
  type: z.enum(POST_TYPES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const c = await getPublicCreator(username);
  if (!c) return { title: "İçerik üreticisi bulunamadı", robots: { index: false } };
  const title = `${c.displayName} (@${c.username}) — ${c.twin?.live ? "AI İkizi ve Özel İçerikler" : "Profil ve Özel İçerikler"}`;
  const description = (c.headline ? `${c.headline}. ` : "") + (c.bio ? c.bio.slice(0, 150) : `${c.displayName} HEYFANS'ta. Takip et, abone ol ve özel içeriklere eriş.`);
  const image = c.coverUrl ?? c.avatarUrl;
  return {
    title,
    description,
    alternates: { canonical: `/creators/${c.username}` },
    openGraph: { title: `${c.displayName} | HEYFANS`, description, url: `/creators/${c.username}`, type: "profile", images: image ? [{ url: image, alt: c.displayName }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title: `${c.displayName} | HEYFANS`, description },
  };
}

export default async function CreatorProfilePage({ params, searchParams }: Props) {
  const [{ username }, sp] = await Promise.all([params, searchParams]);
  const creator = await getPublicCreator(username);
  if (!creator) notFound();
  const { tab, type, page } = querySchema.parse({ tab: sp.tab, type: sp.type, page: sp.page });

  const session = await getSession();
  const viewer = session ? { id: session.user.id, roles: session.user.roles } : null;
  const isOwner = session?.user.id === creator.ownerUserId;
  const ai = aiStatus();

  // Profil görüntüleme olayı yanıtı geciktirmez (Trendler bunu kullanır)
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  const ua = h.get("user-agent");
  after(() => recordProfileView({ creatorId: creator.id, ownerUserId: creator.ownerUserId, viewerUserId: session?.user.id ?? null, ip, userAgent: ua }).catch((e) => console.error("[profile_view]", e)));

  const postsQuery = tab === "overview" ? { pageSize: 6 } : tab === "media" ? { types: ["photo", "video"], page, pageSize: 12 } : tab === "posts" ? { types: type ? [type] : undefined, page, pageSize: 12 } : null;
  const [relations, activeTier, posts] = await Promise.all([
    viewerRelations(session?.user.id, [creator.id]),
    session ? activeTierFor(session.user.id, creator.id) : Promise.resolve("free"),
    postsQuery ? listCreatorPosts(viewer, creator.id, postsQuery) : Promise.resolve(null),
  ]);
  const following = relations.following.has(creator.id);
  const demo = isDemo() && creator.isDemo;
  const hrefFor = (t: TabKey, extra?: Record<string, string>) => {
    const p = new URLSearchParams();
    if (t !== "overview") p.set("tab", t);
    for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v);
    const qs = p.toString();
    return `/creators/${creator.username}${qs ? `?${qs}` : ""}`;
  };

  const socials = creator.socialLinks.map((s) => ({ ...s, href: socialHref(s) })).filter((s) => s.href);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    dateCreated: creator.createdAt,
    mainEntity: {
      "@type": "Person",
      name: creator.displayName,
      alternateName: `@${creator.username}`,
      description: creator.headline ?? undefined,
      image: creator.avatarUrl ?? undefined,
      url: `${siteConfig.url}/creators/${creator.username}`,
      sameAs: socials.map((s) => s.href),
      interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/FollowAction", userInteractionCount: creator.stats.followers },
    },
  };

  const stats = [
    { icon: Users, value: formatCompact(creator.stats.followers), label: "Takipçi" },
    { icon: FileText, value: formatCompact(creator.stats.posts), label: "Gönderi" },
    { icon: Heart, value: formatCompact(creator.stats.likes), label: "Beğeni" },
    { icon: MessageCircle, value: formatCompact(creator.stats.conversations), label: "Sohbet" },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Kapak */}
      <div className="relative h-[170px] overflow-hidden sm:h-[230px] lg:h-[290px]">
        <CreatorPhoto src={creator.coverUrl} name={creator.displayName} rounded="rounded-none" showMonogram={false} priority />
        <span className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent" aria-hidden />
      </div>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Başlık */}
        <header className="relative -mt-14 flex flex-col gap-5 sm:-mt-20 lg:flex-row lg:items-end lg:gap-7">
          <div className="relative size-[112px] shrink-0 sm:size-[150px]">
            <span className="block size-full overflow-hidden rounded-full border-[5px] border-white bg-white shadow-xl">
              <CreatorPhoto src={creator.avatarUrl} name={creator.displayName} rounded="rounded-full" priority />
            </span>
            {creator.isOnline && <span className="absolute bottom-2 right-2 size-5 rounded-full border-[3px] border-white bg-success" role="img" aria-label="Çevrimiçi" />}
          </div>

          <div className="min-w-0 flex-1 lg:pb-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="flex items-center gap-2 font-display text-[28px] font-extrabold leading-tight tracking-[-0.04em] sm:text-4xl">
                {creator.displayName} {creator.verified && <Verified className="size-6 sm:size-7" />}
              </h1>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-muted-strong">@{creator.username}</span>
              {creator.isOnline && (
                <Badge tone="green" size="md" dot>
                  Şu anda çevrimiçi
                </Badge>
              )}
              {creator.twin?.live && <AiTwinLabel size="md" />}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 lg:pb-3">
            {isOwner ? (
              <Button asChild variant="outline" shape="pill" size="lg">
                <Link href="/studio/profile">
                  <Pencil /> Profilimi Düzenle
                </Link>
              </Button>
            ) : (
              <FollowButton creatorId={creator.id} initial={following} authed={Boolean(session)} size="lg" />
            )}
            {creator.twin?.live && ai.available ? (
              <Button asChild variant="outline" shape="pill" size="lg">
                <Link href={`/chat/${creator.username}`}>
                  <MessageCircle /> AI İkizimle Sohbet Et
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" shape="pill" size="lg" disabled title={creator.twin?.live ? "AI sohbeti şu anda kullanılamıyor" : "AI ikizi henüz yayında değil"}>
                <MessageCircle /> {creator.twin?.live ? "AI Sohbeti Kullanılamıyor" : "AI İkizi Yayında Değil"}
              </Button>
            )}
            <ProfileMenu creatorId={creator.id} username={creator.username} displayName={creator.displayName} authed={Boolean(session)} />
          </div>
        </header>

        {/* Biyografi + istatistik */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="min-w-0">
            {creator.headline && <p className="text-sm font-extrabold text-ink-soft">{creator.headline}</p>}
            {creator.bio && <p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-ink-soft">{creator.bio}</p>}
            <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold">
              {creator.location && <li className="text-muted-strong">{creator.location}</li>}
              {socials.map((s) => (
                <li key={`${s.platform}-${s.handle}`}>
                  <a href={s.href!} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1.5 text-brand-600 hover:underline" aria-label={`${creator.displayName} ${socialLabel(s.platform)} hesabı (yeni sekmede açılır)`}>
                    <SocialIcon platform={s.platform} /> {socialLabel(s.platform)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:flex lg:gap-8">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <s.icon className="size-6 text-brand-500" aria-hidden />
                  <div>
                    <dt className="sr-only">{s.label}</dt>
                    <dd className="font-display text-lg font-extrabold leading-tight">{s.value}</dd>
                    <dd className="text-[11px] text-muted-strong" aria-hidden>
                      {s.label}
                    </dd>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2.5">
                <Radio className={cn("size-6", creator.isOnline ? "text-success" : "text-muted")} aria-hidden />
                <div>
                  <dt className="sr-only">Durum</dt>
                  <dd className="font-display text-lg font-extrabold leading-tight">{creator.isOnline ? "Çevrimiçi" : "Çevrimdışı"}</dd>
                  <dd className="text-[11px] text-muted-strong" aria-hidden>
                    Şu anda
                  </dd>
                </div>
              </div>
            </dl>
            {demo && <DemoDataNotice className="mt-3">Demo ortam: sayılar örnek veridir</DemoDataNotice>}
          </div>
        </div>

        {isOwner && (
          <p role="note" className="mt-5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs text-brand-700">
            Bu, profilinin herkese açık görünümü. Değişiklik yapmak için <Link href="/studio/profile" className="font-extrabold underline">Profil Düzenleyici</Link>&apos;yi kullan.
          </p>
        )}

        {/* Sekmeler */}
        <nav aria-label="Profil bölümleri" className="no-scrollbar mt-6 flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={hrefFor(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
              className={cn("-mb-px inline-flex shrink-0 items-center gap-2 border-b-[3px] px-4 py-3.5 text-sm font-extrabold transition-colors", tab === t.key ? "border-brand-500 text-brand-600" : "border-transparent text-ink-soft hover:text-brand-600")}
            >
              <t.icon className="size-[18px]" aria-hidden /> {t.label}
            </Link>
          ))}
        </nav>

        <div className="py-6 lg:py-8">
          {tab === "overview" && (
            <div className="grid gap-5">
              <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)]">
                <TwinTeaserCard creator={creator} ai={{ available: ai.available, mock: ai.mock }} />
                <PlansCard creator={creator} activeTier={activeTier} isOwner={isOwner} />
                <AboutCard creator={creator} />
              </div>
              <section aria-labelledby="recent-posts">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 id="recent-posts" className="flex items-center gap-2.5 text-xl font-extrabold tracking-[-0.03em]">
                    <ImageIcon className="size-6 text-brand-500" aria-hidden /> Son Gönderiler
                  </h2>
                  {posts && posts.total > 0 && <SeeAllLink href={hrefFor("posts")}>Tüm Gönderileri Gör</SeeAllLink>}
                </div>
                {posts?.items.length ? <PostGrid posts={posts.items} /> : <PostsEmpty name={creator.displayName} />}
              </section>
            </div>
          )}

          {(tab === "posts" || tab === "media") && posts && (
            <section aria-labelledby="posts-title">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 id="posts-title" className="text-xl font-extrabold tracking-[-0.03em]">
                  {tab === "media" ? "Medya" : "Gönderiler"} <span className="text-sm font-bold text-muted">({formatNumber(posts.total)})</span>
                </h2>
                {tab === "posts" && (
                  <nav aria-label="İçerik türü" className="no-scrollbar flex gap-1.5 overflow-x-auto">
                    <TypeChip href={hrefFor("posts")} active={!type} label="Tümü" />
                    {POST_TYPES.map((t) => (
                      <TypeChip key={t} href={hrefFor("posts", { type: t })} active={type === t} label={TYPE_LABELS[t] ?? t} />
                    ))}
                  </nav>
                )}
              </div>
              {posts.items.length ? (
                <>
                  <PostGrid posts={posts.items} className="xl:grid-cols-6" />
                  <Pagination className="mt-8" page={posts.page} pageCount={posts.pageCount} hrefFor={(p) => hrefFor(tab, { ...(type ? { type } : {}), ...(p > 1 ? { page: String(p) } : {}) })} />
                </>
              ) : (
                <PostsEmpty name={creator.displayName} filtered={Boolean(type)} />
              )}
            </section>
          )}

          {tab === "twin" && (
            <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
              <TwinTeaserCard creator={creator} ai={{ available: ai.available, mock: ai.mock }} />
              <Card>
                <h2 className="mb-3 flex items-center gap-2.5 text-[15px] font-extrabold">
                  <Sparkles className="size-[18px] text-brand-500" aria-hidden /> AI İkizi Hakkında
                </h2>
                {creator.twin?.live ? (
                  <div className="grid gap-4 text-xs leading-relaxed text-ink-soft">
                    {creator.twin.shortBio && <p>{creator.twin.shortBio}</p>}
                    <ul className="grid gap-2">
                      <li>
                        <b className="text-ink">Sohbet:</b> {creator.twin.features.chat ? "Açık" : "Kapalı"}
                      </li>
                      <li>
                        <b className="text-ink">Sesli görüşme:</b> {creator.twin.features.voice ? "Açık" : "Kapalı"}
                      </li>
                      <li>
                        <b className="text-ink">Görüntülü görüşme:</b> {creator.twin.features.video ? "Açık" : "Kapalı"}
                      </li>
                      <li>
                        <b className="text-ink">Ücretlendirme:</b> günde {creator.twin.freeMessagesPerDay} ücretsiz mesaj, sonrası mesaj başına {creator.twin.messageCredits} kredi
                      </li>
                    </ul>
                    <p className="rounded-xl bg-soft p-3.5">
                      Bu AI ikizi, {creator.displayName} adlı içerik üreticisinin açık izniyle, onayladığı kişilik ayarları ve bilgi kaynaklarıyla çalışır. Yanıtlar yapay zekâ tarafından üretilir, gerçek kişi tarafından yazılmaz ve hatalı olabilir.{" "}
                      <Link href="/trust-and-safety" className="font-extrabold text-brand-600 hover:underline">
                        Güven yaklaşımımız
                      </Link>
                    </p>
                  </div>
                ) : (
                  <EmptyState compact icon={<Bot />} title="AI ikizi yayında değil" description="İçerik üreticisi AI ikizini yayına aldığında burada ayrıntıları görünür." />
                )}
              </Card>
            </div>
          )}

          {tab === "plans" && (
            <div className="mx-auto max-w-5xl">
              <PlansCard creator={creator} activeTier={activeTier} isOwner={isOwner} full />
              <p className="mt-4 text-center text-[11px] text-muted">Abonelikler dönem sonunda iptal edilebilir. Fiyatlar KDV dahildir; ödeme sayfasında net tutar gösterilir.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function TypeChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} aria-current={active ? "true" : undefined} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold", active ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink")}>
      {label}
    </Link>
  );
}

function PostsEmpty({ name, filtered }: { name: string; filtered?: boolean }) {
  return (
    <Card padded={false}>
      <EmptyState icon={<ImageIcon />} title={filtered ? "Bu türde gönderi yok" : "Henüz gönderi yok"} description={filtered ? "Başka bir içerik türü seçmeyi dene." : `${name} yeni içerik paylaştığında burada göreceksin.`} />
    </Card>
  );
}
