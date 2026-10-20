import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Flag, Lock, MessageCircle, ShieldAlert, Users } from "lucide-react";
import { AreaTrend, Bars } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, EmptyState, PageHeader, Pagination, StatCard, Td, Th } from "@/components/ui/display";
import { Notice, STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { m } from "@/i18n/m";
import { getFormatters, getT } from "@/i18n/server";
import { requireCreator } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { conversationFilterSchema, getConversationAnalytics, pageSchema } from "@/services/studio/conversations";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Sohbetler") };
}

const STATUS: Record<string, { label: string; tone: "green" | "gray" | "warn" | "danger" }> = {
  active: { label: m("Aktif"), tone: "green" },
  archived: { label: m("Arşivlendi"), tone: "gray" },
  reported: { label: m("Bildirildi"), tone: "warn" },
  blocked: { label: m("Engellendi"), tone: "danger" },
};
const FILTERS = [
  { key: "all", label: m("Tüm sohbetler") },
  { key: "flagged", label: m("İşaretli / bildirilen") },
  { key: "interventions", label: m("Güvenlik müdahaleli") },
] as const;

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const { formatDateTime, formatNumber } = await getFormatters();
  const { user } = await requireCreator();
  const raw = await searchParams;
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k]![0] : raw[k]);
  const filter = conversationFilterSchema.parse(one("filter"));
  const page = pageSchema.catch(1).parse(one("page"));
  const d = await getConversationAnalytics(user.id, { filter, page });
  const href = (f: string, p = 1) => `/studio/conversations?${new URLSearchParams({ ...(f !== "all" ? { filter: f } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString()}`.replace(/\?$/, "");

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow={STUDIO_EYEBROW}
        title={t("Sohbetler")}
        description={t("AI ikizinin hayranlarla konuşma performansını gizliliği koruyarak takip et.")}
      />

      <Notice tone="safe" icon={<Lock />} title={t("Gizlilik önceliklidir")} className="mb-5">
        {t("Hayranların AI ikizinle yaptığı özel sohbetlerin içeriği varsayılan olarak sana gösterilmez. Burada yalnız toplu istatistikler ve anonim üst veriler (mesaj sayısı, son etkinlik, güvenlik durumu) yer alır. Bir sohbet kural ihlali nedeniyle bildirilirse, içeriğe yalnız yetkili moderasyon ekibi erişebilir ve bu erişim kayıt altına alınır.")}
      </Notice>

      <section aria-label={t("Sohbet göstergeleri")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label={t("Toplam sohbet")} icon={<MessageCircle />} value={formatNumber(d.stats.total)} />
        <StatCard label={t("Aktif hayran (30 gün)")} icon={<Users />} tone="violet" value={formatNumber(d.stats.activeFans30)} />
        <StatCard label={t("Sohbet başına mesaj")} icon={<Activity />} tone="teal" value={formatNumber(d.stats.avgMessages)} />
        <StatCard label={t("İşaretli / bildirilen")} icon={<Flag />} tone="orange" value={formatNumber(d.stats.flagged)} />
        <StatCard label={t("Güvenlik müdahalesi")} icon={<ShieldAlert />} tone="green" value={formatNumber(d.stats.interventions)} foot={t("Filtre devreye giren mesaj")} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("Yeni sohbetler")} hint={t("Son 30 gün · günlük")} />
          {d.convSeries.some((p) => p.value > 0) ? <AreaTrend data={d.convSeries} height={200} seriesLabel={t("Yeni sohbet")} /> : <EmptyState compact title={t("Henüz veri bulunmuyor")} description={t("Hayranlar ikizinle sohbet başlattıkça burada görünür.")} />}
        </Card>
        <Card>
          <CardHeader title={t("Hayran mesajları")} hint={t("Son 30 gün · günlük mesaj sayısı")} />
          {d.msgSeries.some((p) => p.value > 0) ? <Bars data={d.msgSeries} height={200} label={t("Mesaj")} /> : <EmptyState compact title={t("Henüz veri bulunmuyor")} description={t("Gelen mesajlar burada sayılır; içerikleri gösterilmez.")} />}
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title={t("Sohbet listesi")} hint={t("Hayranlar anonimleştirilmiştir; mesaj içeriği gösterilmez.")} />
        <nav aria-label={t("Sohbet filtresi")} className="mb-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link key={f.key} href={href(f.key)} aria-current={filter === f.key ? "page" : undefined} className={cn("rounded-full px-3.5 py-2 text-[11px] font-extrabold transition-colors", filter === f.key ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink")}>
              {t(f.label)}
            </Link>
          ))}
        </nav>
        {d.rows.length ? (
          <DataTable>
            <thead>
              <tr>
                <Th>{t("Hayran")}</Th>
                <Th className="text-end">{t("Mesaj")}</Th>
                <Th>{t("Son etkinlik")}</Th>
                <Th>{t("Durum")}</Th>
                <Th className="text-end">{t("Güvenlik müdahalesi")}</Th>
                <Th className="text-end">{t("Harcanan kredi")}</Th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r) => {
                const st = STATUS[r.status] ? { label: t(STATUS[r.status]!.label), tone: STATUS[r.status]!.tone } : { label: r.status, tone: "gray" as const };
                return (
                  <tr key={r.id}>
                    <Td className="font-extrabold text-ink">{r.label}</Td>
                    <Td className="text-end tabular-nums">{formatNumber(r.messageCount)}</Td>
                    <Td className="whitespace-nowrap">{formatDateTime(r.lastMessageAt)}</Td>
                    <Td>
                      <Badge tone={st.tone} size="sm">
                        {st.label}
                      </Badge>
                    </Td>
                    <Td className="text-end tabular-nums">{r.interventions ? <b className="text-warning">{r.interventions}</b> : "—"}</Td>
                    <Td className="text-end tabular-nums">{formatNumber(r.creditsSpent)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState compact title={t("Henüz veri bulunmuyor")} description={t(filter === "all" ? "Hayranlar AI ikizinle sohbet etmeye başladığında burada listelenir." : "Bu filtreyle eşleşen sohbet yok.")} />
        )}
        <Pagination page={d.page} pageCount={d.pageCount} hrefFor={(p) => href(filter, p)} className="mt-4" />
      </Card>
    </div>
  );
}
