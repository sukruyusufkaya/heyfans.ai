import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Flag, Scale } from "lucide-react";
import { ActionDialog, ActionForm } from "@/components/admin/action-dialog";
import {
  APPEAL_STATUS_LABELS,
  APPEAL_STATUS_TONES,
  CASE_ACTION_LABELS,
  PRIORITY_LABELS,
  PRIORITY_TONES,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_TONES,
  TARGET_LABELS,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_TONES,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
} from "@/components/admin/labels";
import { AdminPage, DetailRow, FilterForm, KpiGrid, Notice, ResultCount, SplitLayout, StatusPill, TabLinks, Timeline, href } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, EmptyState, Pagination, StatCard, Td, Th } from "@/components/ui/display";
import { decideAppealAction, replyTicketAction, setTicketStatusAction, updateReportStatusAction } from "@/features/admin/reports-actions";
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { formatDateTime, formatNumber } from "@/lib/utils";
import {
  APPEAL_STATUS_FILTERS,
  getReportCounts,
  getReportDetail,
  getReportKpis,
  getSlaMetrics,
  getTicketCounts,
  listAppeals,
  listReports,
  listTickets,
  REPORT_STATUS_FILTERS,
  TICKET_STATUS_FILTERS,
} from "@/services/admin/reports";
import { pick, pickEnum, pickId, pickPage, type SearchParams } from "@/services/admin/shared";
import { REPORT_REASONS } from "@/models/safety";

export const metadata: Metadata = { title: "Raporlar ve İtirazlar" };

const STATUS_ALL = { all: "Tümü" };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("reports.read");
  const sp = await searchParams;
  const canSupport = can(user, "support.read");
  const tab = pickEnum(sp, "tab", canSupport ? (["reports", "appeals", "support"] as const) : (["reports", "appeals"] as const), "reports");
  const page = pickPage(sp);
  const q = pick(sp, "q");
  const sel = pickId(sp, "sel");

  const [kpis, counts, ticketCounts, sla] = await Promise.all([getReportKpis(), getReportCounts(), canSupport ? getTicketCounts() : Promise.resolve(null), getSlaMetrics(canSupport)]);
  const tabs = [
    { key: "reports", label: "Raporlar", count: counts.reports.all ?? 0, href: href("/admin/reports", {}) },
    { key: "appeals", label: "İtirazlar", count: counts.appeals.all ?? 0, href: href("/admin/reports", { tab: "appeals" }) },
    ...(canSupport ? [{ key: "support", label: "Destek Talepleri", count: ticketCounts?.all ?? 0, href: href("/admin/reports", { tab: "support" }) }] : []),
  ];
  const pctText = (m: { pct: number; n: number } | null) => (m ? `%${m.pct}` : "—");
  const nText = (m: { pct: number; n: number } | null) => (m ? `${m.n} örnek` : "örnek yok");

  return (
    <AdminPage title="Raporlar ve İtirazlar" description="Güvenlik bildirimlerini, kullanıcı şikâyetlerini ve itiraz süreçlerini takip edin.">
      <KpiGrid>
        <StatCard label="Açık Rapor" value={formatNumber(kpis.openReports)} icon={<Flag />} tone="pink" foot={`bugün +${formatNumber(kpis.newToday)}`} />
        <StatCard label="İtiraz Bekleyen" value={formatNumber(kpis.pendingAppeals)} icon={<Scale />} tone="orange" foot={`son 7 günde ${formatNumber(kpis.newAppeals)} yeni`} />
        <StatCard label="Çözülen Rapor" value={formatNumber(kpis.resolved)} icon={<CheckCircle2 />} tone="teal" />
        <StatCard label="Ortalama Çözüm Süresi" value={kpis.avgResolution} icon={<Clock />} tone="violet" foot={kpis.avgSample ? `son 30 gün · ${kpis.avgSample} rapor` : "son 30 günde çözülen yok"} />
      </KpiGrid>

      <Card>
        <TabLinks label="Vaka türü" active={tab} tabs={tabs} className="mb-4" />
        {tab === "reports" && <ReportsTab sp={sp} page={page} q={q} sel={sel} canManage={can(user, "reports.manage")} canModeration={can(user, "moderation.read")} counts={counts.reports} />}
        {tab === "appeals" && <AppealsTab sp={sp} page={page} sel={sel} canManage={can(user, "appeals.manage")} counts={counts.appeals} />}
        {tab === "support" && canSupport && ticketCounts && <SupportTab sp={sp} page={page} q={q} sel={sel} canManage={can(user, "support.manage")} counts={ticketCounts} />}
      </Card>

      <Card>
        <CardHeader title="Hizmet Seviyesi Takibi" hint="Son 90 gün · gerçek kayıtlardan hesaplanır" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-soft px-4 py-3.5">
            <p className="text-[11px] font-bold text-muted">Kritik vaka ≤ 1 saat</p>
            <p className="mt-1 text-xl font-black tracking-tight text-ink">{pctText(sla.critical)}</p>
            <p className="text-[10px] text-muted">{nText(sla.critical)}</p>
          </div>
          <div className="rounded-xl bg-soft px-4 py-3.5">
            <p className="text-[11px] font-bold text-muted">Standart vaka ≤ 24 saat</p>
            <p className="mt-1 text-xl font-black tracking-tight text-ink">{pctText(sla.standard)}</p>
            <p className="text-[10px] text-muted">{nText(sla.standard)}</p>
          </div>
          <div className="rounded-xl bg-soft px-4 py-3.5">
            <p className="text-[11px] font-bold text-muted">İtiraz çözümü ≤ 7 gün</p>
            <p className="mt-1 text-xl font-black tracking-tight text-ink">{pctText(sla.appeals)}</p>
            <p className="text-[10px] text-muted">{nText(sla.appeals)}</p>
          </div>
          {canSupport && (
            <div className="rounded-xl bg-soft px-4 py-3.5">
              <p className="text-[11px] font-bold text-muted">Destek ilk yanıt ≤ 24 saat</p>
              <p className="mt-1 text-xl font-black tracking-tight text-ink">{pctText(sla.support)}</p>
              <p className="text-[10px] text-muted">{nText(sla.support)}</p>
            </div>
          )}
        </div>
      </Card>
    </AdminPage>
  );
}

