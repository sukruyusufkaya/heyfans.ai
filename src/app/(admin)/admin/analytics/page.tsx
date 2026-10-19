import type { Metadata } from "next";
import { Activity, CreditCard, Repeat2, UserPlus, Users } from "lucide-react";
import { CountArea, MoneyBars } from "@/components/admin/charts";
import { AdminPage, KpiGrid, Notice, ScoreBar, StatusPill, TabLinks, href } from "@/components/admin/ui";
import { Donut } from "@/components/charts/charts";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, DemoDataNotice, EmptyState, StatCard, Td, Th } from "@/components/ui/display";
import { requireAdmin } from "@/lib/auth/session";
import { formatMoney, formatNumber } from "@/lib/utils";
import { ANALYTICS_RANGES, getAnalyticsData, METRICS, type AnalyticsRangeKey, type Metric } from "@/services/admin/analytics";
import { hasDemoData, pickEnum, type SearchParams } from "@/services/admin/shared";

export const metadata: Metadata = { title: "Platform Analitiği" };

const RANGE_LABELS: Record<AnalyticsRangeKey, string> = { "30": "Son 30 gün", "90": "Son 90 gün", "365": "Son 12 ay" };
const METRIC_LABELS: Record<Metric, string> = { users: "Kullanıcılar", revenue: "Gelir", engagement: "Etkileşim", creators: "Creator Büyümesi" };
const EVENT_LABELS: Record<string, string> = {
  profile_view: "Profil görüntüleme",
  content_view: "İçerik görüntüleme",
  follow: "Takip",
  unfollow: "Takipten çıkma",
  favorite: "Favori",
  chat_message: "Sohbet mesajı",
  chat_started: "Sohbet başlatma",
  subscription_started: "Abonelik başlangıcı",
  content_purchase: "İçerik satın alma",
  credit_purchase: "Kredi satın alma",
  search: "Arama",
  page_view: "Sayfa görüntüleme",
  signup: "Kayıt",
};
const INTENT_LABELS: Record<string, string> = { fan: "Hayran olarak", creator: "Creator olarak", none: "Belirtilmemiş" };

