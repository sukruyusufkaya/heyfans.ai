import type { Metadata } from "next";
import Link from "next/link";
import { Eye, FileStack, Lock, Plus, Search, Wallet } from "lucide-react";
import { StudioCover } from "@/components/studio/content-cover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Pagination, StatCard, PageHeader } from "@/components/ui/display";
import { Input, NativeSelect } from "@/components/ui/form-controls";
import { STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { ContentActionsMenu } from "@/features/studio/content-actions-menu";
import { ACCESS_LABEL, CONTENT_STATUS_TONE, CONTENT_TYPE_LABELS, TIER_LABEL } from "@/features/studio/labels";
import { m } from "@/i18n/m";
import { getFormatters, getT } from "@/i18n/server";
import { requireCreator } from "@/lib/auth/session";
import { CONTENT_STATUS_LABELS } from "@/lib/state-machines";
import { cn } from "@/lib/utils";
import { getContentLibrary, libraryQuerySchema, publishDueScheduled } from "@/services/studio/content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("İçerik Kütüphanesi") };
}

const STATUS_TABS = [
  { key: "all", label: m("Tüm içerikler") },
  { key: "published", label: m("Yayında") },
  { key: "draft", label: m("Taslaklar") },
  { key: "in_review", label: m("İncelemede") },
  { key: "hidden", label: m("Gizli") },
  { key: "removed", label: m("Kaldırılan") },
] as const;