/* ─── Raporlar ─────────────────────────────────────────────── */
async function ReportsTab({ sp, page, q, sel, canManage, canModeration, counts }: { sp: SearchParams; page: number; q: string; sel: string | null; canManage: boolean; canModeration: boolean; counts: Record<string, number> }) {
  const status = pickEnum(sp, "status", REPORT_STATUS_FILTERS, "all");
  const reason = pickEnum(sp, "reason", ["all", ...REPORT_REASONS] as const, "all");
  const list = await listReports({ status, reason: reason === "all" ? "" : reason, q, page });
  const selectedId = sel ?? list.items[0]?.id ?? null;
  const detail = selectedId ? await getReportDetail(selectedId) : null;
  const base = { status: status === "all" ? null : status, reason: reason === "all" ? null : reason, q: q || null };
  const hrefFor = (extra: Record<string, string | number | null>) => href("/admin/reports", { ...base, ...extra });
  return (
    <SplitLayout
      main={
        <>
          <TabLinks
            label="Rapor durumu"
            active={status}
            tabs={REPORT_STATUS_FILTERS.map((s) => ({ key: s, label: s === "all" ? STATUS_ALL.all : REPORT_STATUS_LABELS[s]!, count: counts[s] ?? 0, href: href("/admin/reports", { status: s === "all" ? null : s, reason: base.reason, q: base.q }) }))}
            className="mb-3"
          />
          <FilterForm
            action="/admin/reports"
            q={q}
            placeholder="Rapor numarası ara (RPT-…)"
            hidden={{ status: base.status }}
            selects={[{ name: "reason", label: "Rapor nedeni", value: reason, options: [{ value: "all", label: "Tüm nedenler" }, ...REPORT_REASONS.map((r) => ({ value: r, label: REPORT_REASON_LABELS[r]! }))] }]}
            clearHref={hrefFor({ q: null, reason: null })}
          />
          {list.items.length === 0 ? (
            <EmptyState compact title="Rapor bulunamadı" description="Bu filtreyle eşleşen rapor yok." />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>Vaka / Konu</Th>
                  <Th>Öncelik</Th>
                  <Th>Durum</Th>
                  <Th>Tarih</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((r) => {
                  const on = r.id === selectedId;
                  return (
                    <tr key={r.id} className={on ? "bg-brand-50/60" : undefined}>
                      <Td>
                        <b className="block text-ink">{r.reportNo}</b>
                        <span className="block text-[10px] text-muted">
                          {REPORT_REASON_LABELS[r.reason] ?? r.reason} · {TARGET_LABELS[r.targetType] ?? r.targetType}
                        </span>
                      </Td>
                      <Td>{r.priority ? <StatusPill tone={PRIORITY_TONES[r.priority] ?? "gray"}>{PRIORITY_LABELS[r.priority]}</StatusPill> : "—"}</Td>
                      <Td>
                        <StatusPill tone={REPORT_STATUS_TONES[r.status] ?? "gray"}>{REPORT_STATUS_LABELS[r.status] ?? r.status}</StatusPill>
                      </Td>
                      <Td className="whitespace-nowrap">{formatDateTime(r.createdAt)}</Td>
                      <Td className="text-right">
                        <Button asChild size="xs" variant={on ? "primary" : "secondary"}>
                          <Link href={hrefFor({ sel: r.id, page: page > 1 ? page : null })} scroll={false} aria-label={`${r.reportNo} raporunu aç`}>
                            Aç
                          </Link>
                        </Button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          )}
          <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} noun="rapor" />
          <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p, sel: selectedId })} className="mt-4" />
        </>
      }
      panel={
        detail ? (
          <div className="rounded-2xl border border-line-soft p-5">
            <CardHeader title="Seçili Rapor" hint={detail.reportNo} as="h3" />
            <div className="mb-3 flex flex-wrap gap-1.5">
              {detail.case && <StatusPill tone={PRIORITY_TONES[detail.case.priority] ?? "gray"}>{PRIORITY_LABELS[detail.case.priority]}</StatusPill>}
              <StatusPill tone={REPORT_STATUS_TONES[detail.status] ?? "gray"}>{REPORT_STATUS_LABELS[detail.status] ?? detail.status}</StatusPill>
            </div>
            <h4 className="text-sm font-black tracking-tight text-ink">{REPORT_REASON_LABELS[detail.reason] ?? detail.reason}</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-strong">{detail.details || "Bildirimde ek açıklama yok."}</p>
            <div className="mt-3">
              <DetailRow label="Hedef">{TARGET_LABELS[detail.targetType] ?? detail.targetType}</DetailRow>
              <DetailRow label="Bildiren">{detail.reporter?.name ?? "—"}</DetailRow>
              <DetailRow label="Oluşturuldu">{formatDateTime(detail.createdAt)}</DetailRow>
              {detail.case && (
                <DetailRow label="Bağlı vaka">
                  {canModeration ? (
                    <Link href={href("/admin/moderation", { tab: "all", sel: detail.case.id })} className="text-brand-500 hover:underline">
                      {detail.case.caseNo} →
                    </Link>
                  ) : (
                    detail.case.caseNo
                  )}
                </DetailRow>
              )}
              {detail.resolutionNote && <DetailRow label="Karar notu">{detail.resolutionNote}</DetailRow>}
            </div>
            {canManage && (detail.status === "open" || detail.status === "triaged") && (
              <div className="mt-4 grid gap-2.5 border-t border-line-soft pt-4">
                {detail.status === "open" && (
                  <ActionDialog
                    trigger={<Button size="md">İncelemeyi Başlat</Button>}
                    title="Raporu incelemeye al"
                    description="Rapor 'incelemede' durumuna geçer. Yaptırım kararı Moderasyon sayfasında vaka üzerinden verilir."
                    action={updateReportStatusAction}
                    payload={{ reportId: detail.id, to: "triaged" }}
                    reason={{ label: "Triyaj notu", defaultValue: "Rapor incelemeye alındı; ilgili vaka moderasyon kuyruğunda." }}
                    confirmLabel="İncelemeye al"
                  />
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <ActionDialog
                    trigger={
                      <Button size="sm" variant="secondary">
                        Çözüldü
                      </Button>
                    }
                    title="Raporu çözüldü olarak işaretle"
                    action={updateReportStatusAction}
                    payload={{ reportId: detail.id, to: "resolved" }}
                    reason={{ label: "Çözüm notu" }}
                    confirmLabel="Çözüldü"
                  />
                  <ActionDialog
                    trigger={
                      <Button size="sm" variant="danger-soft">
                        Reddet
                      </Button>
                    }
                    title="Raporu reddet"
                    description="Rapor geçersiz / kural ihlali yok."
                    action={updateReportStatusAction}
                    payload={{ reportId: detail.id, to: "rejected" }}
                    reason={{ label: "Ret gerekçesi" }}
                    confirmLabel="Reddet"
                    tone="danger"
                  />
                </div>
              </div>
            )}
            {!canManage && <Notice tone="neutral" className="mt-4">Rapor durumunu değiştirmek için &quot;reports.manage&quot; izni gerekir.</Notice>}
          </div>
        ) : (
          <EmptyState compact title="Rapor seçin" description="Ayrıntı için listeden bir rapor seçin." />
        )
      }
    />
  );
}

/* ─── İtirazlar ────────────────────────────────────────────── */
async function AppealsTab({ sp, page, sel, canManage, counts }: { sp: SearchParams; page: number; sel: string | null; canManage: boolean; counts: Record<string, number> }) {
  const status = pickEnum(sp, "status", APPEAL_STATUS_FILTERS, "all");
  const list = await listAppeals({ status, page });
  const selected = list.items.find((a) => a.id === sel) ?? list.items[0] ?? null;
  const hrefFor = (extra: Record<string, string | number | null>) => href("/admin/reports", { tab: "appeals", status: status === "all" ? null : status, ...extra });
  return (
    <SplitLayout
      main={
        <>
          <TabLinks label="İtiraz durumu" active={status} tabs={APPEAL_STATUS_FILTERS.map((s) => ({ key: s, label: s === "all" ? STATUS_ALL.all : APPEAL_STATUS_LABELS[s]!, count: counts[s] ?? 0, href: href("/admin/reports", { tab: "appeals", status: s === "all" ? null : s }) }))} className="mb-4" />
          {list.items.length === 0 ? (
            <EmptyState compact title="İtiraz bulunamadı" description="Bu durumda itiraz yok." />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>İtiraz / Vaka</Th>
                  <Th>İtiraz eden</Th>
                  <Th>Durum</Th>
                  <Th>Tarih</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((a) => {
                  const on = a.id === selected?.id;
                  return (
                    <tr key={a.id} className={on ? "bg-brand-50/60" : undefined}>
                      <Td>
                        <b className="block text-ink">{a.appealNo}</b>
                        <span className="block text-[10px] text-muted">{a.case?.caseNo ?? "—"} · {a.case?.reason ?? ""}</span>
                      </Td>
                      <Td>{a.user}</Td>
                      <Td>
                        <StatusPill tone={APPEAL_STATUS_TONES[a.status] ?? "gray"}>{APPEAL_STATUS_LABELS[a.status] ?? a.status}</StatusPill>
                      </Td>
                      <Td className="whitespace-nowrap">{formatDateTime(a.createdAt)}</Td>
                      <Td className="text-right">
                        <Button asChild size="xs" variant={on ? "primary" : "secondary"}>
                          <Link href={hrefFor({ sel: a.id, page: page > 1 ? page : null })} scroll={false} aria-label={`${a.appealNo} itirazını aç`}>
                            Aç
                          </Link>
                        </Button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          )}
          <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} noun="itiraz" />
          <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p, sel: selected?.id ?? null })} className="mt-4" />
        </>
      }
      panel={
        selected ? (
          <div className="rounded-2xl border border-line-soft p-5">
            <CardHeader title="Seçili İtiraz" hint={selected.appealNo} as="h3" />
            <StatusPill tone={APPEAL_STATUS_TONES[selected.status] ?? "gray"}>{APPEAL_STATUS_LABELS[selected.status] ?? selected.status}</StatusPill>
            <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-muted">İtiraz gerekçesi</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{selected.reason}</p>
            {selected.case && (
              <div className="mt-3 rounded-xl bg-soft p-3 text-[11px] leading-relaxed">
                <p className="font-extrabold text-ink">
                  {selected.case.caseNo} · {TARGET_LABELS[selected.case.targetType] ?? selected.case.targetType}
                </p>
                <p className="text-muted-strong">{selected.case.reason}</p>
                {selected.case.decision && (
                  <p className="mt-1 text-muted-strong">
                    Uygulanan karar: <b>{CASE_ACTION_LABELS[selected.case.decision.action] ?? selected.case.decision.action}</b> — {selected.case.decision.note}
                  </p>
                )}
              </div>
            )}
            {selected.decisionNote && <Notice tone="info" className="mt-3">Karar notu: {selected.decisionNote}</Notice>}
            <p className="mb-2 mt-4 text-[10px] font-black uppercase tracking-wider text-muted">Geçmiş</p>
            <Timeline items={selected.history.map((h) => ({ title: `${h.from ? APPEAL_STATUS_LABELS[h.from] ?? h.from : "Oluşturuldu"} → ${APPEAL_STATUS_LABELS[h.to] ?? h.to}`, meta: `${formatDateTime(h.at)}${h.note ? ` · ${h.note}` : ""}`, tone: "gray" as const }))} />
            {canManage && (selected.status === "open" || selected.status === "in_review") && (
              <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-line-soft pt-4">
                <ActionDialog
                  trigger={<Button size="md">İtirazı Kabul Et</Button>}
                  title="İtirazı kabul et (kararı kaldır)"
                  description="Moderasyon kararı geri alınır; kaldırılan/gizlenen içerik yeniden yayına alınır ve kullanıcı bilgilendirilir."
                  action={decideAppealAction}
                  payload={{ appealId: selected.id, decision: "overturned" }}
                  reason={{ label: "Kabul gerekçesi" }}
                  confirmLabel="Kararı kaldır"
                />
                <ActionDialog
                  trigger={
                    <Button size="md" variant="danger-soft">
                      Reddet
                    </Button>
                  }
                  title="İtirazı reddet (kararı koru)"
                  description="Orijinal moderasyon kararı geçerli kalır; kullanıcı bilgilendirilir."
                  action={decideAppealAction}
                  payload={{ appealId: selected.id, decision: "upheld" }}
                  reason={{ label: "Ret gerekçesi" }}
                  confirmLabel="Kararı koru"
                  tone="danger"
                />
              </div>
            )}
            {!canManage && <Notice tone="neutral" className="mt-4">İtiraz kararı vermek için &quot;appeals.manage&quot; izni gerekir.</Notice>}
          </div>
        ) : (
          <EmptyState compact title="İtiraz seçin" description="Ayrıntı için listeden bir itiraz seçin." />
        )
      }
    />
  );
}

