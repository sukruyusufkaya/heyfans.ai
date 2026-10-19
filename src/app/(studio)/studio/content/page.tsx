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
import { requireCreator } from "@/lib/auth/session";
import { CONTENT_STATUS_LABELS } from "@/lib/state-machines";
import { cn, formatCompact, formatDate, formatMoney, formatNumber } from "@/lib/utils";
import { getContentLibrary, libraryQuerySchema, publishDueScheduled } from "@/services/studio/content";

export const metadata: Metadata = { title: "İçerik Kütüphanesi" };

const STATUS_TABS = [
  { key: "all", label: "Tüm içerikler" },
  { key: "published", label: "Yayında" },
  { key: "draft", label: "Taslaklar" },
  { key: "in_review", label: "İncelemede" },
  { key: "hidden", label: "Gizli" },
  { key: "removed", label: "Kaldırılan" },
] as const;

export default async function ContentLibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireCreator();
  const raw = await searchParams;
  const first = (k: string) => (Array.isArray(raw[k]) ? raw[k]![0] : raw[k]);
  const query = libraryQuerySchema.parse({ status: first("status"), type: first("type"), q: first("q"), page: first("page") });
  await publishDueScheduled(user.id);
  const lib = await getContentLibrary(user.id, query);

  const href = (over: Partial<typeof query>) => {
    const p = new URLSearchParams();
    const m = { ...query, ...over };
    if (m.status !== "all") p.set("status", m.status);
    if (m.type !== "all") p.set("type", m.type);
    if (m.q) p.set("q", m.q);
    if (m.page > 1) p.set("page", String(m.page));
    const s = p.toString();
    return `/studio/content${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow={STUDIO_EYEBROW}
        title="İçerik Kütüphanesi"
        description="Fotoğraf, video, ses ve özel içeriklerini tek panelden yönet."
        actions={
          <Button asChild>
            <Link href="/studio/content/new">
              <Plus /> Yeni içerik oluştur
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Durum filtresi" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((t) => {
            const n = t.key === "all" ? lib.counts.all : lib.counts[t.key] ?? 0;
            const on = query.status === t.key;
            return (
              <Link key={t.key} href={href({ status: t.key, page: 1 })} aria-current={on ? "page" : undefined} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-extrabold transition-colors", on ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink")}>
                {t.label}
                <span className={cn("rounded-full px-1.5 text-[9px]", on ? "bg-white/25" : "bg-white")}>{n}</span>
              </Link>
            );
          })}
        </nav>
        <form method="get" action="/studio/content" role="search" className="flex flex-wrap items-center gap-2">
          {query.status !== "all" && <input type="hidden" name="status" value={query.status} />}
          <label className="sr-only" htmlFor="lib-type">
            İçerik türü
          </label>
          <NativeSelect id="lib-type" name="type" defaultValue={query.type} className="h-10 w-36">
            <option value="all">Tüm türler</option>
            <option value="photo">Fotoğraf</option>
            <option value="video">Video</option>
            <option value="audio">Ses</option>
            <option value="text">Metin</option>
          </NativeSelect>
          <div className="w-44 sm:w-56">
            <label className="sr-only" htmlFor="lib-q">
              İçeriklerde ara
            </label>
            <Input id="lib-q" name="q" defaultValue={query.q} placeholder="Başlıkta ara…" leftIcon={<Search />} className="h-10" />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="h-10">
            Uygula
          </Button>
        </form>
      </div>

      {lib.items.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {lib.items.map(({ item, cover }) => {
            const id = item._id.toString();
            const premium = item.access === "subscribers" || item.access === "purchase";
            return (
              <li key={id}>
                <Card padded={false} className="overflow-hidden">
                  <div className="relative aspect-[4/3] bg-soft">
                    <StudioCover src={cover} title={item.title} type={item.type} />
                    <Badge tone="white" size="sm" className="absolute left-3 top-3">
                      {CONTENT_TYPE_LABELS[item.type] ?? item.type}
                    </Badge>
                    {item.isAiGenerated && (
                      <Badge tone="violet" size="sm" className="absolute right-3 top-3">
                        AI
                      </Badge>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-3 pt-8">
                      <p className="truncate text-[12px] font-extrabold text-white">{item.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <Badge tone={CONTENT_STATUS_TONE[item.status] ?? "gray"} size="sm">
                        {CONTENT_STATUS_LABELS[item.status]}
                      </Badge>
                      {premium && (
                        <Badge tone="pink" size="sm">
                          <Lock /> {item.access === "purchase" ? formatMoney(item.price?.amountMinor ?? 0) : item.minPlanTier ? TIER_LABEL[item.minPlanTier] : "Premium"}
                        </Badge>
                      )}
                      {!premium && item.access === "followers" && (
                        <Badge tone="gray" size="sm">
                          Takipçi
                        </Badge>
                      )}
                    </div>
                    <ContentActionsMenu id={id} title={item.title} status={item.status} />
                  </div>
                  <p className="border-t border-line-soft px-3 py-2 text-[10px] text-muted">
                    {item.status === "draft" && item.scheduledAt ? `Zamanlandı: ${formatDate(item.scheduledAt)}` : item.publishedAt ? `Yayın: ${formatDate(item.publishedAt)}` : `Oluşturma: ${formatDate(item.createdAt)}`} · {formatCompact(item.stats.views)} görüntüleme
                    {item.moderation.state === "pending" && " · moderasyon bekliyor"}
                    {item.moderation.state === "flagged" && " · işaretlendi"}
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
            title={lib.counts.all ? "Bu filtreyle içerik bulunamadı" : "Henüz içerik yok"}
            description={lib.counts.all ? "Filtreleri değiştirmeyi dene." : "İlk içeriğini oluşturup hayranlarınla paylaş."}
            action={
              <Button asChild size="sm">
                <Link href="/studio/content/new">
                  <Plus /> Yeni içerik oluştur
                </Link>
              </Button>
            }
          />
        </Card>
      )}
      <Pagination page={lib.page} pageCount={lib.pageCount} hrefFor={(p) => href({ page: p })} className="mt-6" />

      <section aria-label="İçerik istatistikleri" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Toplam içerik" icon={<FileStack />} value={formatNumber(lib.counts.all - (lib.counts.removed ?? 0))} />
        <StatCard label="Premium içerik" icon={<Lock />} tone="violet" value={formatNumber(lib.totals.premium)} />
        <StatCard label="Toplam görüntüleme" icon={<Eye />} tone="teal" value={formatCompact(lib.totals.views)} />
        <StatCard label="İçerik geliri (brüt)" icon={<Wallet />} tone="green" value={formatMoney(lib.totals.revenueMinor)} foot={`${formatNumber(lib.totals.purchases)} satın alma`} />
      </section>
    </div>
  );
}