export default async function ContentLibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const { formatCompact, formatDate, formatMoney, formatNumber } = await getFormatters();
  const { user } = await requireCreator();
  const raw = await searchParams;
  const first = (k: string) => (Array.isArray(raw[k]) ? raw[k]![0] : raw[k]);
  const query = libraryQuerySchema.parse({ status: first("status"), type: first("type"), q: first("q"), page: first("page") });
  await publishDueScheduled(user.id);
  const lib = await getContentLibrary(user.id, query);

  const href = (over: Partial<typeof query>) => {
    const p = new URLSearchParams();
    const merged = { ...query, ...over };
    if (merged.status !== "all") p.set("status", merged.status);
    if (merged.type !== "all") p.set("type", merged.type);
    if (merged.q) p.set("q", merged.q);
    if (merged.page > 1) p.set("page", String(merged.page));
    const s = p.toString();
    return `/studio/content${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow={STUDIO_EYEBROW}
        title={t("İçerik Kütüphanesi")}
        description={t("Fotoğraf, video, ses ve özel içeriklerini tek panelden yönet.")}
        actions={
          <Button asChild>
            <Link href="/studio/content/new">
              <Plus /> {t("Yeni içerik oluştur")}
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label={t("Durum filtresi")} className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => {
            const n = tab.key === "all" ? lib.counts.all : lib.counts[tab.key] ?? 0;
            const on = query.status === tab.key;
            return (
              <Link key={tab.key} href={href({ status: tab.key, page: 1 })} aria-current={on ? "page" : undefined} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-extrabold transition-colors", on ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink")}>
                {t(tab.label)}
                <span className={cn("rounded-full px-1.5 text-[9px]", on ? "bg-white/25" : "bg-white")}>{n}</span>
              </Link>
            );
          })}
        </nav>
        <form method="get" action="/studio/content" role="search" className="flex flex-wrap items-center gap-2">
          {query.status !== "all" && <input type="hidden" name="status" value={query.status} />}
          <label className="sr-only" htmlFor="lib-type">
            {t("İçerik türü")}
          </label>
          <NativeSelect id="lib-type" name="type" defaultValue={query.type} className="h-10 w-36">
            <option value="all">{t("Tüm türler")}</option>
            <option value="photo">{t("Fotoğraf")}</option>
            <option value="video">{t("Video")}</option>
            <option value="audio">{t("Ses")}</option>
            <option value="text">{t("Metin")}</option>
          </NativeSelect>
          <div className="w-44 sm:w-56">
            <label className="sr-only" htmlFor="lib-q">
              {t("İçeriklerde ara")}
            </label>
            <Input id="lib-q" name="q" defaultValue={query.q} placeholder={t("Başlıkta ara…")} leftIcon={<Search />} className="h-10" />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="h-10">
            {t("Uygula")}
          </Button>
        </form>
      </div>

      {lib.items.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {lib.items.map(({ item, cover }) => {
            const id = item._id.toString();
            const premium = item.access === "subscribers" || item.access === "purchase";
            const when = item.status === "draft" && item.scheduledAt ? t("Zamanlandı: {date}", { date: formatDate(item.scheduledAt) }) : item.publishedAt ? t("Yayın: {date}", { date: formatDate(item.publishedAt) }) : t("Oluşturma: {date}", { date: formatDate(item.createdAt) });
            return (
              <li key={id}>
                <Card padded={false} className="overflow-hidden">
                  <div className="relative aspect-[4/3] bg-soft">
                    <StudioCover src={cover} title={item.title} type={item.type} />
                    <Badge tone="white" size="sm" className="absolute start-3 top-3">
                      {CONTENT_TYPE_LABELS[item.type] ? t(CONTENT_TYPE_LABELS[item.type]!) : item.type}
                    </Badge>
                    {item.isAiGenerated && (
                      <Badge tone="violet" size="sm" className="absolute end-3 top-3">
                        {t("AI")}
                      </Badge>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-3 pt-8">
                      <p className="truncate text-[12px] font-extrabold text-white">{item.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <Badge tone={CONTENT_STATUS_TONE[item.status] ?? "gray"} size="sm">
                        {t(CONTENT_STATUS_LABELS[item.status])}
                      </Badge>
                      {premium && (
                        <Badge tone="pink" size="sm">
                          <Lock /> {item.access === "purchase" ? formatMoney(item.price?.amountMinor ?? 0) : item.minPlanTier ? t(TIER_LABEL[item.minPlanTier]!) : t("Premium")}
                        </Badge>
                      )}
                      {!premium && item.access === "followers" && (
                        <Badge tone="gray" size="sm">
                          {t("Takipçi")}
                        </Badge>
                      )}
                    </div>
                    <ContentActionsMenu id={id} title={item.title} status={item.status} />
                  </div>
                  <p className="border-t border-line-soft px-3 py-2 text-[10px] text-muted">
                    {t(item.moderation.state === "pending" ? "{when} · {views} görüntüleme · moderasyon bekliyor" : item.moderation.state === "flagged" ? "{when} · {views} görüntüleme · işaretlendi" : "{when} · {views} görüntüleme", { when, views: formatCompact(item.stats.views) })}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card>
          <EmptyState
            icon={<FileStack />}
            title={t(lib.counts.all ? "Bu filtreyle içerik bulunamadı" : "Henüz içerik yok")}
            description={t(lib.counts.all ? "Filtreleri değiştirmeyi dene." : "İlk içeriğini oluşturup hayranlarınla paylaş.")}
            action={
              <Button asChild size="sm">
                <Link href="/studio/content/new">
                  <Plus /> {t("Yeni içerik oluştur")}
                </Link>
              </Button>
            }
          />
        </Card>
      )}
      <Pagination page={lib.page} pageCount={lib.pageCount} hrefFor={(p) => href({ page: p })} className="mt-6" />

      <section aria-label={t("İçerik istatistikleri")} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("Toplam içerik")} icon={<FileStack />} value={formatNumber(lib.counts.all - (lib.counts.removed ?? 0))} />
        <StatCard label={t("Premium içerik")} icon={<Lock />} tone="violet" value={formatNumber(lib.totals.premium)} />
        <StatCard label={t("Toplam görüntüleme")} icon={<Eye />} tone="teal" value={formatCompact(lib.totals.views)} />
        <StatCard label={t("İçerik geliri (brüt)")} icon={<Wallet />} tone="green" value={formatMoney(lib.totals.revenueMinor)} foot={t("{count, number} satın alma", { count: lib.totals.purchases })} />
      </section>
    </div>
  );
}