/* ─── Destek talepleri ─────────────────────────────────────── */
async function SupportTab({ sp, page, q, sel, canManage, counts }: { sp: SearchParams; page: number; q: string; sel: string | null; canManage: boolean; counts: Record<string, number> }) {
  const status = pickEnum(sp, "status", TICKET_STATUS_FILTERS, "all");
  const list = await listTickets({ status, q, page });
  const selected = list.items.find((t) => t.id === sel) ?? list.items[0] ?? null;
  const base = { tab: "support", status: status === "all" ? null : status, q: q || null };
  const hrefFor = (extra: Record<string, string | number | null>) => href("/admin/reports", { ...base, ...extra });
  return (
    <SplitLayout
      main={
        <>
          <TabLinks label="Talep durumu" active={status} tabs={TICKET_STATUS_FILTERS.map((s) => ({ key: s, label: s === "all" ? STATUS_ALL.all : TICKET_STATUS_LABELS[s]!, count: counts[s] ?? 0, href: href("/admin/reports", { tab: "support", status: s === "all" ? null : s, q: base.q }) }))} className="mb-3" />
          <FilterForm action="/admin/reports" q={q} placeholder="Talep no, konu veya e-posta ara" hidden={{ tab: "support", status: base.status }} clearHref={hrefFor({ q: null })} />
          {list.items.length === 0 ? (
            <EmptyState compact title="Destek talebi bulunamadı" description="Bu filtreyle eşleşen talep yok." />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>Talep / Konu</Th>
                  <Th>Kategori</Th>
                  <Th>Öncelik</Th>
                  <Th>Durum</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((t) => {
                  const on = t.id === selected?.id;
                  return (
                    <tr key={t.id} className={on ? "bg-brand-50/60" : undefined}>
                      <Td>
                        <b className="block text-ink">{t.ticketNo}</b>
                        <span className="block max-w-[240px] truncate text-[10px] text-muted">{t.subject}</span>
                      </Td>
                      <Td>{TICKET_CATEGORY_LABELS[t.category] ?? t.category}</Td>
                      <Td>
                        <StatusPill tone={TICKET_PRIORITY_TONES[t.priority] ?? "gray"}>{TICKET_PRIORITY_LABELS[t.priority] ?? t.priority}</StatusPill>
                      </Td>
                      <Td>
                        <StatusPill tone={TICKET_STATUS_TONES[t.status] ?? "gray"}>{TICKET_STATUS_LABELS[t.status] ?? t.status}</StatusPill>
                      </Td>
                      <Td className="text-right">
                        <Button asChild size="xs" variant={on ? "primary" : "secondary"}>
                          <Link href={hrefFor({ sel: t.id, page: page > 1 ? page : null })} scroll={false} aria-label={`${t.ticketNo} talebini aç`}>
                            Aç
                          </Link>
                        </Button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          )}
          <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} noun="talep" />
          <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p, sel: selected?.id ?? null })} className="mt-4" />
        </>
      }
      panel={
        selected ? (
          <div className="rounded-2xl border border-line-soft p-5">
            <CardHeader title={selected.ticketNo} hint={selected.subject} as="h3" />
            <div className="mb-3 flex flex-wrap gap-1.5">
              <StatusPill tone={TICKET_STATUS_TONES[selected.status] ?? "gray"}>{TICKET_STATUS_LABELS[selected.status] ?? selected.status}</StatusPill>
              <StatusPill tone={TICKET_PRIORITY_TONES[selected.priority] ?? "gray"}>{TICKET_PRIORITY_LABELS[selected.priority] ?? selected.priority}</StatusPill>
              <StatusPill tone="gray">{TICKET_CATEGORY_LABELS[selected.category] ?? selected.category}</StatusPill>
            </div>
            <DetailRow label="Gönderen">
              {selected.name} · {selected.email}
            </DetailRow>
            <DetailRow label="Oluşturuldu">{formatDateTime(selected.createdAt)}</DetailRow>
            <DetailRow label="Atanan">{selected.assignedTo ?? "Atanmadı"}</DetailRow>
            <ol className="mt-4 grid gap-2.5" aria-label="Yazışma">
              <li className="rounded-xl bg-soft px-3 py-2.5 text-[11px]">
                <p className="mb-1 text-[10px] font-bold text-muted">
                  {selected.name} · {formatDateTime(selected.createdAt)}
                </p>
                <p className="whitespace-pre-wrap break-words leading-relaxed text-ink-soft">{selected.message}</p>
              </li>
              {selected.replies.map((r, i) => (
                <li key={i} className={`rounded-xl px-3 py-2.5 text-[11px] ${r.authorType === "agent" ? "bg-brand-50" : "bg-soft"}`}>
                  <p className="mb-1 text-[10px] font-bold text-muted">
                    {r.author} {r.authorType === "agent" ? "(destek)" : ""} · {formatDateTime(r.at)}
                  </p>
                  <p className="whitespace-pre-wrap break-words leading-relaxed text-ink-soft">{r.body}</p>
                </li>
              ))}
            </ol>
            {canManage ? (
              <div className="mt-4 grid gap-4 border-t border-line-soft pt-4">
                {selected.status !== "closed" && (
                  <ActionForm
                    key={`${selected.id}-${selected.replies.length}`}
                    action={replyTicketAction}
                    payload={{ ticketId: selected.id }}
                    fields={[{ name: "body", label: "Yanıtınız", type: "textarea", rows: 4, maxLength: 5000, placeholder: "Kullanıcıya iletilecek yanıtı yazın", required: true }]}
                    submitLabel="Yanıtı Gönder"
                    resetOnSuccess
                  />
                )}
                <ActionForm
                  key={`${selected.id}-${selected.status}`}
                  action={setTicketStatusAction}
                  payload={{ ticketId: selected.id }}
                  fields={[{ name: "status", label: "Talep durumu", type: "select", defaultValue: selected.status, options: (["open", "pending", "resolved", "closed"] as const).map((s) => ({ value: s, label: TICKET_STATUS_LABELS[s]! })) }]}
                  submitLabel="Durumu Güncelle"
                  variant="secondary"
                />
              </div>
            ) : (
              <Notice tone="neutral" className="mt-4">Yanıt vermek için &quot;support.manage&quot; izni gerekir.</Notice>
            )}
          </div>
        ) : (
          <EmptyState compact title="Talep seçin" description="Yazışma için listeden bir talep seçin." />
        )
      }
    />
  );
}
