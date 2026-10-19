import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Bot, CheckCircle2, CircleAlert, CreditCard, Flag, Gavel, ScrollText, ShieldCheck, Star, Users, Wallet, XCircle } from "lucide-react";
import { CountArea, CountBars } from "@/components/admin/charts";
import { AUDIT_SEVERITY_LABELS, AUDIT_SEVERITY_TONES, TX_KIND_LABELS } from "@/components/admin/labels";
import { AdminPage, DeniedNotice, KpiGrid, Notice, StatusPill } from "@/components/admin/ui";
import { Donut } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, StatCard } from "@/components/ui/display";
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { formatDateTime, formatMoney, formatNumber, formatRelative } from "@/lib/utils";
import { getDashboardData } from "@/services/admin/dashboard";
import { pick, type SearchParams } from "@/services/admin/shared";

export const metadata: Metadata = { title: "Genel Bakış" };

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
  const sp = await searchParams;
  const data = await getDashboardData(user);
  const { kpis, finance, growth, quick, queue, health, recent } = data;
  const donut = (finance?.byKind ?? []).map((k) => ({ name: TX_KIND_LABELS[k.kind] ?? k.kind, value: k.value }));
  const totalQueue = queue.reduce((a, q) => a + q.count, 0);
  const missing = health.integrations.filter((i) => !i.configured);

  return (
    <AdminPage title="Platform Genel Bakış" description="Kullanıcı, creator, gelir ve sistem operasyonlarını tek noktadan takip edin.">
      {pick(sp, "denied") === "1" && <DeniedNotice />}

      <KpiGrid>
        <StatCard label="Toplam Kullanıcı" value={formatNumber(kpis.totalUsers)} icon={<Users />} tone="pink" delta={kpis.usersDelta} foot={kpis.usersDelta ? "önceki 30 güne göre" : `son 30 günde +${formatNumber(kpis.users30)}`} />
        <StatCard label="Onaylı Creator" value={formatNumber(kpis.approvedCreators)} icon={<Star />} tone="teal" delta={kpis.creatorsDelta} foot={kpis.creatorsDelta ? "önceki 30 güne göre" : `son 30 günde +${formatNumber(kpis.creators30)}`} />
        {finance ? (
          <StatCard label="Brüt İşlem Hacmi (30 gün)" value={formatMoney(finance.gross30, "TRY", { decimals: false })} icon={<CreditCard />} tone="violet" delta={finance.grossDelta} foot={`${formatNumber(finance.count30)} başarılı işlem`} />
        ) : (
          <StatCard label="Bekleyen İşlem" value={formatNumber(totalQueue)} icon={<Activity />} tone="violet" foot="yetkili olduğunuz kuyruklar" />
        )}
        <StatCard label="Yayındaki AI İkizi" value={formatNumber(kpis.liveTwins)} icon={<Bot />} tone="orange" foot={`toplam ${formatNumber(kpis.twinsTotal)} ikiz`} />
      </KpiGrid>
      {finance && finance.testCount > 0 && (
        <Notice tone="warn" className="-mt-2">
          Son 30 gündeki {formatNumber(finance.testCount)} işlem test/demo sağlayıcıdan gelir; tutarlar gerçek tahsilat değildir.
        </Notice>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Platform Büyümesi" hint="Son 12 ay · kümülatif toplam" />
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-1 text-[11px] font-extrabold text-muted-strong">Kullanıcılar</p>
              <CountArea data={growth.map((g) => ({ label: g.label, value: g.users }))} label="Toplam kullanıcı" height={200} />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-extrabold text-muted-strong">Onaylı creator&apos;lar</p>
              <CountBars data={growth.map((g) => ({ label: g.label, value: g.creators }))} label="Onaylı creator" height={200} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line-soft pt-4 text-center">
            <div>
              <p className="text-[10px] font-bold text-muted">Günlük Aktif</p>
              <p className="mt-1 text-lg font-black tracking-tight">{formatNumber(quick.dau)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted">Yeni Kayıt (24 sa)</p>
              <p className="mt-1 text-lg font-black tracking-tight">{formatNumber(quick.signups24h)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted">Ödeme Yapan / Aktif</p>
              <p className="mt-1 text-lg font-black tracking-tight">{quick.conversionPct === null ? "—" : `%${quick.conversionPct.toLocaleString("tr-TR")}`}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Operasyon Kuyruğu" hint="Öncelikli aksiyonlar" />
          {queue.length === 0 ? (
            <EmptyState compact title="Kuyruk bulunmuyor" description="Rolünüze ait bekleyen operasyon yok." />
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
            Moderasyon, ödeme ve kimlik doğrulama kararları gerekçeyle birlikte denetim kaydına yazılır.
          </Notice>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Son Hareketler"
            hint="Denetim günlüğünden"
            action={
              can(user, "audit.read") ? (
                <Link href="/admin/settings?tab=audit" className="text-[11px] font-extrabold text-brand-500 hover:underline">
                  Tüm etkinlikler →
                </Link>
              ) : null
            }
          />
          {!can(user, "audit.read") ? (
            <EmptyState compact title="Yetki gerekli" description="Denetim kayıtlarını görüntüleme izniniz yok." />
          ) : recent.length === 0 ? (
            <EmptyState compact title="Henüz kayıt yok" description="Yönetici işlemleri yapıldıkça burada görünür." />
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
                      {AUDIT_SEVERITY_LABELS[r.severity] ?? r.severity}
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
          <CardHeader title="Gelir Dağılımı" hint="Son 30 gün · işlem türüne göre" />
          {!finance ? (
            <EmptyState compact title="Yetki gerekli" description="Gelir verilerini görmek için finans yetkisi gerekir." />
          ) : donut.length === 0 ? (
            <EmptyState compact title="Henüz veri bulunmuyor" description="Son 30 günde başarılı ödeme yok." />
          ) : (
            <Donut data={donut} height={150} centerValue={formatMoney(finance.gross30, "TRY", { decimals: false })} centerLabel="brüt" />
          )}
        </Card>

        <Card>
          <CardHeader title="Sistem Sağlığı" hint="Yapılandırma durumu · canlı ölçüm değildir" />
          <ul className="grid gap-2.5 text-xs">
            <li className="flex items-center justify-between gap-3">
              <span className="font-bold text-ink">Veritabanı</span>
              <StatusPill tone={health.dbConnected ? "green" : "danger"} size="sm">
                {health.dbConnected ? "Bağlı" : "Bağlantı yok"}
              </StatusPill>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="font-bold text-ink">AI sağlayıcısı</span>
              <StatusPill tone={health.ai.available ? (health.ai.mock ? "warn" : "green") : "danger"} size="sm">
                {health.ai.available ? (health.ai.mock ? "Test (mock)" : health.ai.model ?? "Hazır") : "Yapılandırılmadı"}
              </StatusPill>
            </li>
            {health.integrations.map((i) => (
              <li key={i.key} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-bold text-ink" title={i.missing.length ? `Eksik: ${i.missing.join(", ")}` : undefined}>
                  {i.label}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-extrabold">
                  {i.configured ? <CheckCircle2 className="size-3.5 text-success" aria-hidden /> : <XCircle className="size-3.5 text-danger" aria-hidden />}
                  <span className={i.configured ? "text-success" : "text-danger"}>{i.configured ? "Hazır" : i.mode === "mock" || i.mode === "outbox" || i.mode === "local" ? `Test (${i.mode})` : "Eksik"}</span>
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 border-t border-line-soft pt-2.5">
              <span className="font-bold text-ink">Başarısız arka plan işi</span>
              <StatusPill tone={health.failedJobs ? "danger" : "green"} size="sm">
                {health.failedJobs}
              </StatusPill>
            </li>
          </ul>
          {missing.length > 0 && (
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              {missing.length} entegrasyon yapılandırılmadı; ilgili özellikler kapalı kalır.{" "}
              {can(user, "settings.read") && (
                <Link href="/admin/settings?tab=integrations" className="font-extrabold text-brand-500 hover:underline">
                  Ayrıntılar
                </Link>
              )}
            </p>
          )}
        </Card>
      </div>
    </AdminPage>
  );
}
