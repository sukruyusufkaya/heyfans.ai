import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Users } from "lucide-react";
import { z } from "zod";
import { Verified } from "@/components/creator/creator-cards";
import { LinkTabs, buildHref, flattenSearchParams } from "@/components/fan/link-tabs";
import { PostCard } from "@/components/fan/content-parts";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader, Pagination } from "@/components/ui/display";
import { requireUser } from "@/lib/auth/session";
import { categoryLabel } from "@/components/creator/category-icon";
import { getFollowingFeed } from "@/services/fan/feed";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Takip Ettiklerim") };
}
export const dynamic = "force-dynamic";

const searchSchema = z.object({
  tab: z.enum(["all", "photo", "video", "ai"]).catch("all"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

const TABS = [
  { key: "all", label: m("Tüm gönderiler") },
  { key: "photo", label: m("Fotoğraflar") },
  { key: "video", label: m("Videolar") },
  { key: "ai", label: m("AI üretimi paylaşımlar") },
] as const;

export default async function FollowingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireUser("/app/following");
  const t = await getT();
  const sp = searchSchema.parse(flattenSearchParams(await searchParams));
  const feed = await getFollowingFeed({ id: user.id, roles: user.roles }, { tab: sp.tab, page: sp.page });
  const favs = new Set(feed.favoriteIds);

  return (
    <div className="mx-auto max-w-[1320px]">
      <PageHeader eyebrow={t("HEYFANS / FAN EXPERIENCE")} title={t("Takip Ettiklerim")} description={t("Takip ettiğin içerik üreticilerinin son paylaşımları ve güncellemeleri.")} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-4">
          <Card padded={false} className="p-3">
            <LinkTabs label={t("Paylaşım filtresi")} items={TABS.map((tab) => ({ href: buildHref("/app/following", { tab: tab.key === "all" ? null : tab.key }), label: t(tab.label), active: sp.tab === tab.key }))} />
          </Card>
          {feed.posts.length ? (
            <>
              {feed.posts.map((p) => (
                <PostCard key={p.id} post={p} favorite={favs.has(p.id)} />
              ))}
              <Pagination page={feed.page} pageCount={feed.pageCount} hrefFor={(n) => buildHref("/app/following", { tab: sp.tab === "all" ? null : sp.tab, page: n > 1 ? n : null })} />
            </>
          ) : (
            <Card>
              {feed.followedCount === 0 ? (
                <EmptyState
                  icon={<Users />}
                  title={t("Henüz kimseyi takip etmiyorsun")}
                  description={t("İçerik üreticilerini takip et; paylaşımları, yeni içerikleri ve AI ikizi güncellemelerini burada gör.")}
                  action={
                    <Link href="/explore" className="inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                      {t("İçerik üreticilerini keşfet")}
                    </Link>
                  }
                />
              ) : (
                <EmptyState title={t("Bu filtreyle paylaşım bulunamadı")} description={t("Başka bir sekmeyi dene ya da takip ettiklerin yeni içerik paylaştığında tekrar bak.")} />
              )}
            </Card>
          )}
        </div>

        <aside className="grid content-start gap-4" aria-label={t("Takip edilenler")}>
          <Card>
            <CardHeader title={t("Takip ettiklerin")} action={<Badge tone="pink">{t("{count} kişi", { count: feed.followedCount })}</Badge>} />
            {feed.followed.length ? (
              <ul className="-mx-2 max-h-[420px] overflow-y-auto scrollbar-thin">
                {feed.followed.map((c) => (
                  <li key={c.id}>
                    <Link href={`/creators/${c.username}`} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-soft">
                      <Avatar src={c.avatarUrl} name={c.displayName} size={38} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 truncate text-xs font-extrabold">
                          {c.displayName} {c.verified && <Verified className="size-3.5" />}
                        </span>
                        <span className="block truncate text-[10px] text-muted">
                          {c.category ? `${t(categoryLabel(c.category))} · ` : ""}
                          {c.hasNew ? t("yeni içerik") : t("takip ediliyor")}
                        </span>
                      </span>
                      {c.hasNew && (
                        <Badge tone="pink" size="sm">
                          {t("Yeni")}
                        </Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-xs text-muted">{t("Takip listen boş.")}</p>
            )}
          </Card>
          <div className="hf-card hf-gradient-pink p-5">
            <p className="eyebrow">{t("SANA ÖZEL ÖNERİ")}</p>
            <p className="mt-2 text-[15px] font-extrabold leading-snug tracking-[-0.02em]">{t("Daha fazla insan, daha fazla hikâye.")}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-strong">{t("Takip ettiğin içerik üreticilerine benzeyen yeni AI ikizlerini keşfet.")}</p>
            <Link href="/explore" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
              <Compass className="size-4" /> {t("Keşfetmeye başla")}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
