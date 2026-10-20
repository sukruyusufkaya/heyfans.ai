import type { Metadata } from "next";
import Link from "next/link";
import { AlertOctagon, CalendarCheck, Clock, Inbox } from "lucide-react";
import { ActionButton, ActionDialog } from "@/components/admin/action-dialog";
import { CASE_ACTION_LABELS, CASE_SOURCE_LABELS, CASE_STATUS_LABELS, CASE_STATUS_TONES, PRIORITY_LABELS, PRIORITY_TONES, REPORT_REASON_LABELS, REPORT_STATUS_LABELS, REPORT_STATUS_TONES, TARGET_LABELS, TWIN_STATUS_TONES } from "@/components/admin/labels";
import { AdminPage, DetailRow, FilterForm, KpiGrid, Notice, ResultCount, SplitLayout, StatusPill, TabLinks, Timeline, href } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, DataTable, EmptyState, Pagination, StatCard, Td, Th } from "@/components/ui/display";
import { decideCaseAction } from "@/features/admin/moderation-actions";
import { SensitiveConversationAccess } from "@/features/admin/sensitive-conversation";
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { TWIN_STATUS_LABELS } from "@/lib/state-machines";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { availableCaseActions, CASE_TABS, getCaseDetail, getModerationKpis, listCases, type CaseTab } from "@/services/admin/moderation";
import { msToHuman, pick, pickEnum, pickId, pickPage, type SearchParams } from "@/services/admin/shared";

export const metadata: Metadata = { title: "İçerik Moderasyonu" };

const TAB_LABELS: Record<CaseTab, string> = { open: "Bekleyen", in_review: "İnceleniyor", escalated: "Eskale", closed: "Tamamlanan", all: "Tümü" };
const DANGER_ACTIONS = new Set(["remove", "suspend_user", "revoke_twin"]);
const ACTION_HINTS: Record<string, string> = {
  dismiss: "İhlal bulunmadı; bağlı raporlar reddedilir ve vaka kapanır.",
  warn: "Creator'a topluluk kuralları uyarısı gönderilir ve vaka kapanır.",
  hide: "İçerik hayranlara gizlenir; creator bilgilendirilir. İtiraz halinde geri alınabilir.",
  remove: "İçerik kaldırılır. Bu ağır bir yaptırımdır.",
  suspend_user: "İlgili kullanıcı askıya alınır ve oturumları sonlandırılır.",
  pause_twin: "İlgili AI ikizi duraklatılır.",
  revoke_twin: "İlgili AI ikizi geri çekilir ve özellikleri kapatılır.",
  escalate: "Vaka kritik önceliğe çıkarılır ve üst incelemeye yönlendirilir.",
};

