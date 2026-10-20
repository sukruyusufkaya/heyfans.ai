import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Bot, CheckCircle2, CircleAlert, CreditCard, Flag, Gavel, ScrollText, ShieldCheck, Star, Users, Wallet, XCircle } from "lucide-react";
import { CountArea, CountBars } from "@/components/admin/charts";
import { AUDIT_SEVERITY_LABELS, AUDIT_SEVERITY_TONES, labelOf, TX_KIND_LABELS } from "@/components/admin/labels";
import { AdminPage, DeniedNotice, KpiGrid, Notice, StatusPill } from "@/components/admin/ui";
import { Donut } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, StatCard } from "@/components/ui/display";
import { getFormatters, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { getDashboardData } from "@/services/admin/dashboard";
import { pick, type SearchParams } from "@/services/admin/shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Genel Bakış") };
}

const QUEUE_ICONS: Record<string, React.ReactNode> = {
  applications: <Star />,
  twinVersions: <Bot />,
  cases: <Gavel />,
  reports: <Flag />,
  appeals: <ScrollText />,
  payouts: <Wallet />,
  tickets: <CircleAlert />,
};

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("admin.dashboard");
  const t = await getT();
  const { formatDateTime, formatMoney, formatNumber, formatPercent, formatRelative } = await getFormatters();
  const sp = await searchParams;
  const data = await getDashboardData(user);
  const { kpis, finance, growth, quick, queue, health, recent } = data;
  const donut = (finance?.byKind ?? []).map((k) => ({ name: labelOf(t, TX_KIND_LABELS, k.kind), value: k.value }));
  const totalQueue = queue.reduce((a, q) => a + q.count, 0);
  const missing = health.integrations.filter((i) => !i.configured);

  return (
    <AdminPage title={t("Platform Genel Bakış")} description={t("Kullanıcı, creator, gelir ve sistem operasyonlarını tek noktadan takip edin.")}>
      {pick(sp, "denied") === "1" && <DeniedNotice />}

      <KpiGrid>
        <StatCard label={t("Toplam Kullanıcı")} value={formatNumber(kpis.totalUsers)} icon={<Users />} tone="pink" delta={kpis.usersDelta} foot={kpis.usersDelta ? t("önceki 30 güne göre") : t("son 30 günde +{count}", { count: formatNumber(kpis.users30) })} />
        <StatCard label={t("Onaylı Creator")} value={formatNumber(kpis.approvedCreators)} icon={<Star />} tone="teal" delta={kpis.creatorsDelta} foot={kpis.creatorsDelta ? t("önceki 30 güne göre") : t("son 30 günde +{count}", { count: formatNumber(kpis.creators30) })} />
        {finance ? (
          <StatCard label={t("Brüt İşlem Hacmi (30 gün)")} value={formatMoney(finance.gross30, "TRY", { decimals: false })} icon={<CreditCard />} tone="violet" delta={finance.grossDelta} foot={t("{count} başarılı işlem", { count: formatNumber(finance.count30) })} />
        ) : (
          <StatCard label={t("Bekleyen İşlem")} value={formatNumber(totalQueue)} icon={<Activity />} tone="violet" foot={t("yetkili olduğunuz kuyruklar")} />
        )}
        <StatCard label={t("Yayındaki AI İkizi")} value={formatNumber(kpis.liveTwins)} icon={<Bot />} tone="orange" foot={t("toplam {count} ikiz", { count: formatNumber(kpis.twinsTotal) })} />
      </KpiGrid>
      {finance && finance.testCount > 0 && (
        <Notice tone="warn" className="-mt-2">
          {t("Son 30 gündeki {count} işlem test/demo sağlayıcıdan gelir; tutarlar gerçek tahsilat değildir.", { count: formatNumber(finance.testCount) })}
        </Notice>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("Platform Büyümesi")} hint={t("Son 12 ay · kümülatif toplam")} />
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-1 text-[11px] font-extrabold text-muted-strong">{t("Kullanıcılar")}</p>
              <CountArea data={growth.map((g) => ({ label: g.label, value: g.users }))} label={t("Toplam kullanıcı")} height={200} />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-extrabold text-muted-strong">{t("Onaylı creator'lar")}</p>
              <CountBars data={growth.map((g) => ({ label: g.label, value: g.creators }))} label={t("Onaylı creator")} height={200} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line-soft pt-4 text-center">
            <div>
              <p className="text-[10px] font-bold text-muted">{t("Günlük Aktif")}</p>
              <p className="mt-1 text-lg font-black tracking-tight">{formatNumber(quick.dau)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted">{t("Yeni Kayıt (24 sa)")}</p>
              <p className="mt-1 text-lg font-black tracking-tight">{formatNumber(quick.signups24h)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted">{t("Ödeme Yapan / Aktif")}</p>
              <p className="mt-1 text-lg font-black tracking-tight">{quick.conversionPct === null ? "—" : formatPercent(quick.conversionPct * 100)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("Operasyon Kuyruğu")} hint={t("Öncelikli aksiyonlar")} />
          {queue.length === 0 ? (
            <EmptyState compact title={t("Kuyruk bulunmuyor")} description={t("Rolünüze ait bekleyen operasyon yok.")} />
          ) : (
            <ul className="grid gap-2.5">
              {queue.map((q) => (
                <li key={q.key}>
                  <Link href={q.href} className="flex items-center justify-between gap-3 rounded-xl border border-line-soft px-3 py-2.5 transition-colors hover:border-brand-200 hover:bg-brand-50">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-brand-100 text-brand-500 [&_svg]:size-4">{QUEUE_ICONS[q.key]}</span>
                      <span className="min-w-0">
                        <b className="block truncate text-xs text-ink">{q.label}</b>
                        <span className="block truncate text-[10px] text-muted">{q.note}</span>
                      </span>
                    </span>
                    <Badge tone={q.count === 0 ? "gray" : q.tone === "danger" ? "danger" : q.tone === "warn" ? "warn" : q.tone === "pink" ? "pink" : "gray"}>{q.count}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Notice tone="neutral" className="mt-4" icon={<ShieldCheck />}>
            {t("Moderasyon, ödeme ve kimlik doğrulama kararları gerekçeyle birlikte denetim kaydına yazılır.")}
          </Notice>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader
            title={t("Son Hareketler")}
            hint={t("Denetim günlüğünden")}
            action={
              can(user, "audit.read") ? (
                <Link href="/admin/settings?tab=audit" className="text-[11px] font-extrabold text-brand-500 hover:underline">
                  {t("Tüm etkinlikler →")}
                </Link>
              ) : null
            }
          />
          {!can(user, "audit.read") ? (
            <EmptyState compact title={t("Yetki gerekli")} description={t("Denetim kayıtlarını görüntüleme izniniz yok.")} />
          ) : recent.length === 0 ? (
            <EmptyState compact title={t("Henüz kayıt yok")} description={t("Yönetici işlemleri yapıldıkça burada görünür.")} />
          ) : (
            <ul className="grid gap-3">
              {recent.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 text-xs">
                  <span className="min-w-0">
                    <b className="block truncate text-ink">{r.action}</b>
                    <span className="block truncate text-[11px] text-muted">
                      {r.actor}
                      {r.targetType ? ` · ${r.targetType}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <StatusPill size="sm" tone={AUDIT_SEVERITY_TONES[r.severity] ?? "gray"}>
                      {labelOf(t, AUDIT_SEVERITY_LABELS, r.severity)}
                    </StatusPill>
                    <time dateTime={new Date(r.at).toISOString()} title={formatDateTime(r.at)} className="text-[10px] text-muted">
                      {formatRelative(r.at)}
                    </time>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title={t("Gelir Dağılımı")} hint={t("Son 30 gün · işlem türüne göre")} />
          {!finance ? (
            <EmptyState compact title={t("Yetki gerekli")} description={t("Gelir verilerini görmek için finans yetkisi gerekir.")} />
          ) : donut.length === 0 ? (
            <EmptyState compact title={t("Henüz veri bulunmuyor")} description={t("Son 30 günde başarılı ödeme yok.")} />
          ) : (
            <Donut data={donut} height={150} centerValue={formatMoney(finance.gross30, "TRY", { decimals: false })} centerLabel={t("brüt")} />
          )}
        </Card>

        <Card>
          <CardHeader title={t("Sistem Sağlığı")} hint={t("Yapılandırma durumu · canlı ölçüm değildir")} />
          <ul className="grid gap-2.5 text-xs">
            <li className="flex items-center justify-between gap-3">
              <span className="font-bold text-ink">{t("Veritabanı")}</span>
              <StatusPill tone={health.dbConnected ? "green" : "danger"} size="sm">
                {health.dbConnected ? t("Bağlı") : t("Bağlantı yok")}
              </StatusPill>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="font-bold text-ink">{t("AI sağlayıcısı")}</span>
              <StatusPill tone={health.ai.available ? (health.ai.mock ? "warn" : "green") : "danger"} size="sm">
                {health.ai.available ? (health.ai.mock ? t("Test (mock)") : health.ai.model ?? t("Hazır")) : t("Yapılandırılmadı")}
              </StatusPill>
            </li>
            {health.integrations.map((i) => (
              <li key={i.key} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-bold text-ink" title={i.missing.length ? t("Eksik: {value}", { value: i.missing.join(", ") }) : undefined}>
                  {t(i.label)}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-extrabold">
                  {i.configured ? <CheckCircle2 className="size-3.5 text-success" aria-hidden /> : <XCircle className="size-3.5 text-danger" aria-hidden />}
                  <span className={i.configured ? "text-success" : "text-danger"}>{i.configured ? t("Hazır") : i.mode === "mock" || i.mode === "outbox" || i.mode === "local" ? t("Test ({mode})", { mode: i.mode }) : t("Eksik")}</span>
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 border-t border-line-soft pt-2.5">
              <span className="font-bold text-ink">{t("Başarısız arka plan işi")}</span>
              <StatusPill tone={health.failedJobs ? "danger" : "green"} size="sm">
                {health.failedJobs}
              </StatusPill>
            </li>
          </ul>
          {missing.length > 0 && (
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              {t("{count} entegrasyon yapılandırılmadı; ilgili özellikler kapalı kalır.", { count: missing.length })}{" "}
              {can(user, "settings.read") && (
                <Link href="/admin/settings?tab=integrations" className="font-extrabold text-brand-500 hover:underline">
                  {t("Ayrıntılar")}
                </Link>
              )}
            </p>
          )}
        </Card>
      </div>
    </AdminPage>
  );
}
