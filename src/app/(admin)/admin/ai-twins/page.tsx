import type { Metadata } from "next";
import Link from "next/link";
import { Bot, ClipboardCheck, Gauge, Radio } from "lucide-react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { CONSENT_LABELS, TWIN_STATUS_TONES, TWIN_VERSION_STATUS_LABELS } from "@/components/admin/labels";
import { AdminPage, DetailRow, FilterForm, KpiGrid, Notice, ResultCount, ScoreBar, SplitLayout, StatusPill, TabLinks, Timeline, href } from "@/components/admin/ui";
import { AiTwinLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, DataTable, EmptyState, Pagination, Progress, StatCard, Td, Th } from "@/components/ui/display";
import { reviewTwinVersionAction, setTwinStatusAction } from "@/features/admin/twins-actions";
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { canTransition, TWIN_STATUS_LABELS, TWIN_TRANSITIONS } from "@/lib/state-machines";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { getAdminTwinDetail, getTwinKpis, listAdminTwins, TWIN_TABS, type TwinTab } from "@/services/admin/twins";
import { pick, pickEnum, pickId, pickPage, type SearchParams } from "@/services/admin/shared";

export const metadata: Metadata = { title: "AI İkizleri" };

const TAB_LABELS: Record<TwinTab, string> = {
  all: "Tüm İkizler",
  live: "Yayında",
  pending_review: "İncelemede",
  approved: "Onaylı",
  paused: "Duraklatıldı",
  rejected: "Reddedildi",
  revoked: "Geri çekildi",
  draft: "Taslak",
};
const LENGTH: Record<string, string> = { short: "Kısa", medium: "Orta", long: "Uzun" };
const EMOJI: Record<string, string> = { none: "Yok", low: "Az", medium: "Orta", high: "Çok" };

function Slider({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] text-muted">
        <span>{label}</span>
        <b className="text-ink">{value}</b>
      </div>
      <Progress value={value} tone="violet" label={label} />
    </div>
  );
}

function Flag({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-ink-soft">{children}</span>
      <StatusPill size="sm" tone={on ? "warn" : "gray"}>
        {on ? "Açık" : "Kapalı"}
      </StatusPill>
    </li>
  );
}

