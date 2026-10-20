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
import { m } from "@/i18n/m";
import { getFormatters, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { TWIN_STATUS_LABELS } from "@/lib/state-machines";
import { availableCaseActions, CASE_TABS, getCaseDetail, getModerationKpis, listCases, type CaseTab } from "@/services/admin/moderation";
import { msToHuman, pick, pickEnum, pickId, pickPage, type SearchParams } from "@/services/admin/shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("İçerik Moderasyonu") };
}

const TAB_LABELS: Record<CaseTab, string> = { open: m("Bekleyen"), in_review: m("İnceleniyor"), escalated: m("Eskale"), closed: m("Tamamlanan"), all: m("Tümü") };
const DANGER_ACTIONS = new Set(["remove", "suspend_user", "revoke_twin"]);
const ACTION_HINTS: Record<string, string> = {
  dismiss: m("İhlal bulunmadı; bağlı raporlar reddedilir ve vaka kapanır."),
  warn: m("Creator'a topluluk kuralları uyarısı gönderilir ve vaka kapanır."),
  hide: m("İçerik hayranlara gizlenir; creator bilgilendirilir. İtiraz halinde geri alınabilir."),
  remove: m("İçerik kaldırılır. Bu ağır bir yaptırımdır."),
  suspend_user: m("İlgili kullanıcı askıya alınır ve oturumları sonlandırılır."),
  pause_twin: m("İlgili AI ikizi duraklatılır."),
  revoke_twin: m("İlgili AI ikizi geri çekilir ve özellikleri kapatılır."),
  escalate: m("Vaka kritik önceliğe çıkarılır ve üst incelemeye yönlendirilir."),
};

