import type { Metadata } from "next";
import { Activity, CreditCard, Repeat2, UserPlus, Users } from "lucide-react";
import { CountArea, MoneyBars } from "@/components/admin/charts";
import { AdminPage, KpiGrid, Notice, ScoreBar, StatusPill, TabLinks, href } from "@/components/admin/ui";
import { Donut } from "@/components/charts/charts";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, EmptyState, StatCard, Td, Th } from "@/components/ui/display";
import { getFormatters, getT } from "@/i18n/server";
import { m } from "@/i18n/m";
import { requireAdmin } from "@/lib/auth/session";
import { ANALYTICS_RANGES, getAnalyticsData, METRICS, type AnalyticsRangeKey, type Metric } from "@/services/admin/analytics";
import { pickEnum, type SearchParams } from "@/services/admin/shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Platform Analitiği") };
}

const RANGE_LABELS: Record<AnalyticsRangeKey, string> = { "30": m("Son 30 gün"), "90": m("Son 90 gün"), "365": m("Son 12 ay") };
const METRIC_LABELS: Record<Metric, string> = { users: m("Kullanıcılar"), revenue: m("Gelir"), engagement: m("Etkileşim"), creators: m("Creator Büyümesi") };
const EVENT_LABELS: Record<string, string> = {
  profile_view: m("Profil görüntüleme"),
  content_view: m("İçerik görüntüleme"),
  follow: m("Takip"),
  unfollow: m("Takipten çıkma"),
  favorite: m("Favori"),
  chat_message: m("Sohbet mesajı"),
  chat_started: m("Sohbet başlatma"),
  subscription_started: m("Abonelik başlangıcı"),
  content_purchase: m("İçerik satın alma"),
  credit_purchase: m("Kredi satın alma"),
  search: m("Arama"),
  page_view: m("Sayfa görüntüleme"),
  signup: m("Kayıt"),
};
const INTENT_LABELS: Record<string, string> = { fan: m("Hayran olarak"), creator: m("Creator olarak"), none: m("Belirtilmemiş") };