export default async function AdminAiTwinsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("twins.read");
  const sp = await searchParams;
  const tab = pickEnum(sp, "status", TWIN_TABS, "all");
  const q = pick(sp, "q");
  const page = pickPage(sp);
  const canReview = can(user, "twins.review");
  const canManage = can(user, "twins.manage");

  const [kpis, list] = await Promise.all([getTwinKpis(), listAdminTwins({ tab, q, page })]);
  const selectedId = pickId(sp, "sel") ?? list.items[0]?.id ?? null;
  const detail = selectedId ? await getAdminTwinDetail(selectedId, { consents: can(user, "consents.read") }) : null;
  const hrefFor = (extra: Record<string, string | number | null>) => href("/admin/ai-twins", { status: tab === "all" ? null : tab, q: q || null, ...extra });
  const fv = detail?.focusVersion ?? null;

  return (
    <AdminPage
      title="AI İkizi Yönetimi"
      description="AI ikizlerinin izinlerini, yayın durumlarını ve kalite ölçümlerini denetleyin."
      actions={
        <>
          <Button asChild variant="outline" size="md">
            <Link href={href("/admin/ai-twins", { status: "pending_review" })}>Onay Kuyruğu</Link>
          </Button>
        </>
      }
    >
      <KpiGrid>
        <StatCard label="Toplam AI İkizi" value={formatNumber(kpis.counts.all)} icon={<Bot />} tone="pink" />
        <StatCard label="Yayındaki AI İkizi" value={formatNumber(kpis.counts.live)} icon={<Radio />} tone="teal" />
        <StatCard label="Onay Bekleyen Sürüm" value={formatNumber(kpis.pendingVersions)} icon={<ClipboardCheck />} tone="orange" />
        <StatCard label="Ortalama Kalite" value={kpis.avgQuality === null ? "—" : `%${Math.round(kpis.avgQuality)}`} icon={<Gauge />} tone="violet" foot={kpis.scored ? `${kpis.scored} ikiz puanlı` : "kalite testi yapılmadı"} />
      </KpiGrid>

      <SplitLayout
        main={
          <Card>
            <CardHeader title="AI İkizleri" hint="Model ve sürüm yönetimi" />
            <TabLinks label="İkiz durumu" active={tab} tabs={TWIN_TABS.map((t) => ({ key: t, label: TAB_LABELS[t], count: kpis.counts[t] ?? 0, href: href("/admin/ai-twins", { status: t === "all" ? null : t, q: q || null }) }))} className="mb-4" />
            <FilterForm action="/admin/ai-twins" q={q} placeholder="İkiz veya creator adı ara" hidden={{ status: tab === "all" ? null : tab }} clearHref={hrefFor({ q: null })} />
            {list.items.length === 0 ? (
              <EmptyState compact title="AI ikizi bulunamadı" description="Filtreleri değiştirmeyi deneyin." />
            ) : (
              <DataTable>
                <thead>
                  <tr>
                    <Th>AI ikizi / Creator</Th>
                    <Th>Sürüm</Th>
                    <Th>Durum</Th>
                    <Th className="text-end">Sohbet</Th>
                    <Th className="text-end">Kalite</Th>
                    <Th className="text-end">İşlem</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((t) => {
                    const on = t.id === selectedId;
                    return (
                      <tr key={t.id} className={on ? "bg-brand-50/60" : undefined}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar src={t.avatarUrl} name={t.creator} size={36} />
                            <span className="min-w-0">
                              <b className="flex items-center gap-1.5 truncate text-ink">
                                {t.name}
                                <AiTwinLabel />
                              </b>
                              <small className="block truncate text-[10px] text-muted">{t.creator}</small>
                            </span>
                          </div>
                        </Td>
                        <Td>
                          <StatusPill tone="gray">v{t.version}</StatusPill>
                          {t.hasPending && (
                            <StatusPill tone="warn" size="sm" className="ms-1.5">
                              Onay bekliyor
                            </StatusPill>
                          )}
                        </Td>
                        <Td>
                          <StatusPill tone={TWIN_STATUS_TONES[t.status] ?? "gray"}>{TWIN_STATUS_LABELS[t.status]}</StatusPill>
                        </Td>
                        <Td className="text-end tabular-nums">{t.conversations ? formatNumber(t.conversations) : "—"}</Td>
                        <Td className="text-end tabular-nums">{t.quality === null ? "—" : `%${Math.round(t.quality)}`}</Td>
                        <Td className="text-end">
                          <Button asChild size="xs" variant={on ? "primary" : "secondary"}>
                            <Link href={hrefFor({ sel: t.id, page: page > 1 ? page : null })} scroll={false} aria-label={`${t.name} ikizini yönet`}>
                              Yönet
                            </Link>
                          </Button>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            )}
            <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} noun="ikiz" />
            <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p, sel: selectedId })} className="mt-4" />
            <Notice tone="neutral" className="mt-4">
              Tüm AI ikizleri kimlik doğrulaması, creator izni ve içerik sınırlarıyla ilişkilendirilir. Yayındaki ikizin yeni sürümü onaylandığında doğrudan canlı sürüm olur.
            </Notice>
          </Card>
        }
        panel={
          detail ? (
            <Card>
              <CardHeader title="Seçili AI İkizi" hint="İzin ve sürüm kontrolü" />
              <div className="mb-4 flex items-center gap-3">
                <Avatar src={detail.creator?.avatarUrl} name={detail.creator?.displayName ?? detail.name} size={52} />
                <div className="min-w-0">
                  <h3 className="flex flex-wrap items-center gap-1.5 text-base font-black tracking-tight text-ink">
                    <span className="truncate">{detail.name}</span>
                    <AiTwinLabel />
                  </h3>
                  <p className="truncate text-[11px] text-muted">Creator: {detail.creator?.displayName ?? "—"}</p>
                  <StatusPill size="sm" tone={TWIN_STATUS_TONES[detail.status] ?? "gray"} className="mt-1.5">
                    {TWIN_STATUS_LABELS[detail.status]}
                  </StatusPill>
                </div>
              </div>

              <DetailRow label="Güncel sürüm">v{detail.currentVersion}</DetailRow>
              <DetailRow label="Creator hesabı">{detail.creator ? `${detail.creator.status === "approved" ? "Aktif" : detail.creator.status} · kimlik ${detail.creator.identity === "verified" ? "doğrulandı" : "bekliyor"}` : "—"}</DetailRow>
              <DetailRow label="Son kalite testi">{detail.quality.lastTestAt ? formatDate(detail.quality.lastTestAt) : "Yapılmadı"}</DetailRow>
              <DetailRow label="Toplam sohbet / mesaj">
                {formatNumber(detail.stats.conversations)} / {formatNumber(detail.stats.messages)}
              </DetailRow>
              <DetailRow label="Ortalama puan">{detail.stats.avgRating === null ? "—" : detail.stats.avgRating.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</DetailRow>
              <DetailRow label="Özellikler">{[detail.features.chat && "Sohbet", detail.features.voice && "Ses", detail.features.video && "Görüntülü"].filter(Boolean).join(", ") || "Kapalı"}</DetailRow>

              <div className="my-4">
                <ScoreBar label="Persona uyumu" value={detail.quality.persona} tone="violet" />
                <ScoreBar label="Bilgi tabanı" value={detail.quality.knowledge} tone="teal" />
                <ScoreBar label="Yanıt güvenliği" value={detail.quality.safety} tone="green" />
              </div>

              {fv && (
                <section aria-label="Sürüm ayrıntısı" className="rounded-xl border border-line-soft p-3.5">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-ink">
                      {detail.focusIsPending ? "İncelenecek sürüm" : "Sürüm"} v{fv.version}
                    </p>
                    <StatusPill size="sm" tone={fv.status === "pending_review" ? "warn" : fv.status === "live" ? "green" : "gray"}>
                      {TWIN_VERSION_STATUS_LABELS[fv.status] ?? fv.status}
                    </StatusPill>
                  </div>
                  {fv.changeSummary && <p className="mb-2 text-[11px] text-muted-strong">Değişiklik özeti: {fv.changeSummary}</p>}
                  <p className="text-[11px] text-muted">Gönderim: {formatDateTime(fv.submittedAt)}</p>
                  <div className="mt-3 rounded-lg bg-soft p-3 text-[11px] leading-relaxed">
                    <p className="font-extrabold text-ink">Kişilik</p>
                    <p className="text-ink-soft">{fv.persona.displayName || "—"} · {fv.persona.shortBio || "Biyografi yok"}</p>
                    <p className="mt-1 text-muted-strong">Karşılama: “{fv.persona.greeting || "—"}”</p>
                    <p className="mt-1 text-muted">
                      Mesaj uzunluğu: {LENGTH[fv.persona.messageLength] ?? fv.persona.messageLength} · Emoji: {EMOJI[fv.persona.emojiUsage] ?? fv.persona.emojiUsage} · Dil: {fv.persona.language}
                    </p>
                    {fv.persona.speakingStyle && <p className="mt-1 text-muted">Konuşma tarzı: {fv.persona.speakingStyle}</p>}
                    <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                      <Slider label="Samimiyet" value={fv.persona.warmth} />
                      <Slider label="Resmiyet" value={fv.persona.formality} />
                      <Slider label="Mizah" value={fv.persona.humor} />
                      <Slider label="Enerji" value={fv.persona.energy} />
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-soft p-3 text-[11px] leading-relaxed">
                    <p className="font-extrabold text-ink">Sınırlar</p>
                    <p className="text-muted-strong">İzinli konular: {fv.boundaries.allowedTopics.length ? fv.boundaries.allowedTopics.join(", ") : "Belirtilmedi"}</p>
                    <p className="text-muted-strong">Yasak konular: {fv.boundaries.blockedTopics.length ? fv.boundaries.blockedTopics.join(", ") : "Belirtilmedi"}</p>
                    <p className="text-muted-strong">Özel kural: {fv.boundaries.customRules.length} adet · günlük hayran mesaj limiti {fv.boundaries.maxMessagesPerFanPerDay}</p>
                    <ul className="mt-2 grid gap-1.5">
                      <Flag on={fv.boundaries.allowFlirt}>Flört tonu (platform politikası üst sınırdır)</Flag>
                      <Flag on={fv.boundaries.allowMediaRequests}>Medya talepleri</Flag>
                      <Flag on={fv.boundaries.allowCustomRequests}>Özel talepler</Flag>
                      <Flag on={fv.boundaries.escalateOnDistress}>Sıkıntıda insana yönlendirme</Flag>
                    </ul>
                  </div>
                  <div className="mt-3 rounded-lg bg-soft p-3 text-[11px] leading-relaxed">
                    <p className="font-extrabold text-ink">Bilgi tabanı ve ses</p>
                    <p className="text-muted-strong">Onaylı bilgi kaynağı: {fv.knowledgeCount}</p>
                    <p className="text-muted-strong">
                      Ses: {fv.voice.voiceEnabled ? "açık" : "kapalı"} · Görüntülü: {fv.voice.videoEnabled ? "açık" : "kapalı"} · Görsel benzerlik: {fv.voice.imageLikenessEnabled ? "açık" : "kapalı"}
                    </p>
                  </div>
                  {fv.reviewNote && <p className="mt-2 text-[11px] text-muted">İnceleme notu: {fv.reviewNote}</p>}
                </section>
              )}

              {detail.canSeeConsents && (
              <section aria-label="Creator rızaları" className="mt-4">
                <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted">Geçerli creator rızaları</p>
                {detail.consents.length === 0 ? (
                  <Notice tone="warn">Geçerli rıza kaydı yok; onay ve yayın öncesinde doğrulanmalıdır.</Notice>
                ) : (
                  <ul className="grid gap-1.5">
                    {detail.consents.map((c) => (
                      <li key={c.kind} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-ink-soft">{CONSENT_LABELS[c.kind] ?? c.kind}</span>
                        <span className="text-muted">
                          v{c.version} · {formatDate(c.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              )}

              {detail.statusHistory.length > 0 && (
                <section className="mt-4" aria-label="Durum geçmişi">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">Durum geçmişi</p>
                  <Timeline items={detail.statusHistory.map((h) => ({ title: `${TWIN_STATUS_LABELS[h.from as keyof typeof TWIN_STATUS_LABELS] ?? h.from ?? "—"} → ${TWIN_STATUS_LABELS[h.to as keyof typeof TWIN_STATUS_LABELS] ?? h.to}`, meta: `${formatDateTime(h.at)}${h.note ? ` · ${h.note}` : ""}`, tone: "gray" }))} />
                </section>
              )}

              <div className="mt-5 grid gap-2.5 border-t border-line-soft pt-4">
                {detail.pendingVersion && canReview && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <ActionDialog
                      trigger={<Button size="md">Sürümü Onayla</Button>}
                      title={`v${detail.pendingVersion.version} sürümünü onayla`}
                      description="Onay sonrası creator ikizi yayına alabilir. Yayındaki ikizin yeni sürümü doğrudan canlı olur."
                      action={reviewTwinVersionAction}
                      payload={{ versionId: detail.pendingVersion.id, decision: "approve" }}
                      reason={{ label: "Onay notu", defaultValue: "Persona, sınırlar ve rızalar incelendi; politika ile uyumlu." }}
                      confirmLabel="Onayla"
                    />
                    <ActionDialog
                      trigger={
                        <Button size="md" variant="danger-soft">
                          Reddet
                        </Button>
                      }
                      title={`v${detail.pendingVersion.version} sürümünü reddet`}
                      description="Ret gerekçesi creator'a bildirilir; düzenleyip yeniden gönderebilir."
                      action={reviewTwinVersionAction}
                      payload={{ versionId: detail.pendingVersion.id, decision: "reject" }}
                      reason={{ label: "Ret gerekçesi" }}
                      confirmLabel="Reddet"
                      tone="danger"
                    />
                  </div>
                )}
                {detail.pendingVersion && !canReview && <Notice tone="neutral">Sürüm incelemesi için &quot;twins.review&quot; izni gerekir.</Notice>}
                {canManage && (
                  <div className="grid gap-2.5">
                    {canTransition(TWIN_TRANSITIONS, detail.status, "paused") && (
                      <ActionDialog
                        trigger={
                          <Button size="md" variant="outline">
                            İkizi Duraklat
                          </Button>
                        }
                        title="AI ikizini duraklat"
                        description="İkiz hayranlara kapanır; sohbet geçmişi korunur. Creator bilgilendirilir."
                        action={setTwinStatusAction}
                        payload={{ twinId: detail.id, to: "paused" }}
                        reason={{ label: "Duraklatma gerekçesi" }}
                        confirmLabel="Duraklat"
                      />
                    )}
                    {detail.status === "paused" && canTransition(TWIN_TRANSITIONS, detail.status, "live") && (
                      <ActionDialog
                        trigger={<Button size="md">Devam Ettir</Button>}
                        title="AI ikizini devam ettir"
                        description="İkiz yeniden yayına alınır."
                        action={setTwinStatusAction}
                        payload={{ twinId: detail.id, to: "live" }}
                        reason={{ label: "Gerekçe" }}
                        confirmLabel="Devam ettir"
                      />
                    )}
                    {canTransition(TWIN_TRANSITIONS, detail.status, "revoked") && (
                      <ActionDialog
                        trigger={
                          <Button size="md" variant="danger-soft">
                            İkizi Geri Çek
                          </Button>
                        }
                        title="AI ikizini geri çek"
                        description="Geri çekilen ikizin sohbet, ses ve görüntülü özellikleri kapatılır. Bu ağır bir yaptırımdır; creator yeniden taslağa alarak başvurabilir."
                        action={setTwinStatusAction}
                        payload={{ twinId: detail.id, to: "revoked" }}
                        reason={{ label: "Geri çekme gerekçesi" }}
                        confirmLabel="Geri çek"
                        tone="danger"
                      />
                    )}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <EmptyState compact title="AI ikizi seçin" description="Sürüm ve izin ayrıntılarını görmek için listeden bir ikiz seçin." />
            </Card>
          )
        }
      />
    </AdminPage>
  );
}