export default async function AdminModerationPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("moderation.read");
  const sp = await searchParams;
  const tab = pickEnum(sp, "tab", CASE_TABS, "open");
  const priority = pickEnum(sp, "priority", ["all", "low", "medium", "high", "critical"] as const, "all");
  const target = pickEnum(sp, "target", ["all", "content", "message", "twin", "profile", "user", "custom_request"] as const, "all");
  const q = pick(sp, "q");
  const page = pickPage(sp);
  const canAct = can(user, "moderation.act");
  const canSensitive = can(user, "conversations.read_sensitive");

  const [kpis, list] = await Promise.all([getModerationKpis(), listCases({ tab, q, priority: priority === "all" ? "" : priority, target, page })]);
  const selectedId = pickId(sp, "sel") ?? list.items[0]?.id ?? null;
  const detail = selectedId ? await getCaseDetail(selectedId, { includeConversations: canSensitive }) : null;
  const base = { tab: tab === "open" ? null : tab, priority: priority === "all" ? null : priority, target: target === "all" ? null : target, q: q || null };
  const hrefFor = (extra: Record<string, string | number | null>) => href("/admin/moderation", { ...base, ...extra });
  const actions = detail ? availableCaseActions(detail) : [];
  const m = kpis.metrics;
  const pct = (v: number | null, suffix = "") => (v === null ? "—" : `%${v.toLocaleString("tr-TR")}${suffix}`);

  return (
    <AdminPage title="İçerik Moderasyonu" description="AI destekli inceleme, insan onayı ve politika uygulamalarını yönetin.">
      <KpiGrid>
        <StatCard label="Bekleyen İnceleme" value={formatNumber(kpis.pending)} icon={<Inbox />} tone="pink" foot={`${formatNumber(kpis.counts.in_review ?? 0)} inceleniyor · ${formatNumber(kpis.counts.escalated ?? 0)} eskale`} />
        <StatCard label="Yüksek Riskli" value={formatNumber(kpis.highRisk)} icon={<AlertOctagon />} tone="orange" foot="yüksek / kritik öncelik" />
        <StatCard label="Bugün İncelenen" value={formatNumber(kpis.decidedToday)} icon={<CalendarCheck />} tone="teal" />
        <StatCard label="Ortalama Çözüm Süresi" value={msToHuman(kpis.avgResolutionMs)} icon={<Clock />} tone="violet" foot={m.sampleSize ? `son 30 gün · ${m.sampleSize} karar` : "son 30 günde karar yok"} />
      </KpiGrid>

      <SplitLayout
        main={
          <Card>
            <CardHeader title="Moderasyon Kuyruğu" hint="Önceliğe göre sıralandı" />
            <TabLinks label="Vaka durumu" active={tab} tabs={CASE_TABS.map((t) => ({ key: t, label: TAB_LABELS[t], count: kpis.counts[t] ?? 0, href: href("/admin/moderation", { ...base, tab: t === "open" ? null : t, page: null }) }))} className="mb-4" />
            <FilterForm
              action="/admin/moderation"
              q={q}
              placeholder="Vaka numarası ara (MOD-…)"
              hidden={{ tab: base.tab }}
              selects={[
                { name: "priority", label: "Öncelik", value: priority, options: [{ value: "all", label: "Tüm öncelikler" }, ...(["critical", "high", "medium", "low"] as const).map((p) => ({ value: p, label: PRIORITY_LABELS[p]! }))] },
                { name: "target", label: "Hedef türü", value: target, options: [{ value: "all", label: "Tüm türler" }, ...Object.entries(TARGET_LABELS).map(([value, label]) => ({ value, label }))] },
              ]}
              clearHref={hrefFor({ q: null, priority: null, target: null })}
            />
            {list.items.length === 0 ? (
              <EmptyState compact title="Vaka bulunamadı" description="Bu filtreyle eşleşen moderasyon vakası yok." />
            ) : (
              <DataTable>
                <thead>
                  <tr>
                    <Th>İnceleme / Neden</Th>
                    <Th>İçerik türü</Th>
                    <Th>Risk</Th>
                    <Th>Durum</Th>
                    <Th className="text-end">İşlem</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((c) => {
                    const on = c.id === selectedId;
                    return (
                      <tr key={c.id} className={on ? "bg-brand-50/60" : undefined}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar src={c.creatorAvatar} name={c.creator ?? c.caseNo} size={34} />
                            <span className="min-w-0">
                              <b className="block text-ink">{c.caseNo}</b>
                              <small className="block max-w-[260px] truncate text-[10px] text-muted">{c.reason}</small>
                            </span>
                          </div>
                        </Td>
                        <Td>{TARGET_LABELS[c.targetType] ?? c.targetType}</Td>
                        <Td>
                          <StatusPill tone={PRIORITY_TONES[c.priority] ?? "gray"}>
                            {PRIORITY_LABELS[c.priority]} · {c.riskScore}
                          </StatusPill>
                        </Td>
                        <Td>
                          <StatusPill tone={CASE_STATUS_TONES[c.status] ?? "gray"}>{CASE_STATUS_LABELS[c.status] ?? c.status}</StatusPill>
                        </Td>
                        <Td className="text-end">
                          <Button asChild size="xs" variant={on ? "primary" : "secondary"}>
                            <Link href={hrefFor({ sel: c.id, page: page > 1 ? page : null })} scroll={false} aria-label={`${c.caseNo} vakasını incele`}>
                              İncele
                            </Link>
                          </Button>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            )}
            <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} noun="vaka" />
            <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p, sel: selectedId })} className="mt-4" />
            <Notice tone="neutral" className="mt-4">
              İnsan incelemesi gerektiren vakalarda otomatik yaptırım uygulanmadan önce ilgili politika ve kanıt kaydı incelenir. Her karar gerekçesiyle denetim kaydına yazılır.
            </Notice>
          </Card>
        }
        panel={
          detail ? (
            <Card>
              <CardHeader title="Vaka İncelemesi" hint={detail.caseNo} />
              <div className="mb-3 flex flex-wrap gap-1.5">
                <StatusPill tone={PRIORITY_TONES[detail.priority] ?? "gray"}>{PRIORITY_LABELS[detail.priority]} öncelik</StatusPill>
                <StatusPill tone={CASE_STATUS_TONES[detail.status] ?? "gray"}>{CASE_STATUS_LABELS[detail.status] ?? detail.status}</StatusPill>
                <StatusPill tone="gray">Risk {detail.riskScore}/100</StatusPill>
              </div>
              <h3 className="text-sm font-black tracking-tight text-ink">{detail.reason}</h3>
              <p className="mt-1 text-[11px] text-muted">
                {CASE_SOURCE_LABELS[detail.source] ?? detail.source} · {formatDateTime(detail.createdAt)}
                {detail.categories.length > 0 && ` · ${detail.categories.map((c) => REPORT_REASON_LABELS[c] ?? c).join(", ")}`}
              </p>

              <section aria-label="Hedef önizlemesi" className="mt-4 rounded-xl bg-soft p-3.5 text-[11px] leading-relaxed">
                <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted">Hedef · {TARGET_LABELS[detail.targetType] ?? detail.targetType}</p>
                {detail.target?.kind === "content" && (
                  <>
                    <p className="font-extrabold text-ink">{detail.target.title}</p>
                    <p className="text-muted-strong">
                      {detail.target.type} · {detail.target.status} · erişim: {detail.target.access} · moderasyon: {detail.target.moderationState}
                    </p>
                    {detail.target.caption && <p className="mt-1 text-ink-soft">{detail.target.caption}</p>}
                  </>
                )}
                {detail.target?.kind === "profile" && (
                  <>
                    <p className="font-extrabold text-ink">
                      {detail.target.displayName} <span className="font-medium text-muted">@{detail.target.username}</span>
                    </p>
                    {detail.target.headline && <p className="text-muted-strong">{detail.target.headline}</p>}
                    {detail.target.bio && <p className="mt-1 text-ink-soft">{detail.target.bio}</p>}
                  </>
                )}
                {detail.target?.kind === "twin" && (
                  <>
                    <p className="font-extrabold text-ink">{detail.target.name}</p>
                    <p className="text-muted-strong">{detail.target.shortBio || "Biyografi yok"}</p>
                    <StatusPill size="sm" tone={TWIN_STATUS_TONES[detail.target.status] ?? "gray"} className="mt-1.5">
                      {TWIN_STATUS_LABELS[detail.target.status as keyof typeof TWIN_STATUS_LABELS] ?? detail.target.status} · v{detail.target.version}
                    </StatusPill>
                  </>
                )}
                {detail.target?.kind === "message" && (
                  <>
                    <p className="text-ink-soft">
                      {detail.target.senderType === "ai" ? "AI ikizi" : detail.target.senderType === "user" ? "Hayran" : "Sistem"} mesajı · {formatDateTime(detail.target.createdAt)} · {detail.target.flagged ? "otomatik olarak işaretlendi" : "işaret yok"}
                    </p>
                    {detail.target.categories.length > 0 && <p className="text-muted-strong">Kategoriler: {detail.target.categories.join(", ")}</p>}
                    <p className="mt-1.5 flex items-center gap-1.5 text-[#a1262c]">Sohbet içeriği gizlilik gereği burada gösterilmez; yalnız denetimli hassas erişimle okunabilir.</p>
                  </>
                )}
                {detail.target?.kind === "user" && (
                  <p className="text-ink-soft">
                    <b>{detail.target.name}</b> · {detail.target.email} · durum: {detail.target.status}
                  </p>
                )}
                {detail.target?.kind === "custom_request" && (
                  <p className="text-ink-soft">
                    <b>{detail.target.title}</b> · {detail.target.type} · {detail.target.status} · {detail.target.priceCredits} kredi
                  </p>
                )}
                {detail.target?.kind === "missing" && <p className="text-muted">Hedef kayıt artık mevcut değil.</p>}
                {detail.creator && (
                  <p className="mt-2 border-t border-line pt-2 text-muted">
                    Creator: <b className="text-ink">{detail.creator.displayName}</b> @{detail.creator.username}
                  </p>
                )}
              </section>

              <DetailRow label="Atanan">{detail.assignedTo?.name ?? "Atanmadı"}</DetailRow>
              {detail.decision && (
                <Notice tone="info" className="mt-3">
                  <b>Karar: {CASE_ACTION_LABELS[detail.decision.action] ?? detail.decision.action}</b> · {detail.decision.by} · {formatDateTime(detail.decision.at)}
                  <br />
                  {detail.decision.note}
                </Notice>
              )}

              {detail.reports.length > 0 && (
                <section className="mt-4" aria-label="Bağlı raporlar">
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted">Bağlı raporlar ({detail.reports.length})</p>
                  <ul className="grid gap-2">
                    {detail.reports.map((r) => (
                      <li key={r.id} className="rounded-xl border border-line-soft px-3 py-2 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <b className="text-ink">
                            {r.reportNo} · {REPORT_REASON_LABELS[r.reason] ?? r.reason}
                          </b>
                          <StatusPill size="sm" tone={REPORT_STATUS_TONES[r.status] ?? "gray"}>
                            {REPORT_STATUS_LABELS[r.status] ?? r.status}
                          </StatusPill>
                        </div>
                        {r.details && <p className="mt-1 text-muted-strong">{r.details}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="mt-4" aria-label="İşlem geçmişi">
                <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">İşlem geçmişi · denetim izi</p>
                <Timeline
                  items={[
                    ...detail.history.map((h) => ({ title: `${CASE_STATUS_LABELS[h.from ?? ""] ?? h.from ?? "Açıldı"} → ${CASE_STATUS_LABELS[h.to] ?? h.to}`, meta: `${h.by} · ${formatDateTime(h.at)}${h.note ? ` · ${h.note}` : ""}`, tone: "gray" as const })),
                    { title: "Vaka oluşturuldu", meta: `${CASE_SOURCE_LABELS[detail.source] ?? detail.source} · ${formatDateTime(detail.createdAt)}`, tone: "pink" as const },
                  ]}
                />
              </section>

              {canAct && actions.length > 0 && (
                <div className="mt-5 grid gap-2.5 border-t border-line-soft pt-4">
                  {actions.includes("assign_me") && !detail.assignedTo && (
                    <div>
                      <ActionButton action={decideCaseAction} payload={{ caseId: detail.id, action: "assign_me" }} variant="primary" size="md" className="w-full">
                        İncelemeyi Başlat (üzerime al)
                      </ActionButton>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {actions
                      .filter((a) => a !== "assign_me")
                      .map((a) => (
                        <ActionDialog
                          key={a}
                          trigger={
                            <Button size="sm" variant={DANGER_ACTIONS.has(a) ? "danger-soft" : "secondary"}>
                              {CASE_ACTION_LABELS[a]}
                            </Button>
                          }
                          title={`${CASE_ACTION_LABELS[a]} — ${detail.caseNo}`}
                          description={ACTION_HINTS[a]}
                          action={decideCaseAction}
                          payload={{ caseId: detail.id, action: a }}
                          reason={{ label: "Karar gerekçesi" }}
                          confirmLabel={CASE_ACTION_LABELS[a]}
                          tone={DANGER_ACTIONS.has(a) ? "danger" : "primary"}
                        />
                      ))}
                  </div>
                </div>
              )}
              {canAct && actions.length === 0 && <p className="mt-4 text-[11px] text-muted">Bu vaka kapatılmış; yeni karar verilemez. İtirazlar Raporlar ve İtirazlar sayfasında değerlendirilir.</p>}
              {!canAct && <Notice tone="neutral" className="mt-4">Karar vermek için &quot;moderation.act&quot; izni gerekir; bu görünüm salt okunurdur.</Notice>}
            </Card>
          ) : (
            <Card>
              <EmptyState compact title="Vaka seçin" description="Ayrıntıları görmek için kuyruktan bir vaka seçin." />
            </Card>
          )
        }
      />

      <div className={canSensitive ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]" : "grid gap-5"}>
        <Card>
          <CardHeader title="Moderasyon Performansı" hint="Son 30 gün · gerçek vaka kayıtlarından" />
          <ul className="grid gap-3 text-xs">
            <li className="flex items-center justify-between">
              <span className="text-muted-strong">Otomatik tespit / yayın öncesi tarama</span>
              <b>{pct(m.autoSharePct)}</b>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-strong">Kullanıcı bildirimi / manuel (insan)</span>
              <b>{pct(m.humanSharePct)}</b>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-strong">İtiraz oranı (karar başına)</span>
              <b>{pct(m.appealRatePct)}</b>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-strong">24 saat içinde çözülen</span>
              <b>{pct(m.slaWithin24hPct)}</b>
            </li>
            <li className="flex items-center justify-between border-t border-line-soft pt-3">
              <span className="text-muted-strong">Son 30 günde açılan vaka</span>
              <b>{formatNumber(m.recent30)}</b>
            </li>
          </ul>
        </Card>
        {canSensitive && (
          <Card>
            <CardHeader title="Hassas Sohbet Erişimi" hint="Yalnız vaka numarası + gerekçe ile · denetimli" />
            {detail ? (
              <SensitiveConversationAccess
                key={detail.id}
                caseNo={detail.caseNo}
                conversations={detail.conversations.map((c) => ({ id: c.id, messageCount: c.messageCount, lastMessageLabel: c.lastMessageAt ? formatDateTime(c.lastMessageAt) : null }))}
              />
            ) : (
              <SensitiveConversationAccess caseNo="" conversations={[]} />
            )}
          </Card>
        )}
      </div>
    </AdminPage>
  );
}