export default async function AdminModerationPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("moderation.read");
  const t = await getT();
  const { formatDateTime, formatNumber, formatPercent } = await getFormatters();
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
  const mt = kpis.metrics;
  const pct = (v: number | null) => (v === null ? "—" : formatPercent(v * 100));
  const caseStatus = (s: string) => (CASE_STATUS_LABELS[s] ? t(CASE_STATUS_LABELS[s]!) : s);
  const caseSource = (s: string) => (CASE_SOURCE_LABELS[s] ? t(CASE_SOURCE_LABELS[s]!) : s);
  const targetLabel = (s: string) => (TARGET_LABELS[s] ? t(TARGET_LABELS[s]!) : s);
  const reportReason = (s: string) => (REPORT_REASON_LABELS[s] ? t(REPORT_REASON_LABELS[s]!) : s);

  return (
    <AdminPage title={t("İçerik Moderasyonu")} description={t("AI destekli inceleme, insan onayı ve politika uygulamalarını yönetin.")}>
      <KpiGrid>
        <StatCard label={t("Bekleyen İnceleme")} value={formatNumber(kpis.pending)} icon={<Inbox />} tone="pink" foot={t("{inReview} inceleniyor · {escalated} eskale", { inReview: formatNumber(kpis.counts.in_review ?? 0), escalated: formatNumber(kpis.counts.escalated ?? 0) })} />
        <StatCard label={t("Yüksek Riskli")} value={formatNumber(kpis.highRisk)} icon={<AlertOctagon />} tone="orange" foot={t("yüksek / kritik öncelik")} />
        <StatCard label={t("Bugün İncelenen")} value={formatNumber(kpis.decidedToday)} icon={<CalendarCheck />} tone="teal" />
        <StatCard label={t("Ortalama Çözüm Süresi")} value={msToHuman(kpis.avgResolutionMs, t)} icon={<Clock />} tone="violet" foot={mt.sampleSize ? t("son 30 gün · {sampleSize} karar", { sampleSize: mt.sampleSize }) : t("son 30 günde karar yok")} />
      </KpiGrid>

      <SplitLayout
        main={
          <Card>
            <CardHeader title={t("Moderasyon Kuyruğu")} hint={t("Önceliğe göre sıralandı")} />
            <TabLinks label={t("Vaka durumu")} active={tab} tabs={CASE_TABS.map((tb) => ({ key: tb, label: t(TAB_LABELS[tb]), count: kpis.counts[tb] ?? 0, href: href("/admin/moderation", { ...base, tab: tb === "open" ? null : tb, page: null }) }))} className="mb-4" />
            <FilterForm
              action="/admin/moderation"
              q={q}
              placeholder={t("Vaka numarası ara (MOD-…)")}
              hidden={{ tab: base.tab }}
              selects={[
                { name: "priority", label: t("Öncelik"), value: priority, options: [{ value: "all", label: t("Tüm öncelikler") }, ...(["critical", "high", "medium", "low"] as const).map((p) => ({ value: p, label: t(PRIORITY_LABELS[p]!) }))] },
                { name: "target", label: t("Hedef türü"), value: target, options: [{ value: "all", label: t("Tüm türler") }, ...Object.entries(TARGET_LABELS).map(([value, label]) => ({ value, label: t(label) }))] },
              ]}
              clearHref={hrefFor({ q: null, priority: null, target: null })}
            />
            {list.items.length === 0 ? (
              <EmptyState compact title={t("Vaka bulunamadı")} description={t("Bu filtreyle eşleşen moderasyon vakası yok.")} />
            ) : (
              <DataTable>
                <thead>
                  <tr>
                    <Th>{t("İnceleme / Neden")}</Th>
                    <Th>{t("İçerik türü")}</Th>
                    <Th>{t("Risk")}</Th>
                    <Th>{t("Durum")}</Th>
                    <Th className="text-end">{t("İşlem")}</Th>
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
                        <Td>{targetLabel(c.targetType)}</Td>
                        <Td>
                          <StatusPill tone={PRIORITY_TONES[c.priority] ?? "gray"}>
                            {t(PRIORITY_LABELS[c.priority]!)} · {c.riskScore}
                          </StatusPill>
                        </Td>
                        <Td>
                          <StatusPill tone={CASE_STATUS_TONES[c.status] ?? "gray"}>{caseStatus(c.status)}</StatusPill>
                        </Td>
                        <Td className="text-end">
                          <Button asChild size="xs" variant={on ? "primary" : "secondary"}>
                            <Link href={hrefFor({ sel: c.id, page: page > 1 ? page : null })} scroll={false} aria-label={t("{caseNo} vakasını incele", { caseNo: c.caseNo })}>
                              {t("İncele")}
                            </Link>
                          </Button>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            )}
            <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} noun={t("vaka")} />
            <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p, sel: selectedId })} className="mt-4" />
            <Notice tone="neutral" className="mt-4">
              {t("İnsan incelemesi gerektiren vakalarda otomatik yaptırım uygulanmadan önce ilgili politika ve kanıt kaydı incelenir. Her karar gerekçesiyle denetim kaydına yazılır.")}
            </Notice>
          </Card>
        }
        panel={
          detail ? (
            <Card>
              <CardHeader title={t("Vaka İncelemesi")} hint={detail.caseNo} />
              <div className="mb-3 flex flex-wrap gap-1.5">
                <StatusPill tone={PRIORITY_TONES[detail.priority] ?? "gray"}>{t("{priority} öncelik", { priority: t(PRIORITY_LABELS[detail.priority]!) })}</StatusPill>
                <StatusPill tone={CASE_STATUS_TONES[detail.status] ?? "gray"}>{caseStatus(detail.status)}</StatusPill>
                <StatusPill tone="gray">{t("Risk {score}/100", { score: detail.riskScore })}</StatusPill>
              </div>
              <h3 className="text-sm font-black tracking-tight text-ink">{detail.reason}</h3>
              <p className="mt-1 text-[11px] text-muted">
                {caseSource(detail.source)} · {formatDateTime(detail.createdAt)}
                {detail.categories.length > 0 && ` · ${detail.categories.map((c) => reportReason(c)).join(", ")}`}
              </p>

              <section aria-label={t("Hedef önizlemesi")} className="mt-4 rounded-xl bg-soft p-3.5 text-[11px] leading-relaxed">
                <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted">{t("Hedef · {type}", { type: targetLabel(detail.targetType) })}</p>
                {detail.target?.kind === "content" && (
                  <>
                    <p className="font-extrabold text-ink">{detail.target.title}</p>
                    <p className="text-muted-strong">
                      {t("{type} · {status} · erişim: {access} · moderasyon: {state}", { type: detail.target.type, status: detail.target.status, access: detail.target.access, state: detail.target.moderationState })}
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
                    <p className="text-muted-strong">{detail.target.shortBio || t("Biyografi yok")}</p>
                    <StatusPill size="sm" tone={TWIN_STATUS_TONES[detail.target.status] ?? "gray"} className="mt-1.5">
                      {`${TWIN_STATUS_LABELS[detail.target.status as keyof typeof TWIN_STATUS_LABELS] ? t(TWIN_STATUS_LABELS[detail.target.status as keyof typeof TWIN_STATUS_LABELS]) : detail.target.status} · v${detail.target.version}`}
                    </StatusPill>
                  </>
                )}
                {detail.target?.kind === "message" && (
                  <>
                    <p className="text-ink-soft">
                      {t("{sender} mesajı · {date} · {flag}", {
                        sender: detail.target.senderType === "ai" ? t("AI ikizi") : detail.target.senderType === "user" ? t("Hayran") : t("Sistem"),
                        date: formatDateTime(detail.target.createdAt),
                        flag: detail.target.flagged ? t("otomatik olarak işaretlendi") : t("işaret yok"),
                      })}
                    </p>
                    {detail.target.categories.length > 0 && <p className="text-muted-strong">{t("Kategoriler: {categories}", { categories: detail.target.categories.join(", ") })}</p>}
                    <p className="mt-1.5 flex items-center gap-1.5 text-[#a1262c]">{t("Sohbet içeriği gizlilik gereği burada gösterilmez; yalnız denetimli hassas erişimle okunabilir.")}</p>
                  </>
                )}
                {detail.target?.kind === "user" && (
                  <p className="text-ink-soft">
                    {t.rich("<b>{name}</b> · {email} · durum: {status}", { name: detail.target.name, email: detail.target.email, status: detail.target.status, b: (c) => <b>{c}</b> })}
                  </p>
                )}
                {detail.target?.kind === "custom_request" && (
                  <p className="text-ink-soft">
                    {t.rich("<b>{title}</b> · {type} · {status} · {credits} kredi", { title: detail.target.title, type: detail.target.type, status: detail.target.status, credits: detail.target.priceCredits, b: (c) => <b>{c}</b> })}
                  </p>
                )}
                {detail.target?.kind === "missing" && <p className="text-muted">{t("Hedef kayıt artık mevcut değil.")}</p>}
                {detail.creator && (
                  <p className="mt-2 border-t border-line pt-2 text-muted">
                    {t("Creator:")} <b className="text-ink">{detail.creator.displayName}</b> @{detail.creator.username}
                  </p>
                )}
              </section>

              <DetailRow label={t("Atanan")}>{detail.assignedTo?.name ?? t("Atanmadı")}</DetailRow>
              {detail.decision && (
                <Notice tone="info" className="mt-3">
                  <b>{t("Karar: {action}", { action: CASE_ACTION_LABELS[detail.decision.action] ? t(CASE_ACTION_LABELS[detail.decision.action]!) : detail.decision.action })}</b> · {detail.decision.by} · {formatDateTime(detail.decision.at)}
                  <br />
                  {detail.decision.note}
                </Notice>
              )}

              {detail.reports.length > 0 && (
                <section className="mt-4" aria-label={t("Bağlı raporlar")}>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted">{t("Bağlı raporlar ({count})", { count: detail.reports.length })}</p>
                  <ul className="grid gap-2">
                    {detail.reports.map((r) => (
                      <li key={r.id} className="rounded-xl border border-line-soft px-3 py-2 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <b className="text-ink">
                            {r.reportNo} · {reportReason(r.reason)}
                          </b>
                          <StatusPill size="sm" tone={REPORT_STATUS_TONES[r.status] ?? "gray"}>
                            {REPORT_STATUS_LABELS[r.status] ? t(REPORT_STATUS_LABELS[r.status]!) : r.status}
                          </StatusPill>
                        </div>
                        {r.details && <p className="mt-1 text-muted-strong">{r.details}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="mt-4" aria-label={t("İşlem geçmişi")}>
                <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">{t("İşlem geçmişi · denetim izi")}</p>
                <Timeline
                  items={[
                    ...detail.history.map((h) => ({ title: [h.from ? caseStatus(h.from) : t("Açıldı"), caseStatus(h.to)].join(" → "), meta: `${h.by} · ${formatDateTime(h.at)}${h.note ? ` · ${h.note}` : ""}`, tone: "gray" as const })),
                    { title: t("Vaka oluşturuldu"), meta: `${caseSource(detail.source)} · ${formatDateTime(detail.createdAt)}`, tone: "pink" as const },
                  ]}
                />
              </section>

              {canAct && actions.length > 0 && (
                <div className="mt-5 grid gap-2.5 border-t border-line-soft pt-4">
                  {actions.includes("assign_me") && !detail.assignedTo && (
                    <div>
                      <ActionButton action={decideCaseAction} payload={{ caseId: detail.id, action: "assign_me" }} variant="primary" size="md" className="w-full">
                        {t("İncelemeyi Başlat (üzerime al)")}
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
                              {t(CASE_ACTION_LABELS[a]!)}
                            </Button>
                          }
                          title={[t(CASE_ACTION_LABELS[a]!), detail.caseNo].join(" — ")}
                          description={ACTION_HINTS[a] ? t(ACTION_HINTS[a]!) : undefined}
                          action={decideCaseAction}
                          payload={{ caseId: detail.id, action: a }}
                          reason={{ label: t("Karar gerekçesi") }}
                          confirmLabel={t(CASE_ACTION_LABELS[a]!)}
                          tone={DANGER_ACTIONS.has(a) ? "danger" : "primary"}
                        />
                      ))}
                  </div>
                </div>
              )}
              {canAct && actions.length === 0 && <p className="mt-4 text-[11px] text-muted">{t("Bu vaka kapatılmış; yeni karar verilemez. İtirazlar Raporlar ve İtirazlar sayfasında değerlendirilir.")}</p>}
              {!canAct && <Notice tone="neutral" className="mt-4">{t("Karar vermek için \"moderation.act\" izni gerekir; bu görünüm salt okunurdur.")}</Notice>}
            </Card>
          ) : (
            <Card>
              <EmptyState compact title={t("Vaka seçin")} description={t("Ayrıntıları görmek için kuyruktan bir vaka seçin.")} />
            </Card>
          )
        }
      />

      <div className={canSensitive ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]" : "grid gap-5"}>
        <Card>
          <CardHeader title={t("Moderasyon Performansı")} hint={t("Son 30 gün · gerçek vaka kayıtlarından")} />
          <ul className="grid gap-3 text-xs">
            <li className="flex items-center justify-between">
              <span className="text-muted-strong">{t("Otomatik tespit / yayın öncesi tarama")}</span>
              <b>{pct(mt.autoSharePct)}</b>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-strong">{t("Kullanıcı bildirimi / manuel (insan)")}</span>
              <b>{pct(mt.humanSharePct)}</b>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-strong">{t("İtiraz oranı (karar başına)")}</span>
              <b>{pct(mt.appealRatePct)}</b>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-strong">{t("24 saat içinde çözülen")}</span>
              <b>{pct(mt.slaWithin24hPct)}</b>
            </li>
            <li className="flex items-center justify-between border-t border-line-soft pt-3">
              <span className="text-muted-strong">{t("Son 30 günde açılan vaka")}</span>
              <b>{formatNumber(mt.recent30)}</b>
            </li>
          </ul>
        </Card>
        {canSensitive && (
          <Card>
            <CardHeader title={t("Hassas Sohbet Erişimi")} hint={t("Yalnız vaka numarası + gerekçe ile · denetimli")} />
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