function cellStyle(v: number | null) {
  if (v === null) return undefined;
  const a = Math.min(0.92, 0.08 + (v / 100) * 0.84);
  return { backgroundColor: `rgb(236 0 136 / ${a.toFixed(2)})`, color: v >= 45 ? "#fff" : "#19111d" } as const;
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin("analytics.read");
  const t = await getT();
  const { formatMoney, formatNumber, formatPercent } = await getFormatters();
  const sp = await searchParams;
  const range = pickEnum(sp, "range", ["30", "90", "365"] as const, "30");
  const metric = pickEnum(sp, "metric", METRICS, "users");
  const [d] = await Promise.all([getAnalyticsData(ANALYTICS_RANGES[range], metric)]);
  const { kpis } = d;
  const donut = d.intents.map((i) => ({ name: INTENT_LABELS[i.intent] ? t(INTENT_LABELS[i.intent]!) : i.intent, value: i.n }));
  const top = d.funnel[0]?.n ?? 0;
  const keep = { range: range === "30" ? null : range };

  return (
    <AdminPage
      title={t("Platform Analitiği")}
      description={t("Büyüme, dönüşüm, kullanıcı tutundurma ve birim ekonomisini karşılaştırın.")}
      actions={
        <>
          <TabLinks label={t("Dönem")} active={range} tabs={(["30", "90", "365"] as const).map((r) => ({ key: r, label: t(RANGE_LABELS[r]), href: href("/admin/analytics", { metric: metric === "users" ? null : metric, range: r === "30" ? null : r }) }))} className="mb-0" />
        </>
      }
    >
      <KpiGrid>
        <StatCard label={t("Aktif Kullanıcı · {range}", { range: t(RANGE_LABELS[range]) })} value={formatNumber(kpis.active)} icon={<Activity />} tone="pink" delta={kpis.activeDelta} foot={kpis.activeDelta ? t("önceki döneme göre") : t("giriş yapmış, etkinliği kayıtlı")} />
        <StatCard label={t("Yeni Kayıt")} value={formatNumber(kpis.signups)} icon={<UserPlus />} tone="violet" delta={kpis.signupsDelta} foot={kpis.signupsDelta ? t("önceki döneme göre") : undefined} />
        <StatCard label={t("Ödeme Dönüşümü")} value={kpis.conversionPct === null ? "—" : formatPercent(kpis.conversionPct * 100)} icon={<CreditCard />} tone="teal" foot={t("{count} ödeme yapan / etkin veya ödeyen kullanıcı", { count: formatNumber(kpis.payers) })} />
        <StatCard label={t("Ödeme Yapan Başına Gelir")} value={kpis.arppu === null ? "—" : formatMoney(kpis.arppu, "TRY", { decimals: false })} icon={<Users />} tone="orange" foot={t("dönem brüt hacmi ÷ ödeme yapan")} />
      </KpiGrid>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("Büyüme ve Etkileşim")} hint={t("Son 12 ay · aylık")} />
          <TabLinks label={t("Metrik")} active={metric} tabs={METRICS.map((mt) => ({ key: mt, label: t(METRIC_LABELS[mt]), href: href("/admin/analytics", { metric: mt === "users" ? null : mt, ...keep }) }))} className="mb-4" />
          {metric === "revenue" ? (
            d.series.every((s) => s.value === 0) ? <EmptyState compact title={t("Henüz veri bulunmuyor")} description={t("Son 12 ayda başarılı ödeme yok.")} /> : <MoneyBars data={d.series.map((s) => ({ label: s.label, value: s.value }))} height={240} label={t("Brüt hacim")} />
          ) : d.series.every((s) => s.value === 0) ? (
            <EmptyState compact title={t("Henüz veri bulunmuyor")} description={t("Bu metrik için son 12 ayda kayıt yok.")} />
          ) : (
            <CountArea
              data={d.series}
              height={240}
              label={metric === "users" ? t("Yeni kullanıcı") : metric === "engagement" ? t("Sohbet mesajı") : t("Yeni creator profili")}
              label2={metric === "users" ? t("Creator olmak isteyen") : metric === "engagement" ? t("Aktif sohbet eden") : t("Onaylı")}
            />
          )}
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line-soft pt-4 text-center">
            <div>
              <p className="text-[10px] font-bold text-muted">{t("1. Hafta Tutundurma")}</p>
              <p className="mt-1 text-lg font-black tracking-tight">{kpis.week1Pct === null ? "—" : formatPercent(kpis.week1Pct * 100)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted">{t("Tekrar Ziyaret")}</p>
              <p className="mt-1 text-lg font-black tracking-tight">{kpis.repeatPct === null ? "—" : formatPercent(kpis.repeatPct * 100)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted">{t("Oturum Süresi")}</p>
              <p className="mt-1 text-sm font-extrabold tracking-tight text-muted">{t("Ölçülmüyor")}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("Dönüşüm Hunisi")} hint={t("{range} içinde kayıt olanlar", { range: t(RANGE_LABELS[range]) })} />
          {top === 0 ? (
            <EmptyState compact title={t("Henüz veri bulunmuyor")} description={t("Bu dönemde yeni kayıt yok.")} />
          ) : (
            <>
              {d.funnel.map((f) => (
                <ScoreBar key={f.key} label={t(f.label)} value={top ? (f.n / top) * 100 : null} hint={t("{count} kullanıcı", { count: formatNumber(f.n) })} tone={f.key === "signup" ? "pink" : f.key === "chat" ? "violet" : "teal"} />
              ))}
              <p className="mt-3 text-[11px] leading-relaxed text-muted">{t("Yüzdeler aynı başlangıç kitlesine (dönemde kayıt olanlar) göredir. Ödeme adımı, sohbet etmeden satın alanları da içerir.")}</p>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("Kohort Tutundurma Analizi")} hint={t("Haftalık kayıt grupları · sohbet aktivitesi gösteren kullanıcı oranı")} />
          <div className="-mx-1 overflow-x-auto px-1 scrollbar-thin">
            <table className="w-full min-w-[640px] border-separate border-spacing-1 text-center text-[11px]">
              <thead>
                <tr>
                  <th scope="col" className="px-2 py-1.5 text-start text-[10px] font-black uppercase tracking-wider text-muted">
                    
                    {t("Kayıt haftası")}
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted">
                    
                    {t("Kullanıcı")}
                  </th>
                  {Array.from({ length: d.cohortWeeks }).map((_, k) => (
                    <th key={k} scope="col" className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted">
                      {t("{n}. hf", { n: k })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.cohorts.map((c) => (
                  <tr key={c.label}>
                    <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-start text-[11px] font-extrabold text-ink">
                      {c.label}
                    </th>
                    <td className="px-2 py-1.5 font-bold text-muted-strong">{c.size}</td>
                    {c.cells.map((v, k) => (
                      <td key={k} className="rounded-md px-2 py-1.5 font-extrabold" style={cellStyle(v)}>
                        {v === null ? "" : formatPercent(v * 100)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted">{t("Aktivite = kullanıcının sohbet mesajı veya sohbet başlatma olayı (analitik olayları + mesaj kayıtları). 0. hafta kayıt haftasıdır; boş hücreler henüz yaşanmamış veya kohortu olmayan haftalardır.")}</p>
        </Card>

        <div className="grid content-start gap-5">
          <Card>
            <CardHeader title={t("Kayıt Niyeti")} hint={t("{range} · kayıt sırasında seçilen", { range: t(RANGE_LABELS[range]) })} />
            {donut.length === 0 ? <EmptyState compact title={t("Henüz veri bulunmuyor")} /> : <Donut data={donut} height={140} centerValue={formatNumber(kpis.signups)} centerLabel={t("kayıt")} />}
          </Card>
          <Card>
            <CardHeader title={t("Trafik Kaynakları")} hint={t("Referrer / UTM")} />
            <Notice tone="neutral">{t("Trafik kaynağı (referrer, UTM, kampanya) ölçümü henüz toplanmıyor; bu yüzden kaynak dağılımı gösterilmiyor. Aşağıda yalnız ürün içi olay hacimleri yer alır.")}</Notice>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title={t("Ürün İçi Olay Hacmi")} hint={t("{range} · önceki dönemle karşılaştırma", { range: t(RANGE_LABELS[range]) })} />
        {d.events.length === 0 ? (
          <EmptyState compact title={t("Henüz veri bulunmuyor")} description={t("Bu dönemde analitik olayı kaydedilmedi.")} />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>{t("Olay")}</Th>
                <Th className="text-end">{t("Adet")}</Th>
                <Th className="text-end">{t("Önceki döneme göre")}</Th>
              </tr>
            </thead>
            <tbody>
              {d.events.map((e) => (
                <tr key={e.type}>
                  <Td>
                    <b className="text-ink">{EVENT_LABELS[e.type] ? t(EVENT_LABELS[e.type]!) : e.type}</b>
                  </Td>
                  <Td className="text-end tabular-nums">{formatNumber(e.count)}</Td>
                  <Td className="text-end">
                    {e.delta ? (
                      <StatusPill size="sm" tone={e.delta.direction === "up" ? "green" : e.delta.direction === "down" ? "danger" : "gray"}>
                        {e.delta.value}
                      </StatusPill>
                    ) : (
                      <span className="text-[10px] text-muted">{t("karşılaştırma yok")}</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
          <Repeat2 className="size-3.5 shrink-0" aria-hidden /> {t("Analitik olayları 400 gün saklanır.")}
          {d.anonPct !== null && d.anonPct > 0 ? <> {t("Dönemdeki olayların %{anonPct}'i kullanıcı kimliği taşımıyor (anonim/toplu); bu yüzden aktif kullanıcı sayısı alt sınırdır.", { anonPct: d.anonPct })}</> : null}
        </p>
      </Card>
    </AdminPage>
  );
}
