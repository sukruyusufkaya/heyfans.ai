import type { Metadata } from "next";
import Link from "next/link";
import { Bot, ClipboardCheck, Gauge, Radio } from "lucide-react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { CONSENT_LABELS, CREATOR_STATUS_LABELS, TWIN_STATUS_TONES, TWIN_VERSION_STATUS_LABELS } from "@/components/admin/labels";
import { AdminPage, DetailRow, FilterForm, KpiGrid, Notice, ResultCount, ScoreBar, SplitLayout, StatusPill, TabLinks, Timeline, href } from "@/components/admin/ui";
import { AiTwinLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, DataTable, EmptyState, Pagination, Progress, StatCard, Td, Th } from "@/components/ui/display";
import { reviewTwinVersionAction, setTwinStatusAction } from "@/features/admin/twins-actions";
import { m } from "@/i18n/m";
import { getFormatters, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { canTransition, TWIN_STATUS_LABELS, TWIN_TRANSITIONS } from "@/lib/state-machines";
import { getAdminTwinDetail, getTwinKpis, listAdminTwins, TWIN_TABS, type TwinTab } from "@/services/admin/twins";
import { pick, pickEnum, pickId, pickPage, type SearchParams } from "@/services/admin/shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("AI İkizleri") };
}

const TAB_LABELS: Record<TwinTab, string> = {
  all: m("Tüm İkizler"),
  live: m("Yayında"),
  pending_review: m("İncelemede"),
  approved: m("Onaylı"),
  paused: m("Duraklatıldı"),
  rejected: m("Reddedildi"),
  revoked: m("Geri çekildi"),
  draft: m("Taslak"),
};
const LENGTH: Record<string, string> = { short: m("Kısa"), medium: m("Orta"), long: m("Uzun") };
const EMOJI: Record<string, string> = { none: m("Yok"), low: m("Az"), medium: m("Orta"), high: m("Çok") };

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

async function Flag({ on, children }: { on: boolean; children: React.ReactNode }) {
  const t = await getT();
  return (
    <li className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-ink-soft">{children}</span>
      <StatusPill size="sm" tone={on ? "warn" : "gray"}>
        {on ? t("Açık") : t("Kapalı")}
      </StatusPill>
    </li>
  );
}

