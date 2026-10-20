import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Landmark, Send, Wallet } from "lucide-react";
import { Donut } from "@/components/charts/charts";
import { MoneyBars } from "@/components/studio/money-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, EmptyState, PageHeader, Pagination, StatCard, Td, Th } from "@/components/ui/display";
import { Notice, STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { getFormatters, getT } from "@/i18n/server";
import { requireCreator } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { EARNING_SOURCES } from "@/models/monetization";
import { earningsQuerySchema, getEarnings, SOURCE_LABELS } from "@/services/studio/finance";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Gelirler") };
}

export default async function EarningsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const { formatDate, formatMoney, formatPercent } = await getFormatters();
  const money = (v: number) => <span className={v < 0 ? "text-danger" : undefined}>{formatMoney(v)}</span>;
  const { user } = await requireCreator();
  const raw = await searchParams;
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k]![0] : raw[k]);
  const q = earningsQuerySchema.parse({ page: one("page"), source: one("source") });
  const e = await getEarnings(user.id, q);
  const b = e.balance;
  const href = (source: string, page = 1) => {
    const p = new URLSearchParams();
    if (source !== "all") p.set("source", source);
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return `/studio/earnings${s ? `?${s}` : ""}`;
  };
  const totalBySource = e.bySource.reduce((a, s) => a + s.value, 0);

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow={STUDIO_EYEBROW}
        title={t("Gelirler")}
        description={t("Creator kazançlarını kaynaklarına göre analiz et ve performansını izle.")}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/studio/payouts">
                <Send className="rtl:-scale-x-100" /> {t("Ödemeler")}
              </Link>
            </Button>
          </>
        }
      />

      <section aria-label={t("Bakiye")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("Kullanılabilir bakiye")} icon={<Wallet />} value={formatMoney(b.available)} foot={t("Olgunlaşmış, ödeme talep edilebilir")} />
        <StatCard label={t("Bekleyen (olgunlaşmamış)")} icon={<Clock />} tone="orange" value={formatMoney(b.pending)} foot={t("{days} gün bekleme süresi", { days: e.revenue.holdDays })} />
        <StatCard label={t("Ödeme sürecinde")} icon={<Send className="rtl:-scale-x-100" />} tone="violet" value={formatMoney(b.inPayout)} />
        <StatCard label={t("Ödenen toplam")} icon={<Landmark />} tone="green" value={formatMoney(b.paidOut)} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("Aylık gelir")} hint={t("Son 6 ay · creator payın")} />
          {e.months.some((mo) => mo.value > 0) ? <MoneyBars data={e.months} height={240} label={t("Creator payı")} /> : <EmptyState compact title={t("Henüz veri bulunmuyor")} description={t("Kazançların oluştukça aylık görünüm burada yer alır.")} />}
        </Card>
        <Card>
          <CardHeader title={t("Gelir kaynakları")} hint={t("Toplam kazancın dağılımı")} />
          {e.bySource.length ? (
            <>
              <Donut data={e.bySource.map((s) => ({ name: t(s.name), value: s.value }))} height={150} centerValue={formatMoney(totalBySource, "TRY", { decimals: false })} centerLabel={t("toplam")} />
              <ul className="mt-4 grid gap-1.5 border-t border-line-soft pt-3 text-[11px]">
                {e.bySource.map((s) => (
                  <li key={s.key} className="flex justify-between gap-3">
                    <span className="text-muted-strong">{t(s.name)}</span>
                    <b className="tabular-nums">{formatMoney(s.value)}</b>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState compact title={t("Henüz veri bulunmuyor")} />
          )}
        </Card>
      </div>

      <Notice className="mt-5" title={t("Gelir modeli (taslak): net gelirin {share}'si sana", { share: formatPercent(e.revenue.shareBps) })}>
        {t("Hayranın ödediği brüt tutardan ödeme sağlayıcısı işlem ücreti ({fee} + sabit) ve KDV ({vat}) düşülür; kalan net tutarın {share}’si sana, kalanı platforma aittir. Hak edişler {days} gün bekletildikten sonra kullanılabilir olur. Oranlar nihai sözleşme ve ödeme sağlayıcısı koşullarına göre değişebilir.", { fee: formatPercent(e.revenue.processingFeeBps), vat: formatPercent(e.revenue.vatBps), share: formatPercent(e.revenue.shareBps), days: e.revenue.holdDays })}
      </Notice>

      <Card className="mt-5">
        <CardHeader title={t("Hak ediş defteri")} hint={t("Her satır bir kazanç kaydıdır; iade ve geri almalar negatif ters kayıt olarak görünür.")} />
        <nav aria-label={t("Kaynak filtresi")} className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
          {[{ k: "all", l: t("Tümü") }, ...EARNING_SOURCES.map((s) => ({ k: s, l: t(SOURCE_LABELS[s]) }))].map((f) => (
            <Link key={f.k} href={href(f.k)} aria-current={q.source === f.k ? "page" : undefined} className={cn("shrink-0 rounded-full px-3.5 py-2 text-[11px] font-extrabold transition-colors", q.source === f.k ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink")}>
              {f.l}
            </Link>
          ))}
        </nav>
        {e.rows.length ? (
          <DataTable className="[&_table]:min-w-[820px]">
            <thead>
              <tr>
                <Th>{t("Tarih")}</Th>
                <Th>{t("Kaynak")}</Th>
                <Th className="text-end">{t("Brüt")}</Th>
                <Th className="text-end">{t("Kesintiler")}</Th>
                <Th className="text-end">{t("Net")}</Th>
                <Th className="text-end">{t("Platform payı")}</Th>
                <Th className="text-end">{t("Senin payın")}</Th>
                <Th>{t("Durum")}</Th>
              </tr>
            </thead>
            <tbody>
              {e.rows.map((r) => {
                const mature = new Date(r.availableAt) <= new Date();
                return (
                  <tr key={r._id.toString()}>
                    <Td className="whitespace-nowrap">{formatDate(r.createdAt)}</Td>
                    <Td>
                      <p className="font-extrabold text-ink">{t(SOURCE_LABELS[r.sourceType])}</p>
                      <p className="max-w-[220px] truncate text-[10px] text-muted">{r.description}</p>
                    </Td>
                    <Td className="text-end tabular-nums">{money(r.grossMinor)}</Td>
                    <Td className="text-end tabular-nums">{money(r.processingFeeMinor + r.taxMinor)}</Td>
                    <Td className="text-end tabular-nums">{money(r.netMinor)}</Td>
                    <Td className="text-end tabular-nums">{money(r.platformFeeMinor)}</Td>
                    <Td className="text-end font-extrabold tabular-nums">{money(r.creatorShareMinor)}</Td>
                    <Td>
                      {r.reversesEarningId ? (
                        <Badge tone="danger" size="sm">
                          {t("Ters kayıt")}
                        </Badge>
                      ) : (
                        <Badge tone={mature ? "green" : "warn"} size="sm">
                          {mature ? t("Kullanılabilir") : t("{date}'e kadar bekliyor", { date: formatDate(r.availableAt) })}
                        </Badge>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState compact title={t("Henüz veri bulunmuyor")} description={t("Abonelik, içerik satışı, sohbet ve diğer kazançların burada listelenir.")} />
        )}
        <Pagination page={e.page} pageCount={e.pageCount} hrefFor={(p) => href(q.source, p)} className="mt-4" />
      </Card>
    </div>
  );
}
