import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Heart, MessageCircle, MousePointerClick } from "lucide-react";
import { AreaTrend, Bars, type Point } from "@/components/charts/charts";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader, Progress, StatCard } from "@/components/ui/display";
import { STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { CONTENT_TYPE_LABELS } from "@/features/studio/labels";
import { LOCALE_META } from "@/i18n/config";
import { getFormatters, getLocale, getT } from "@/i18n/server";
import { requireCreator } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { ANALYTICS_RANGES, analyticsRangeSchema, getCreatorAnalytics } from "@/services/studio/analytics";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Analitik") };
}

const hasAny = (s: Point[]) => s.some((p) => p.value > 0);

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const locale = await getLocale();
  const { formatCompact, formatMoney, formatNumber, formatPercent } = await getFormatters();
  const pct1 = new Intl.NumberFormat(LOCALE_META[locale].intl, { style: "percent", maximumFractionDigits: 1 });
  const delta = (v: number | null): { value: string; direction: "up" | "down" | "flat" } | null => {
    if (v == null) return null;
    return { value: formatPercent(Math.abs(v) * 100), direction: v > 0 ? "up" : v < 0 ? "down" : "flat" };
  };
  const typeLabel = (type: string) => (CONTENT_TYPE_LABELS[type] ? t(CONTENT_TYPE_LABELS[type]!) : type);
  const { user } = await requireCreator();
  const raw = await searchParams;
  const days = analyticsRangeSchema.parse(Array.isArray(raw.range) ? raw.range[0] : raw.range) as 7 | 30 | 90;
  const a = await getCreatorAnalytics(user.id, days);
  const m = a.metrics;
  const views = a.funnel[0]!.value;
  const pctOf = (v: number, base: number) => (base > 0 ? Math.min(100, (v / base) * 100) : 0);

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow={STUDIO_EYEBROW}
        title={t("Analitik")}
        description={t("Profil, hayran ve içerik performansını tek merkezden analiz et.")}
        actions={
          <>
            <nav aria-label={t("Zaman aralığı")} className="flex gap-1.5">
              {ANALYTICS_RANGES.map((r) => (
                <Link key={r} href={`/studio/analytics?range=${r}`} aria-current={days === r ? "page" : undefined} className={cn("rounded-full px-3.5 py-2 text-[11px] font-extrabold transition-colors", days === r ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink")}>
                  {t("Son {days} gün", { days: r })}
                </Link>
              ))}
            </nav>
          </>
        }
      />

      <section aria-label={t("Özet göstergeler")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("Profil görüntüleme")} icon={<Eye />} value={formatNumber(m.profileViews.value)} delta={delta(m.profileViews.delta)} foot={t("son {days} gün", { days })} />
        <StatCard label={t("Yeni takip")} icon={<Heart />} tone="violet" value={formatNumber(m.follows.value)} delta={delta(m.follows.delta)} foot={t("son {days} gün", { days })} />
        <StatCard label={t("AI sohbet mesajı")} icon={<MessageCircle />} tone="teal" value={formatNumber(m.chatMessages.value)} delta={delta(m.chatMessages.delta)} foot={t("son {days} gün", { days })} />
        <StatCard label={t("İçerik görüntüleme")} icon={<MousePointerClick />} tone="orange" value={formatNumber(m.contentViews.value)} delta={delta(m.contentViews.delta)} foot={t("son {days} gün", { days })} />
      </section>

      {!a.hasData && (
        <Card className="mt-5">
          <EmptyState title={t("Henüz veri bulunmuyor")} description={t("Son {days} günde profil görüntüleme, takip, sohbet veya içerik etkileşimi kaydedilmedi. Etkinlik oluştukça grafikler dolacak.", { days })} />
        </Card>
      )}

      {a.hasData && (
        <>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title={t("Profil görüntüleme")} hint={t("Günlük")} />
              {hasAny(m.profileViews.series) ? <AreaTrend data={m.profileViews.series} height={190} seriesLabel={t("Görüntüleme")} /> : <EmptyState compact title={t("Henüz veri bulunmuyor")} />}
            </Card>
            <Card>
              <CardHeader title={t("Yeni takip")} hint={t("Günlük")} />
              {hasAny(m.follows.series) ? <Bars data={m.follows.series} height={190} label={t("Takip")} /> : <EmptyState compact title={t("Henüz veri bulunmuyor")} />}
            </Card>
            <Card>
              <CardHeader title={t("AI sohbet mesajları")} hint={t("Günlük")} />
              {hasAny(m.chatMessages.series) ? <AreaTrend data={m.chatMessages.series} height={190} seriesLabel={t("Mesaj")} /> : <EmptyState compact title={t("Henüz veri bulunmuyor")} />}
            </Card>
            <Card>
              <CardHeader title={t("İçerik görüntüleme")} hint={t("Günlük")} />
              {hasAny(m.contentViews.series) ? <Bars data={m.contentViews.series} height={190} label={t("Görüntüleme")} /> : <EmptyState compact title={t("Henüz veri bulunmuyor")} />}
            </Card>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Card>
              <CardHeader title={t("Dönüşüm hunisi")} hint={t("Profil görüntülemeden aboneliğe")} />
              <div className="grid gap-4">
                {a.funnel.map((f, i) => (
                  <div key={f.key}>
                    <div className="mb-1.5 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-ink-soft">{t(f.label)}</span>
                      <b>
                        {formatNumber(f.value)}
                        {i > 0 && views > 0 && <span className="ms-1.5 font-semibold text-muted">· {pct1.format(pctOf(f.value, views) / 100)}</span>}
                      </b>
                    </div>
                    <Progress value={i === 0 ? (views > 0 ? 100 : 0) : pctOf(f.value, views)} tone={i === 0 ? "pink" : i === 1 ? "violet" : "teal"} label={t(f.label)} />
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[10px] text-muted">{t("Yüzdeler, aynı dönemdeki profil görüntülemeye göre hesaplanır; farklı kişilerin tekil eşleştirmesi değildir.")}</p>
            </Card>

            <div className="grid gap-5 sm:grid-cols-2">
              <Card>
                <CardHeader title={t("En çok görüntülenen")} hint={t("Son {days} gün", { days })} />
                {a.topViewed.length ? (
                  <ol className="grid gap-3">
                    {a.topViewed.map((item, i) => (
                      <li key={item.id} className="flex items-center gap-2.5 text-[12px]">
                        <span className="w-4 text-center text-[11px] font-black text-brand-500">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-extrabold">{item.title}</span>
                          <span className="text-[10px] text-muted">{typeLabel(item.type)}</span>
                        </span>
                        <b className="tabular-nums">{formatCompact(item.views)}</b>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <EmptyState compact title={t("Henüz veri bulunmuyor")} />
                )}
              </Card>
              <Card>
                <CardHeader title={t("En çok kazandıran")} hint={t("Tüm zamanlar · brüt")} />
                {a.topRevenue.length ? (
                  <ol className="grid gap-3">
                    {a.topRevenue.map((item, i) => (
                      <li key={item.id} className="flex items-center gap-2.5 text-[12px]">
                        <span className="w-4 text-center text-[11px] font-black text-brand-500">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-extrabold">{item.title}</span>
                          <span className="text-[10px] text-muted">{t("{count, number} satın alma", { count: item.purchases })}</span>
                        </span>
                        <b className="tabular-nums">{formatMoney(item.revenueMinor)}</b>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <EmptyState compact title={t("Henüz veri bulunmuyor")} />
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
