import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown, ImageIcon, MessageCircle } from "lucide-react";
import { z } from "zod";
import { categoryLabel } from "@/components/creator/category-icon";
import { Verified } from "@/components/creator/creator-cards";
import { FollowButton } from "@/components/creator/social-buttons";
import { ContentTile } from "@/components/fan/content-parts";
import { LinkTabs, buildHref, flattenSearchParams } from "@/components/fan/link-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, EmptyState, Pagination } from "@/components/ui/display";
import { requireUser } from "@/lib/auth/session";
import { usernameSchema } from "@/lib/validation/common";
import { getCreatorGallery } from "@/services/fan/posts";
import { getFormatters, getT } from "@/i18n/server";
import { m } from "@/i18n/m";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("İçerik Galerisi") };
}
export const dynamic = "force-dynamic";

const searchSchema = z.object({
  type: z.enum(["all", "photo", "video", "audio", "text", "ai"]).catch("all"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

const TABS = [
  { key: "all", label: m("Tüm içerikler") },
  { key: "photo", label: m("Fotoğraflar") },
  { key: "video", label: m("Videolar") },
  { key: "ai", label: m("AI görselleri") },
  { key: "audio", label: m("Ses kayıtları") },
  { key: "text", label: m("Yazılar") },
] as const;

export default async function GalleryPage({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { username: raw } = await params;
  const t = await getT();
  const { formatCompact } = await getFormatters();
  const parsedName = usernameSchema.safeParse(raw);
  if (!parsedName.success) notFound();
  const { user } = await requireUser(`/creators/${raw}/content`);
  const sp = searchSchema.parse(flattenSearchParams(await searchParams));
  const g = await getCreatorGallery({ id: user.id, roles: user.roles }, parsedName.data, { filter: sp.type, page: sp.page });
  if (!g) notFound();
  const base = `/creators/${g.creator.username}/content`;
  const favs = new Set(g.favoriteIds);

  return (
    <div className="mx-auto max-w-[1320px]">
      <div className="mb-5">
        <p className="eyebrow mb-2">{t("HEYFANS / FAN EXPERIENCE")}</p>
        <h1 className="text-[26px] font-black leading-[1.08] tracking-[-0.035em] text-ink sm:text-[30px]">{t("İçerik Galerisi")}</h1>
        <p className="mt-2 text-xs text-muted">{t("{name} adlı içerik üreticisinin fotoğraf, video ve özel deneyimlerini keşfet.", { name: g.creator.displayName })}</p>
      </div>

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Link href={`/creators/${g.creator.username}`} aria-label={t("{name} profili", { name: g.creator.displayName })}>
            <Avatar src={g.creator.avatarUrl} name={g.creator.displayName} size={64} />
          </Link>
          <div className="min-w-0">
            <Link href={`/creators/${g.creator.username}`} className="flex items-center gap-1.5 text-lg font-black tracking-[-0.03em] hover:text-brand-600">
              {g.creator.displayName} {g.creator.verified && <Verified className="size-5" />}
            </Link>
            <p className="mt-1 text-xs text-muted">
              {t("{count} takipçi", { count: formatCompact(g.creator.followers) })}
              {g.creator.categories.length ? ` · ${g.creator.categories.slice(0, 2).map((c) => t(categoryLabel(c))).join(" & ")}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {!g.creator.isOwner && <FollowButton creatorId={g.creator.id} initial={g.following} authed />}
          <Button asChild variant="outline" shape="pill">
            <Link href={`/creators/${g.creator.username}/membership`}>
              <Crown /> {t("Üyelik planları")}
            </Link>
          </Button>
          <Button asChild shape="pill">
            <Link href={`/chat/${g.creator.username}`}>
              <MessageCircle /> {t("AI ikiziyle sohbet et")}
            </Link>
          </Button>
        </div>
      </Card>

      <Card padded={false} className="mt-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <LinkTabs label={t("İçerik türü")} items={TABS.map((tab) => ({ href: buildHref(base, { type: tab.key === "all" ? null : tab.key }), label: t(tab.label), active: sp.type === tab.key }))} />
        <p className="shrink-0 px-1 text-[11px] font-bold text-muted">{t("Toplam {count} paylaşım", { count: g.totalAll })}</p>
      </Card>

      {g.featured.length > 0 && (
        <section className="mt-6" aria-labelledby="featured">
          <h2 id="featured" className="mb-3 text-lg font-extrabold tracking-[-0.02em]">
            {t("Öne çıkan içerikler")}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {g.featured.map((p) => (
              <ContentTile key={p.id} post={p} big favorite={favs.has(p.id)} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-6" aria-labelledby="all-content">
        <h2 id="all-content" className="mb-3 text-lg font-extrabold tracking-[-0.02em]">
          {sp.type === "all" ? t("Tüm içerikler") : t(TABS.find((tab) => tab.key === sp.type)?.label ?? m("İçerikler"))}
        </h2>
        {g.items.length ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {g.items.map((p) => (
                <ContentTile key={p.id} post={p} favorite={favs.has(p.id)} />
              ))}
            </div>
            <Pagination className="mt-6" page={g.page} pageCount={g.pageCount} hrefFor={(n) => buildHref(base, { type: sp.type === "all" ? null : sp.type, page: n > 1 ? n : null })} />
          </>
        ) : (
          <Card>
            <EmptyState
              icon={<ImageIcon />}
              title={g.totalAll ? t("Bu türde içerik bulunamadı") : t("Henüz içerik paylaşılmamış")}
              description={g.totalAll ? t("Başka bir içerik türünü deneyebilirsin.") : t("{name} yeni içerikler paylaştığında burada görünecek.", { name: g.creator.displayName })}
            />
          </Card>
        )}
      </section>
    </div>
  );
}