export default async function AdminAiTwinsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("twins.read");
  const t = await getT();
  const { formatDate, formatDateTime, formatNumber, formatPercent } = await getFormatters();
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
      title={t("AI İkizi Yönetimi")}
      description={t("AI ikizlerinin izinlerini, yayın durumlarını ve kalite ölçümlerini denetleyin.")}
      actions={
        <>
          <Button asChild variant="outline" size="md">
            <Link href={href("/admin/ai-twins", { status: "pending_review" })}>{t("Onay Kuyruğu")}</Link>
          </Button>
        </>
      }
    >
      <KpiGrid>
        <StatCard label={t("Toplam AI İkizi")} value={formatNumber(kpis.counts.all)} icon={<Bot />} tone="pink" />
        <StatCard label={t("Yayındaki AI İkizi")} value={formatNumber(kpis.counts.live)} icon={<Radio />} tone="teal" />
        <StatCard label={t("Onay Bekleyen Sürüm")} value={formatNumber(kpis.pendingVersions)} icon={<ClipboardCheck />} tone="orange" />
        <StatCard label={t("Ortalama Kalite")} value={kpis.avgQuality === null ? "—" : formatPercent(Math.round(kpis.avgQuality) * 100)} icon={<Gauge />} tone="violet" foot={kpis.scored ? t("{scored} ikiz puanlı", { scored: kpis.scored }) : t("kalite testi yapılmadı")} />
      </KpiGrid>

      <SplitLayout
        main={
          <Card>
            <CardHeader title={t("AI İkizleri")} hint={t("Model ve sürüm yönetimi")} />
            <TabLinks label={t("İkiz durumu")} active={tab} tabs={TWIN_TABS.map((tb) => ({ key: tb, label: t(TAB_LABELS[tb]), count: kpis.counts[tb] ?? 0, href: href("/admin/ai-twins", { status: tb === "all" ? null : tb, q: q || null }) }))} className="mb-4" />
            <FilterForm action="/admin/ai-twins" q={q} placeholder={t("İkiz veya creator adı ara")} hidden={{ status: tab === "all" ? null : tab }} clearHref={hrefFor({ q: null })} />
            {list.items.length === 0 ? (
              <EmptyState compact title={t("AI ikizi bulunamadı")} description={t("Filtreleri değiştirmeyi deneyin.")} />
            ) : (
              <DataTable>
                <thead>
                  <tr>
                    <Th>{t("AI ikizi / Creator")}</Th>
                    <Th>{t("Sürüm")}</Th>
                    <Th>{t("Durum")}</Th>
                    <Th className="text-end">{t("Sohbet")}</Th>
                    <Th className="text-end">{t("Kalite")}</Th>
                    <Th className="text-end">{t("İşlem")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((tw) => {
                    const on = tw.id === selectedId;
                    return (
                      <tr key={tw.id} className={on ? "bg-brand-50/60" : undefined}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar src={tw.avatarUrl} name={tw.creator} size={36} />
                            <span className="min-w-0">
                              <b className="flex items-center gap-1.5 truncate text-ink">
                                {tw.name}
                                <AiTwinLabel />
                              </b>
                              <small className="block truncate text-[10px] text-muted">{tw.creator}</small>
                            </span>
                          </div>
                        </Td>
                        <Td>
                          <StatusPill tone="gray">{`v${tw.version}`}</StatusPill>
                          {tw.hasPending && (
                            <StatusPill tone="warn" size="sm" className="ms-1.5">
                              {t("Onay bekliyor")}
                            </StatusPill>
                          )}
                        </Td>
                        <Td>
                          <StatusPill tone={TWIN_STATUS_TONES[tw.status] ?? "gray"}>{t(TWIN_STATUS_LABELS[tw.status])}</StatusPill>
                        </Td>
                        <Td className="text-end tabular-nums">{tw.conversations ? formatNumber(tw.conversations) : "—"}</Td>
                        <Td className="text-end tabular-nums">{tw.quality === null ? "—" : formatPercent(Math.round(tw.quality) * 100)}</Td>
                        <Td className="text-end">
                          <Button asChild size="xs" variant={on ? "primary" : "secondary"}>
                            <Link href={hrefFor({ sel: tw.id, page: page > 1 ? page : null })} scroll={false} aria-label={t("{name} ikizini yönet", { name: tw.name })}>
                              {t("Yönet")}
                            </Link>
                          </Button>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            )}
            <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} noun={t("ikiz")} />
            <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p, sel: selectedId })} className="mt-4" />
            <Notice tone="neutral" className="mt-4">
              {t("Tüm AI ikizleri kimlik doğrulaması, creator izni ve içerik sınırlarıyla ilişkilendirilir. Yayındaki ikizin yeni sürümü onaylandığında doğrudan canlı sürüm olur.")}
            </Notice>
          </Card>
        }
        panel={
          detail ? (
            <Card>
              <CardHeader title={t("Seçili AI İkizi")} hint={t("İzin ve sürüm kontrolü")} />
              <div className="mb-4 flex items-center gap-3">
                <Avatar src={detail.creator?.avatarUrl} name={detail.creator?.displayName ?? detail.name} size={52} />
                <div className="min-w-0">
                  <h3 className="flex flex-wrap items-center gap-1.5 text-base font-black tracking-tight text-ink">
                    <span className="truncate">{detail.name}</span>
                    <AiTwinLabel />
                  </h3>
                  <p className="truncate text-[11px] text-muted">{t("Creator: {name}", { name: detail.creator?.displayName ?? "—" })}</p>
                  <StatusPill size="sm" tone={TWIN_STATUS_TONES[detail.status] ?? "gray"} className="mt-1.5">
                    {t(TWIN_STATUS_LABELS[detail.status])}
                  </StatusPill>
                </div>
              </div>

              <DetailRow label={t("Güncel sürüm")}>{`v${detail.currentVersion}`}</DetailRow>
              <DetailRow label={t("Creator hesabı")}>{detail.creator ? t("{status} · kimlik {identity}", { status: CREATOR_STATUS_LABELS[detail.creator.status] ? t(CREATOR_STATUS_LABELS[detail.creator.status]!) : detail.creator.status, identity: detail.creator.identity === "verified" ? t("doğrulandı") : t("bekliyor") }) : "—"}</DetailRow>
              <DetailRow label={t("Son kalite testi")}>{detail.quality.lastTestAt ? formatDate(detail.quality.lastTestAt) : t("Yapılmadı")}</DetailRow>
              <DetailRow label={t("Toplam sohbet / mesaj")}>
                {formatNumber(detail.stats.conversations)} / {formatNumber(detail.stats.messages)}
              </DetailRow>
              <DetailRow label={t("Ortalama puan")}>{detail.stats.avgRating === null ? "—" : formatNumber(Math.round(detail.stats.avgRating * 10) / 10)}</DetailRow>
              <DetailRow label={t("Özellikler")}>{[detail.features.chat && t("Sohbet"), detail.features.voice && t("Ses"), detail.features.video && t("Görüntülü")].filter(Boolean).join(", ") || t("Kapalı")}</DetailRow>

              <div className="my-4">
                <ScoreBar label={t("Persona uyumu")} value={detail.quality.persona} tone="violet" />
                <ScoreBar label={t("Bilgi tabanı")} value={detail.quality.knowledge} tone="teal" />
                <ScoreBar label={t("Yanıt güvenliği")} value={detail.quality.safety} tone="green" />
              </div>

              {fv && (
                <section aria-label={t("Sürüm ayrıntısı")} className="rounded-xl border border-line-soft p-3.5">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-ink">
                      {detail.focusIsPending ? t("İncelenecek sürüm") : t("Sürüm")} {`v${fv.version}`}
                    </p>
                    <StatusPill size="sm" tone={fv.status === "pending_review" ? "warn" : fv.status === "live" ? "green" : "gray"}>
                      {TWIN_VERSION_STATUS_LABELS[fv.status] ? t(TWIN_VERSION_STATUS_LABELS[fv.status]!) : fv.status}
                    </StatusPill>
                  </div>
                  {fv.changeSummary && <p className="mb-2 text-[11px] text-muted-strong">{t("Değişiklik özeti: {summary}", { summary: fv.changeSummary })}</p>}
                  <p className="text-[11px] text-muted">{t("Gönderim: {date}", { date: formatDateTime(fv.submittedAt) })}</p>
                  <div className="mt-3 rounded-lg bg-soft p-3 text-[11px] leading-relaxed">
                    <p className="font-extrabold text-ink">{t("Kişilik")}</p>
                    <p className="text-ink-soft">{fv.persona.displayName || "—"} · {fv.persona.shortBio || t("Biyografi yok")}</p>
                    <p className="mt-1 text-muted-strong">{t("Karşılama: “{greeting}”", { greeting: fv.persona.greeting || "—" })}</p>
                    <p className="mt-1 text-muted">
                      {t("Mesaj uzunluğu: {length} · Emoji: {emoji} · Dil: {language}", {
                        length: LENGTH[fv.persona.messageLength] ? t(LENGTH[fv.persona.messageLength]!) : fv.persona.messageLength,
                        emoji: EMOJI[fv.persona.emojiUsage] ? t(EMOJI[fv.persona.emojiUsage]!) : fv.persona.emojiUsage,
                        language: fv.persona.language,
                      })}
                    </p>
                    {fv.persona.speakingStyle && <p className="mt-1 text-muted">{t("Konuşma tarzı: {style}", { style: fv.persona.speakingStyle })}</p>}
                    <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                      <Slider label={t("Samimiyet")} value={fv.persona.warmth} />
                      <Slider label={t("Resmiyet")} value={fv.persona.formality} />
                      <Slider label={t("Mizah")} value={fv.persona.humor} />
                      <Slider label={t("Enerji")} value={fv.persona.energy} />
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-soft p-3 text-[11px] leading-relaxed">
                    <p className="font-extrabold text-ink">{t("Sınırlar")}</p>
                    <p className="text-muted-strong">{t("İzinli konular: {topics}", { topics: fv.boundaries.allowedTopics.length ? fv.boundaries.allowedTopics.join(", ") : t("Belirtilmedi") })}</p>
                    <p className="text-muted-strong">{t("Yasak konular: {topics}", { topics: fv.boundaries.blockedTopics.length ? fv.boundaries.blockedTopics.join(", ") : t("Belirtilmedi") })}</p>
                    <p className="text-muted-strong">{t("Özel kural: {count} adet · günlük hayran mesaj limiti {limit}", { count: fv.boundaries.customRules.length, limit: fv.boundaries.maxMessagesPerFanPerDay })}</p>
                    <ul className="mt-2 grid gap-1.5">
                      <Flag on={fv.boundaries.allowFlirt}>{t("Flört tonu (platform politikası üst sınırdır)")}</Flag>
                      <Flag on={fv.boundaries.allowMediaRequests}>{t("Medya talepleri")}</Flag>
                      <Flag on={fv.boundaries.allowCustomRequests}>{t("Özel talepler")}</Flag>
                      <Flag on={fv.boundaries.escalateOnDistress}>{t("Sıkıntıda insana yönlendirme")}</Flag>
                    </ul>
                  </div>
                  <div className="mt-3 rounded-lg bg-soft p-3 text-[11px] leading-relaxed">
                    <p className="font-extrabold text-ink">{t("Bilgi tabanı ve ses")}</p>
                    <p className="text-muted-strong">{t("Onaylı bilgi kaynağı: {count}", { count: fv.knowledgeCount })}</p>
                    <p className="text-muted-strong">
                      {t("Ses: {voice} · Görüntülü: {video} · Görsel benzerlik: {image}", {
                        voice: fv.voice.voiceEnabled ? t("açık") : t("kapalı"),
                        video: fv.voice.videoEnabled ? t("açık") : t("kapalı"),
                        image: fv.voice.imageLikenessEnabled ? t("açık") : t("kapalı"),
                      })}
                    </p>
                  </div>
                  {fv.reviewNote && <p className="mt-2 text-[11px] text-muted">{t("İnceleme notu: {note}", { note: fv.reviewNote })}</p>}
                </section>
              )}

              {detail.canSeeConsents && (
              <section aria-label={t("Creator rızaları")} className="mt-4">
                <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted">{t("Geçerli creator rızaları")}</p>
                {detail.consents.length === 0 ? (
                  <Notice tone="warn">{t("Geçerli rıza kaydı yok; onay ve yayın öncesinde doğrulanmalıdır.")}</Notice>
                ) : (
                  <ul className="grid gap-1.5">
                    {detail.consents.map((c) => (
                      <li key={c.kind} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-ink-soft">{CONSENT_LABELS[c.kind] ? t(CONSENT_LABELS[c.kind]!) : c.kind}</span>
                        <span className="text-muted">
                          {`v${c.version}`} · {formatDate(c.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              )}

              {detail.statusHistory.length > 0 && (
                <section className="mt-4" aria-label={t("Durum geçmişi")}>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">{t("Durum geçmişi")}</p>
                  <Timeline items={detail.statusHistory.map((h) => ({ title: [h.from ? (TWIN_STATUS_LABELS[h.from as keyof typeof TWIN_STATUS_LABELS] ? t(TWIN_STATUS_LABELS[h.from as keyof typeof TWIN_STATUS_LABELS]) : h.from) : "—", TWIN_STATUS_LABELS[h.to as keyof typeof TWIN_STATUS_LABELS] ? t(TWIN_STATUS_LABELS[h.to as keyof typeof TWIN_STATUS_LABELS]) : h.to].join(" → "), meta: `${formatDateTime(h.at)}${h.note ? ` · ${h.note}` : ""}`, tone: "gray" }))} />
                </section>
              )}

              <div className="mt-5 grid gap-2.5 border-t border-line-soft pt-4">
                {detail.pendingVersion && canReview && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <ActionDialog
                      trigger={<Button size="md">{t("Sürümü Onayla")}</Button>}
                      title={t("v{version} sürümünü onayla", { version: detail.pendingVersion.version })}
                      description={t("Onay sonrası creator ikizi yayına alabilir. Yayındaki ikizin yeni sürümü doğrudan canlı olur.")}
                      action={reviewTwinVersionAction}
                      payload={{ versionId: detail.pendingVersion.id, decision: "approve" }}
                      reason={{ label: t("Onay notu"), defaultValue: t("Persona, sınırlar ve rızalar incelendi; politika ile uyumlu.") }}
                      confirmLabel={t("Onayla")}
                    />
                    <ActionDialog
                      trigger={
                        <Button size="md" variant="danger-soft">
                          {t("Reddet")}
                        </Button>
                      }
                      title={t("v{version} sürümünü reddet", { version: detail.pendingVersion.version })}
                      description={t("Ret gerekçesi creator'a bildirilir; düzenleyip yeniden gönderebilir.")}
                      action={reviewTwinVersionAction}
                      payload={{ versionId: detail.pendingVersion.id, decision: "reject" }}
                      reason={{ label: t("Ret gerekçesi") }}
                      confirmLabel={t("Reddet")}
                      tone="danger"
                    />
                  </div>
                )}
                {detail.pendingVersion && !canReview && <Notice tone="neutral">{t("Sürüm incelemesi için \"twins.review\" izni gerekir.")}</Notice>}
                {canManage && (
                  <div className="grid gap-2.5">
                    {canTransition(TWIN_TRANSITIONS, detail.status, "paused") && (
                      <ActionDialog
                        trigger={
                          <Button size="md" variant="outline">
                            {t("İkizi Duraklat")}
                          </Button>
                        }
                        title={t("AI ikizini duraklat")}
                        description={t("İkiz hayranlara kapanır; sohbet geçmişi korunur. Creator bilgilendirilir.")}
                        action={setTwinStatusAction}
                        payload={{ twinId: detail.id, to: "paused" }}
                        reason={{ label: t("Duraklatma gerekçesi") }}
                        confirmLabel={t("Duraklat")}
                      />
                    )}
                    {detail.status === "paused" && canTransition(TWIN_TRANSITIONS, detail.status, "live") && (
                      <ActionDialog
                        trigger={<Button size="md">{t("Devam Ettir")}</Button>}
                        title={t("AI ikizini devam ettir")}
                        description={t("İkiz yeniden yayına alınır.")}
                        action={setTwinStatusAction}
                        payload={{ twinId: detail.id, to: "live" }}
                        reason={{ label: t("Gerekçe") }}
                        confirmLabel={t("Devam ettir")}
                      />
                    )}
                    {canTransition(TWIN_TRANSITIONS, detail.status, "revoked") && (
                      <ActionDialog
                        trigger={
                          <Button size="md" variant="danger-soft">
                            {t("İkizi Geri Çek")}
                          </Button>
                        }
                        title={t("AI ikizini geri çek")}
                        description={t("Geri çekilen ikizin sohbet, ses ve görüntülü özellikleri kapatılır. Bu ağır bir yaptırımdır; creator yeniden taslağa alarak başvurabilir.")}
                        action={setTwinStatusAction}
                        payload={{ twinId: detail.id, to: "revoked" }}
                        reason={{ label: t("Geri çekme gerekçesi") }}
                        confirmLabel={t("Geri çek")}
                        tone="danger"
                      />
                    )}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <EmptyState compact title={t("AI ikizi seçin")} description={t("Sürüm ve izin ayrıntılarını görmek için listeden bir ikiz seçin.")} />
            </Card>
          )
        }
      />
    </AdminPage>
  );
}
