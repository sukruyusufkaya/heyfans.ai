import type { Metadata } from "next";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { z } from "zod";
import { CreatorCardTall } from "@/components/creator/creator-cards";
import { ContentTile } from "@/components/fan/content-parts";
import { LinkTabs, buildHref, flattenSearchParams } from "@/components/fan/link-tabs";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/display";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { getFavorites } from "@/services/fan/feed";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Favorilerim") };
}
export const dynamic = "force-dynamic";

const searchSchema = z.object({
  tab: z.enum(["creators", "contents"]).catch("creators"),
  sort: z.enum(["recent", "oldest", "name", "popular"]).catch("recent"),
});

const SORTS = [
  { key: "recent", label: m("Son eklenenler") },
  { key: "oldest", label: m("İlk eklenenler") },
  { key: "name", label: m("A–Z") },
  { key: "popular", label: m("En popüler") },
] as const;

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireUser("/app/favorites");
  const t = await getT();
  const sp = searchSchema.parse(flattenSearchParams(await searchParams));
  const data = await getFavorites({ id: user.id, roles: user.roles }, { tab: sp.tab, sort: sp.sort });
  const href = (tab: string, sort: string) => buildHref("/app/favorites", { tab: tab === "creators" ? null : tab, sort: sort === "recent" ? null : sort });

  return (
    <div className="mx-auto max-w-[1320px]">
      <PageHeader eyebrow={t("HEYFANS / FAN EXPERIENCE")} title={t("Favorilerim")} description={t("Sevdiğin AI ikizleri ve içerikler bir arada.")} />
      <Card padded={false} className="p-3">
        <LinkTabs
          label={t("Favori türü")}
          items={[
            { href: href("creators", sp.sort), label: t("Kaydettiğim üreticiler"), active: sp.tab === "creators", count: data.counts.creators },
            { href: href("contents", sp.sort), label: t("İçeriklerim"), active: sp.tab === "contents", count: data.counts.contents },
          ]}
        />
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold tracking-[-0.02em]">{sp.tab === "creators" ? t("Favori içerik üreticilerin") : t("Favori içeriklerin")}</h2>
        <nav aria-label={t("Sıralama")} className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="font-bold text-muted">{t("Sıralama:")}</span>
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={href(sp.tab, s.key)}
              scroll={false}
              aria-current={sp.sort === s.key ? "true" : undefined}
              className={cn("rounded-full px-2.5 py-1.5 font-extrabold", sp.sort === s.key ? "bg-brand-100 text-brand-600" : "text-muted-strong hover:bg-soft")}
            >
              {t(s.label)}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {sp.tab === "creators" ? (
          data.creators.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {data.creators.map((c) => (
                <CreatorCardTall key={c.id} creator={c} favorite authed cta={c.twinLive ? "chat" : "profile"} />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={<Heart />}
                title={t("Henüz favori içerik üreticin yok")}
                description={t("Kalp simgesine dokunarak sevdiğin içerik üreticilerini buraya kaydedebilirsin.")}
                action={
                  <Link href="/explore" className="inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                    {t("İçerik üreticilerini keşfet")}
                  </Link>
                }
              />
            </Card>
          )
        ) : data.contents.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {data.contents.map((p) => (
              <ContentTile key={p.id} post={p} favorite />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState icon={<Heart />} title={t("Henüz favori içeriğin yok")} description={t("Bir içeriğin kalp simgesine dokunarak onu buraya kaydedebilirsin.")} />
          </Card>
        )}
      </div>

      <Card className="hf-gradient-pink mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-strong">{t("Favorilerini tek yerden yönet. Kaydettiğin AI ikizlerine her an ulaş, sohbete kaldığın yerden devam et.")}</p>
        <Link href="/chat" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
          <MessageCircle className="size-4" /> {t("Sohbetlerine git")}
        </Link>
      </Card>
    </div>
  );
}
