import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Star, UserCheck, UserX, Users } from "lucide-react";
import { ActionButton, ActionDialog, ActionForm } from "@/components/admin/action-dialog";
import {
  APPLICATION_STATUS_LABELS,
  CONSENT_LABELS,
  CREATOR_STATUS_LABELS,
  CREATOR_STATUS_TONES,
  VERIFICATION_LABELS,
  VERIFICATION_TONES,
  VERIFICATION_TYPE_LABELS,
} from "@/components/admin/labels";
import { AdminPage, DetailRow, FilterForm, KpiGrid, Notice, ResultCount, SplitLayout, StatusPill, TabLinks, Timeline, href } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, DataTable, EmptyState, Pagination, StatCard, Td, Th } from "@/components/ui/display";
import { decideApplicationAction, setCreatorFeaturedAction, setCreatorSuspendedAction } from "@/features/admin/creators-actions";
import { CreatorPhoneReveal } from "@/features/admin/creator-phone-reveal";
import { SocialIcon, socialLabel } from "@/features/public/social-icon";
import { audienceLabel, CONTACT_PREFERENCES } from "@/lib/creator-contact";
import { m } from "@/i18n/m";
import { getFormatters, getT } from "@/i18n/server";
import type { Translator } from "@/i18n/translate";
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { TWIN_STATUS_LABELS } from "@/lib/state-machines";
import { SampleProfileLabel } from "@/components/ui/badge";
import { CREATOR_TABS, getAdminCreatorDetail, getCreatorCounts, listAdminCreators, type CreatorTab } from "@/services/admin/creators";
import { pick, pickEnum, pickId, pickPage, type SearchParams } from "@/services/admin/shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("İçerik Üreticileri") };
}

const TAB_LABELS: Record<CreatorTab, string> = {
  all: m("Tümü"),
  pending_review: m("Doğrulama Bekleyen"),
  approved: m("Aktif"),
  suspended: m("Askıya Alınan"),
  rejected: m("Reddedilen"),
  onboarding: m("Başvuru Sürecinde"),
};

function identityLabel(t: Translator, identity: string, social: string) {
  if (identity === "verified" && social === "verified") return { text: t("Kimlik + sosyal"), tone: "green" as const };
  if (identity === "verified") return { text: t("Kimlik doğrulandı"), tone: "green" as const };
  if (identity === "pending" || social === "pending") return { text: t("Kimlik inceleme"), tone: "warn" as const };
  if (identity === "rejected") return { text: t("Kimlik reddedildi"), tone: "danger" as const };
  return { text: t("Doğrulanmadı"), tone: "gray" as const };
}