function cellStyle(v: number | null) {
  if (v === null) return undefined;
  const a = Math.min(0.92, 0.08 + (v / 100) * 0.84);
  return { backgroundColor: `rgb(236 0 136 / ${a.toFixed(2)})`, color: v >= 45 ? "#fff" : "#19111d" } as const;
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin("analytics.read");
  const sp = await searchParams;
  const range = pickEnum(sp, "range", ["30", "90", "365"] as const, "30");
  const metric = pickEnum(sp, "metric", METRICS, "users");
  const [d, demo] = await Promise.all([getAnalyticsData(ANALYTICS_RANGES[range], metric), hasDemoData()]);
  const { kpis } = d;
  const donut = d.intents.map((i) => ({ name: INTENT_LABELS[i.intent] ?? i.intent, value: i.n }));
  const top = d.funnel[0]?.n ?? 0;
  const keep = { range: range === "30" ? null : range };

  return (
    <AdminPage
      title="Platform Analitiği"
      description="Büyüme, dönüşüm, kullanıcı tutundurma ve birim ekonomisini karşılaştırın."
      actions={
        <>
          {demo && <DemoDataNotice />}
          <TabLinks label="Dönem" active={range} tabs={(["30", "90", "365"] as const).map((r) => ({ key: r, label: RANGE_LABELS[r], href: href("/admin/analytics", { metric: metric === "users" ? null : metric, range: r === "30" ? null : r }) }))} className="mb-0" />
        </>
      }
    >
      <KpiGrid>
        <StatCard label={`Aktif Kullanıcı · ${RANGE_LABELS[range]}`} value={formatNumber(kpis.active)} icon={<Activity />} tone="pink" delta={kpis.activeDelta} foot={kpis.activeDelta ? "önceki döneme göre" : "giriş yapmış, etkinliği kayıtlı"} />
        <StatCard label="Yeni Kayıt" value={formatNumber(kpis.signups)} icon={<UserPlus />} tone="violet" delta={kpis.signupsDelta} foot={kpis.signupsDelta ? "önceki döneme göre" : undefined} />
        <StatCard label="Ödeme Dönüşümü" value={kpis.conversionPct === null ? "—" : `%${kpis.conversionPct.toLocaleString("tr-TR")}`} icon={<CreditCard />} tone="teal" foot={`${formatNumber(kpis.payers)} ödeme yapan / etkin veya ödeyen kullanıcı`} />
        <StatCard label="Ödeme Yapan Başına Gelir" value={kpis.arppu === null ? "—" : formatMoney(kpis.arppu, "TRY", { decimals: false })} icon={<Users />} tone="orange" foot="dönem brüt hacmi ÷ ödeme yapan" />
      </KpiGrid>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Büyüme ve Etkileşim" hint="Son 12 ay · aylık" />
          <TabLinks label="Metrik" active={metric} tabs={METRICS.map((m) => ({ key: m, label: METRIC_LABELS[m], href: href("/admin/analytics", { metric: m === "users" ? null : m, ...keep }) }))} className="mb-4" />
          {metric === "revenue" ? (
            d.series.every((s) => s.value === 0) ? <EmptyState compact title="Henüz veri bulunmuyor" description="Son 12 ayda başarılı ödeme yok." /> : <MoneyBars data={d.series.map((s) => ({ label: s.label, value: s.value }))} height={240} label="Brüt hacim" />
          ) : d.series.every((s) => s.value === 0) ? (
            <EmptyState compact title="Henüz veri bulunmuyor" description="Bu metrik için son 12 ayda kayıt yok." />
          ) : (
            <CountArea
              data={d.series}
              height={240}
              label={metric === "users" ? "Yeni kullanıcı" : metric === "engagement" ? "Sohbet mesajı" : "Yeni creator profili"}
              label2={metric === "users" ? "Creator olmak isteyen" : metric === "engagement" ? "Aktif sohbet eden" : "Onaylı"}
            />
          )}
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line-soft pt-4 text-center">
            <div>
              <p className="text-[10px] font-bold text-muted">1. Hafta Tutundurma</p>
              <p className="mt-1 text-lg font-black tracking-tight">{kpis.week1Pct === null ? "—" : `%${kpis.week1Pct}`}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted">Tekrar Ziyaret</p>
              <p className="mt-1 text-lg font-black tracking-tight">{kpis.repeatPct === null ? "—" : `%${kpis.repeatPct}`}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted">Oturum Süresi</p>
              <p className="mt-1 text-sm font-extrabold tracking-tight text-muted">Ölçülmüyor</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Dönüşüm Hunisi" hint={`${RANGE_LABELS[range]} içinde kayıt olanlar`} />
          {top === 0 ? (
            <EmptyState compact title="Henüz veri bulunmuyor" description="Bu dönemde yeni kayıt yok." />
          ) : (
            <>
              {d.funnel.map((f) => (
                <ScoreBar key={f.key} label={f.label} value={top ? (f.n / top) * 100 : null} hint={`${formatNumber(f.n)} kullanıcı`} tone={f.key === "signup" ? "pink" : f.key === "chat" ? "violet" : "teal"} />
              ))}
              <p className="mt-3 text-[11px] leading-relaxed text-muted">Yüzdeler aynı başlangıç kitlesine (dönemde kayıt olanlar) göredir. Ödeme adımı, sohbet etmeden satın alanları da içerir.</p>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Kohort Tutundurma Analizi" hint="Haftalık kayıt grupları · sohbet aktivitesi gösteren kullanıcı oranı" />
          <div className="-mx-1 overflow-x-auto px-1 scrollbar-thin">
            <table className="w-full min-w-[640px] border-separate border-spacing-1 text-center text-[11px]">
              <thead>
                <tr>
                  <th scope="col" className="px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-wider text-muted">
                    Kayıt haftası
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted">
                    Kullanıcı
                  </th>
                  {Array.from({ length: d.cohortWeeks }).map((_, k) => (
                    <th key={k} scope="col" className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted">
                      {k}. hf
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.cohorts.map((c) => (
                  <tr key={c.label}>
                    <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-left text-[11px] font-extrabold text-ink">
                      {c.label}
                    </th>
                    <td className="px-2 py-1.5 font-bold text-muted-strong">{c.size}</td>
                    {c.cells.map((v, k) => (
                      <td key={k} className="rounded-md px-2 py-1.5 font-extrabold" style={cellStyle(v)}>
                        {v === null ? "" : `%${v}`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted">Aktivite = kullanıcının sohbet mesajı veya sohbet başlatma olayı (analitik olayları + mesaj kayıtları). 0. hafta kayıt haftasıdır; boş hücreler henüz yaşanmamış veya kohortu olmayan haftalardır.</p>
        </Card>

        <div className="grid content-start gap-5">
          <Card>
            <CardHeader title="Kayıt Niyeti" hint={`${RANGE_LABELS[range]} · kayıt sırasında seçilen`} />
            {donut.length === 0 ? <EmptyState compact title="Henüz veri bulunmuyor" /> : <Donut data={donut} height={140} centerValue={formatNumber(kpis.signups)} centerLabel="kayıt" />}
          </Card>
          <Card>
            <CardHeader title="Trafik Kaynakları" hint="Referrer / UTM" />
            <Notice tone="neutral">Trafik kaynağı (referrer, UTM, kampanya) ölçümü henüz toplanmıyor; bu yüzden kaynak dağılımı gösterilmiyor. Aşağıda yalnız ürün içi olay hacimleri yer alır.</Notice>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Ürün İçi Olay Hacmi" hint={`${RANGE_LABELS[range]} · önceki dönemle karşılaştırma`} />
        {d.events.length === 0 ? (
          <EmptyState compact title="Henüz veri bulunmuyor" description="Bu dönemde analitik olayı kaydedilmedi." />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Olay</Th>
                <Th className="text-right">Adet</Th>
                <Th className="text-right">Önceki döneme göre</Th>
              </tr>
            </thead>
            <tbody>
              {d.events.map((e) => (
                <tr key={e.type}>
                  <Td>
                    <b className="text-ink">{EVENT_LABELS[e.type] ?? e.type}</b>
                  </Td>
                  <Td className="text-right tabular-nums">{formatNumber(e.count)}</Td>
                  <Td className="text-right">
                    {e.delta ? (
                      <StatusPill size="sm" tone={e.delta.direction === "up" ? "green" : e.delta.direction === "down" ? "danger" : "gray"}>
                        {e.delta.value}
                      </StatusPill>
                    ) : (
                      <span className="text-[10px] text-muted">karşılaştırma yok</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
          <Repeat2 className="size-3.5 shrink-0" aria-hidden /> Analitik olayları 400 gün saklanır.{d.anonPct !== null && d.anonPct > 0 ? ` Dönemdeki olayların %${d.anonPct}'i kullanıcı kimliği taşımıyor (anonim/toplu); bu yüzden aktif kullanıcı sayısı alt sınırdır.` : ""}
        </p>
      </Card>
    </AdminPage>
  );
}