export default async function AdminCreatorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("creators.read");
  const t = await getT();
  const { formatDate, formatDateTime, formatNumber } = await getFormatters();
  const sp = await searchParams;
  const tab = pickEnum(sp, "status", CREATOR_TABS, "all");
  const q = pick(sp, "q");
  const page = pickPage(sp);
  const canVerify = can(user, "creators.verify");
  const canManage = can(user, "creators.manage");

  const [{ counts, pendingApps }, list] = await Promise.all([getCreatorCounts(), listAdminCreators({ tab, q, page })]);
  const selectedId = pickId(sp, "sel") ?? list.items[0]?.id ?? null;
  const detail = selectedId ? await getAdminCreatorDetail(selectedId, { finance: can(user, "finance.read"), consents: can(user, "consents.read"), evidence: canVerify || canManage }) : null;
  const base = { status: tab === "all" ? null : tab, q: q || null };
  const hrefFor = (extra: Record<string, string | number | null>) => href("/admin/creators", { ...base, ...extra });

  return (
    <AdminPage title={t("İçerik Üreticisi Yönetimi")} description={t("Başvuruları inceleyin, kimlikleri doğrulayın ve creator hesaplarını yönetin.")}>
      <KpiGrid>
        <StatCard label={t("Toplam Creator")} value={formatNumber(counts.all)} icon={<Users />} tone="pink" />
        <StatCard label={t("Aktif (Onaylı)")} value={formatNumber(counts.approved)} icon={<UserCheck />} tone="teal" />
        <StatCard label={t("Onay Bekleyen Başvuru")} value={formatNumber(pendingApps)} icon={<ShieldCheck />} tone="orange" />
        <StatCard label={t("Askıya Alınan")} value={formatNumber(counts.suspended)} icon={<UserX />} tone="violet" />
      </KpiGrid>

      <SplitLayout
        main={
          <Card>
            <CardHeader title={t("Creator Dizini")} hint={t("Toplam {count} kayıt", { count: formatNumber(list.total) })} />
            <TabLinks
              label={t("Creator durumu")}
              active={tab}
              tabs={CREATOR_TABS.map((tb) => ({ key: tb, label: t(TAB_LABELS[tb]), count: counts[tb] ?? 0, href: href("/admin/creators", { status: tb === "all" ? null : tb, q: q || null }) }))}
              className="mb-4"
            />
            <FilterForm action="/admin/creators" q={q} placeholder={t("İsim, kullanıcı adı veya konum ara")} hidden={{ status: tab === "all" ? null : tab }} clearHref={hrefFor({ q: null })} />
            {list.items.length === 0 ? (
              <EmptyState compact title={t("Creator bulunamadı")} description={t("Filtreleri değiştirmeyi deneyin.")} />
            ) : (
              <DataTable>
                <thead>
                  <tr>
                    <Th>{t("Creator")}</Th>
                    <Th>{t("Doğrulama")}</Th>
                    <Th>{t("Konum")}</Th>
                    <Th className="text-end">{t("Takipçi")}</Th>
                    <Th>{t("Durum")}</Th>
                    <Th className="text-end">{t("İşlem")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((c) => {
                    const idl = identityLabel(t, c.identity, c.social);
                    const on = c.id === selectedId;
                    return (
                      <tr key={c.id} className={on ? "bg-brand-50/60" : undefined} aria-selected={on || undefined}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar src={c.avatarUrl} name={c.displayName} size={36} />
                            <span className="min-w-0">
                              <b className="block truncate text-ink">
                                {c.displayName}
                                {c.featured && <Star className="ms-1 inline size-3 fill-orange text-orange" aria-label={t("Öne çıkan")} />}
                                {c.isSample && <SampleProfileLabel className="ms-1.5 align-middle" />}
                              </b>
                              <small className="block truncate text-[10px] text-muted">@{c.username}</small>
                            </span>
                          </div>
                        </Td>
                        <Td>
                          <StatusPill tone={idl.tone}>{idl.text}</StatusPill>
                        </Td>
                        <Td>{c.location ?? "—"}</Td>
                        <Td className="text-end tabular-nums">{formatNumber(c.followers)}</Td>
                        <Td>
                          <StatusPill tone={CREATOR_STATUS_TONES[c.status] ?? "gray"}>{CREATOR_STATUS_LABELS[c.status] ? t(CREATOR_STATUS_LABELS[c.status]!) : c.status}</StatusPill>
                        </Td>
                        <Td className="text-end">
                          <Button asChild size="xs" variant={on ? "primary" : "secondary"}>
                            <Link href={hrefFor({ sel: c.id, page: page > 1 ? page : null })} scroll={false} aria-label={t("{displayName} başvurusunu incele", { displayName: c.displayName })}>
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
            <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} />
            <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p, sel: selectedId })} className="mt-4" />
          </Card>
        }
        panel={
          detail ? (
            <Card>
              <CardHeader title={t("Başvuru İncelemesi")} hint={detail.application ? t("Başvuru durumu: {status}", { status: APPLICATION_STATUS_LABELS[detail.application.status] ? t(APPLICATION_STATUS_LABELS[detail.application.status]!) : detail.application.status }) : t("Başvuru kaydı yok")} />
              <div className="mb-4 flex items-center gap-3">
                <Avatar src={detail.avatarUrl} name={detail.displayName} size={56} />
                <div className="min-w-0">
                  <h3 className="truncate text-base font-black tracking-tight text-ink">{detail.displayName}</h3>
                  <p className="truncate text-[11px] text-muted">
                    @{detail.username}
                    {detail.user ? ` · ${detail.user.email}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <StatusPill size="sm" tone={CREATOR_STATUS_TONES[detail.status] ?? "gray"}>
                      {CREATOR_STATUS_LABELS[detail.status] ? t(CREATOR_STATUS_LABELS[detail.status]!) : detail.status}
                    </StatusPill>
                    {detail.featured.isFeatured && (
                      <StatusPill size="sm" tone="warn">
                        {t("Öne çıkan · sıra {rank}", { rank: detail.featured.rank })}
                      </StatusPill>
                    )}
                  </div>
                </div>
              </div>

              {detail.application ? (
                <section aria-label={t("Başvuru kontrol listesi")} className="mb-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted">{t("Kontrol listesi")}</p>
                  {detail.application.checklist.map((c) => (
                    <DetailRow key={c.key} label={t(c.label)}>
                      <StatusPill size="sm" tone={c.passed === true ? "green" : c.passed === false ? "danger" : "warn"}>
                        {c.passed === true ? t("Tamamlandı") : c.passed === false ? t("Başarısız") : t("Kontrol Gerekli")}
                      </StatusPill>
                    </DetailRow>
                  ))}
                  <DetailRow label={t("Gönderim")}>{formatDateTime(detail.application.submittedAt)}</DetailRow>
                  {detail.application.snapshot.categories.length > 0 && <DetailRow label={t("Kategoriler")}>{detail.application.snapshot.categories.join(", ")}</DetailRow>}
                  {detail.application.decisionNote && <DetailRow label={t("Son karar notu")}>{detail.application.decisionNote}</DetailRow>}
                </section>
              ) : (
                <Notice tone="neutral" className="mb-4">
                  {t("Bu creator için gönderilmiş başvuru bulunmuyor (başvuru süreci tamamlanmamış olabilir).")}
                </Notice>
              )}

              <section aria-label={t("İletişim ve sosyal hesaplar")} className="mb-4">
                <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted">{t("İletişim ve sosyal hesaplar")}</p>
                <DetailRow label={t("Telefon")}>
                  {detail.contact.hasPhone && detail.contact.phoneMasked ? (
                    <CreatorPhoneReveal creatorId={detail.id} masked={detail.contact.phoneMasked} canReveal={can(user, "creators.verify")} />
                  ) : (
                    <span className="text-muted">{t("Eklenmedi")}</span>
                  )}
                </DetailRow>
                {detail.contact.preference && <DetailRow label={t("İletişim tercihi")}>{(() => {
                    const pref = CONTACT_PREFERENCES.find((c) => c.key === detail.contact.preference);
                    return pref ? t(pref.label) : detail.contact.preference;
                  })()}</DetailRow>}
                {detail.socialLinks.length === 0 ? (
                  <DetailRow label={t("Sosyal hesaplar")}>
                    <span className="text-muted">{t("Eklenmedi")}</span>
                  </DetailRow>
                ) : (
                  <ul className="mt-1.5 grid gap-1.5">
                    {detail.socialLinks.map((l) => (
                      <li key={l.platform} className="flex items-center gap-2.5 rounded-xl bg-soft px-3 py-2 text-[11px]">
                        <SocialIcon platform={l.platform} className="size-4 shrink-0 text-ink" />
                        <span className="min-w-0 flex-1">
                          <b className="text-ink">{t(socialLabel(l.platform))}</b>
                          {l.primary && <span className="ms-1.5 font-bold text-brand-600">{t("ana platform")}</span>}
                          <span className="block truncate text-muted">
                            {l.url ? (
                              <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-brand-600 hover:underline">
                                {l.handle}
                              </a>
                            ) : (
                              l.handle
                            )}
                            {audienceLabel(l.audience) ? ` · ${t(audienceLabel(l.audience)!)}` : ""}
                          </span>
                        </span>
                        <StatusPill size="sm" tone={l.verified ? "green" : "warn"}>
                          {l.verified ? t("Doğrulandı") : t("Sahiplik kontrolü")}
                        </StatusPill>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {detail.scope.evidence && (
              <section aria-label={t("Doğrulama talepleri")} className="mb-4">
                <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted">{t("Doğrulama kanıtları")}</p>
                {detail.requests.length === 0 ? (
                  <p className="text-[11px] text-muted">
                    {t("Sağlayıcı/manuel doğrulama talebi yok. Profil durumu: kimlik {identity}, sosyal hesap {social}.", {
                      identity: (VERIFICATION_LABELS[detail.verification.identity] ? t(VERIFICATION_LABELS[detail.verification.identity]!) : "").toLocaleLowerCase(t.locale),
                      social: (VERIFICATION_LABELS[detail.verification.social] ? t(VERIFICATION_LABELS[detail.verification.social]!) : "").toLocaleLowerCase(t.locale),
                    })}
                  </p>
                ) : (
                  <ul className="grid gap-2">
                    {detail.requests.map((r) => (
                      <li key={r.id} className="rounded-xl bg-soft px-3 py-2.5 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <b className="text-ink">{VERIFICATION_TYPE_LABELS[r.type] ? t(VERIFICATION_TYPE_LABELS[r.type]!) : r.type}</b>
                          <StatusPill size="sm" tone={VERIFICATION_TONES[r.status] ?? "gray"}>
                            {VERIFICATION_LABELS[r.status] ? t(VERIFICATION_LABELS[r.status]!) : r.status}
                          </StatusPill>
                        </div>
                        <p className="mt-0.5 text-muted">{t("Sağlayıcı: {provider}", { provider: r.provider })}</p>
                        {r.evidence.map((e, i) => (
                          <p key={i} className="mt-0.5 break-all text-muted-strong">
                            {e.kind}: {e.value}
                          </p>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              )}

              {detail.scope.consents && (
              <section aria-label={t("Açık rızalar")} className="mb-4">
                <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted">{t("Açık rızalar")}</p>
                {detail.consents.length === 0 ? (
                  <p className="text-[11px] text-muted">{t("Kayıtlı rıza yok.")}</p>
                ) : (
                  <ul className="grid gap-1.5">
                    {detail.consents.map((c) => {
                      const active = c.granted && !c.revokedAt;
                      return (
                        <li key={c.id} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-ink-soft">
                            {CONSENT_LABELS[c.kind] ? t(CONSENT_LABELS[c.kind]!) : c.kind}
                            <small className="ms-1 text-muted">{`v${c.textVersion}`}</small>
                          </span>
                          <StatusPill size="sm" tone={active ? "green" : "gray"}>
                            {active ? t("Geçerli · {date}", { date: formatDate(c.grantedAt) }) : t("Geri çekildi · {date}", { date: formatDate(c.revokedAt) })}
                          </StatusPill>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
              )}

              <DetailRow label={t("AI ikizi")}>{detail.twin ? `${t(TWIN_STATUS_LABELS[detail.twin.status])} · v${detail.twin.version}` : t("Yok")}</DetailRow>
              <DetailRow label={t("Yayınlanan içerik")}>{formatNumber(detail.publishedContent)}</DetailRow>
              {detail.scope.finance && <DetailRow label={t("Ödeme hesabı")}>{detail.payoutAccounts.length ? detail.payoutAccounts.map((a) => `${a.masked} (${a.status})`).join(", ") : t("Tanımlı değil")}</DetailRow>}

              {detail.statusHistory.length > 0 && (
                <section className="mt-4" aria-label={t("Durum geçmişi")}>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">{t("Durum geçmişi")}</p>
                  <Timeline items={detail.statusHistory.map((h) => ({ title: [CREATOR_STATUS_LABELS[h.from ?? ""] ? t(CREATOR_STATUS_LABELS[h.from ?? ""]!) : (h.from ?? "—"), CREATOR_STATUS_LABELS[h.to] ? t(CREATOR_STATUS_LABELS[h.to]!) : h.to].join(" → "), meta: `${formatDateTime(h.at)}${h.note ? ` · ${h.note}` : ""}`, tone: "gray" }))} />
                </section>
              )}

              {/* İşlemler — yalnız yetkili olunanlar gösterilir; sunucu yine doğrular */}
              {detail.application && ["submitted", "in_review"].includes(detail.application.status) && (
                <div className="mt-5 grid gap-2.5 border-t border-line-soft pt-4">
                  {canVerify ? (
                    <>
                      <div className="grid grid-cols-2 gap-2.5">
                        <ActionDialog
                          trigger={<Button size="md">{t("Onayla")}</Button>}
                          title={t("Creator başvurusunu onayla")}
                          description={t("Onay, kimlik ve sosyal doğrulamayı da onaylı işaretler ve creator'ı bilgilendirir. AI ikizi ayrıca incelenir.")}
                          action={decideApplicationAction}
                          payload={{ applicationId: detail.application.id, decision: "approve" }}
                          reason={{ label: t("Onay notu"), defaultValue: t("Kimlik, sosyal hesap ve rıza kayıtları incelendi; başvuru onaylandı.") }}
                          confirmLabel={t("Başvuruyu onayla")}
                        />
                        <ActionDialog
                          trigger={
                            <Button size="md" variant="outline">
                              {t("Ek Bilgi İste")}
                            </Button>
                          }
                          title={t("Ek bilgi iste")}
                          description={t("Creator başvurusunu düzenleyip yeniden göndermek üzere bilgilendirilir.")}
                          action={decideApplicationAction}
                          payload={{ applicationId: detail.application.id, decision: "changes_requested" }}
                          reason={{ label: t("Creator'dan istenen düzenleme"), placeholder: t("Hangi bilgi/belge eksik veya hatalı?") }}
                          confirmLabel={t("Düzenleme iste")}
                        />
                      </div>
                      <ActionDialog
                        trigger={
                          <Button size="md" variant="danger-soft">
                            {t("Başvuruyu Reddet")}
                          </Button>
                        }
                        title={t("Başvuruyu reddet")}
                        description={t("Ret gerekçesi creator'a bildirilir ve denetim kaydına yazılır.")}
                        action={decideApplicationAction}
                        payload={{ applicationId: detail.application.id, decision: "reject" }}
                        reason={{ label: t("Ret gerekçesi") }}
                        confirmLabel={t("Reddet")}
                        tone="danger"
                      />
                    </>
                  ) : (
                    <Notice tone="neutral">{t("Başvuru kararı vermek için \"creators.verify\" izni gerekir.")}</Notice>
                  )}
                  <p className="text-[10px] leading-relaxed text-muted">{t("Kimlik ve AI benzerliği izinleri onaylanmadan AI ikizi yayınlanmaz.")}</p>
                </div>
              )}

              {canManage && (detail.status === "approved" || detail.status === "suspended") && (
                <div className="mt-5 grid gap-3 border-t border-line-soft pt-4">
                  {detail.status === "approved" ? (
                    <>
                      <ActionForm
                        action={setCreatorFeaturedAction}
                        payload={{ creatorId: detail.id, featured: true }}
                        fields={[{ name: "rank", label: t("Öne çıkan sırası (küçük = önde)"), type: "number", defaultValue: detail.featured.rank, min: 0, max: 9999 }]}
                        submitLabel={detail.featured.isFeatured ? t("Sırayı güncelle") : t("Öne çıkar")}
                        variant="secondary"
                        footer={
                          detail.featured.isFeatured ? (
                            <ActionButton action={setCreatorFeaturedAction} payload={{ creatorId: detail.id, featured: false, rank: 0 }} variant="ghost">
                              {t("Öne çıkarmayı kaldır")}
                            </ActionButton>
                          ) : null
                        }
                      />
                      <ActionDialog
                        trigger={
                          <Button variant="danger-soft" size="md">
                            {t("Hesabı Askıya Al")}
                          </Button>
                        }
                        title={t("Creator hesabını askıya al")}
                        description={t("Creator profili gizlenir ve yayındaki AI ikizi duraklatılır. Creator bilgilendirilir.")}
                        action={setCreatorSuspendedAction}
                        payload={{ creatorId: detail.id, suspended: true }}
                        reason={{ label: t("Askıya alma gerekçesi") }}
                        confirmLabel={t("Askıya al")}
                        tone="danger"
                      />
                    </>
                  ) : (
                    <ActionDialog
                      trigger={<Button size="md">{t("Askıyı Kaldır")}</Button>}
                      title={t("Creator hesabını yeniden etkinleştir")}
                      description={t("Hesap tekrar aktif olur. Duraklatılan AI ikizi otomatik açılmaz; AI İkizleri sayfasından devam ettirin.")}
                      action={setCreatorSuspendedAction}
                      payload={{ creatorId: detail.id, suspended: false }}
                      reason={{ label: t("Gerekçe") }}
                      confirmLabel={t("Yeniden etkinleştir")}
                    />
                  )}
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <EmptyState compact title={t("Creator seçin")} description={t("Başvuru ayrıntılarını görmek için listeden bir creator seçin.")} />
            </Card>
          )
        }
      />
    </AdminPage>
  );
}
