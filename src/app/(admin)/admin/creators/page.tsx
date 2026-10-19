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
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { TWIN_STATUS_LABELS } from "@/lib/state-machines";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { SampleProfileLabel } from "@/components/ui/badge";
import { CREATOR_TABS, getAdminCreatorDetail, getCreatorCounts, listAdminCreators, type CreatorTab } from "@/services/admin/creators";
import { pick, pickEnum, pickId, pickPage, type SearchParams } from "@/services/admin/shared";

export const metadata: Metadata = { title: "İçerik Üreticileri" };

const TAB_LABELS: Record<CreatorTab, string> = {
  all: "Tümü",
  pending_review: "Doğrulama Bekleyen",
  approved: "Aktif",
  suspended: "Askıya Alınan",
  rejected: "Reddedilen",
  onboarding: "Başvuru Sürecinde",
};

function identityLabel(identity: string, social: string) {
  if (identity === "verified" && social === "verified") return { text: "Kimlik + sosyal", tone: "green" as const };
  if (identity === "verified") return { text: "Kimlik doğrulandı", tone: "green" as const };
  if (identity === "pending" || social === "pending") return { text: "Kimlik inceleme", tone: "warn" as const };
  if (identity === "rejected") return { text: "Kimlik reddedildi", tone: "danger" as const };
  return { text: "Doğrulanmadı", tone: "gray" as const };
}

export default async function AdminCreatorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("creators.read");
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
    <AdminPage title="İçerik Üreticisi Yönetimi" description="Başvuruları inceleyin, kimlikleri doğrulayın ve creator hesaplarını yönetin.">
      <KpiGrid>
        <StatCard label="Toplam Creator" value={formatNumber(counts.all)} icon={<Users />} tone="pink" />
        <StatCard label="Aktif (Onaylı)" value={formatNumber(counts.approved)} icon={<UserCheck />} tone="teal" />
        <StatCard label="Onay Bekleyen Başvuru" value={formatNumber(pendingApps)} icon={<ShieldCheck />} tone="orange" />
        <StatCard label="Askıya Alınan" value={formatNumber(counts.suspended)} icon={<UserX />} tone="violet" />
      </KpiGrid>

      <SplitLayout
        main={
          <Card>
            <CardHeader title="Creator Dizini" hint={`Toplam ${formatNumber(list.total)} kayıt`} />
            <TabLinks
              label="Creator durumu"
              active={tab}
              tabs={CREATOR_TABS.map((t) => ({ key: t, label: TAB_LABELS[t], count: counts[t] ?? 0, href: href("/admin/creators", { status: t === "all" ? null : t, q: q || null }) }))}
              className="mb-4"
            />
            <FilterForm action="/admin/creators" q={q} placeholder="İsim, kullanıcı adı veya konum ara" hidden={{ status: tab === "all" ? null : tab }} clearHref={hrefFor({ q: null })} />
            {list.items.length === 0 ? (
              <EmptyState compact title="Creator bulunamadı" description="Filtreleri değiştirmeyi deneyin." />
            ) : (
              <DataTable>
                <thead>
                  <tr>
                    <Th>Creator</Th>
                    <Th>Doğrulama</Th>
                    <Th>Konum</Th>
                    <Th className="text-right">Takipçi</Th>
                    <Th>Durum</Th>
                    <Th className="text-right">İşlem</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((c) => {
                    const idl = identityLabel(c.identity, c.social);
                    const on = c.id === selectedId;
                    return (
                      <tr key={c.id} className={on ? "bg-brand-50/60" : undefined} aria-selected={on || undefined}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar src={c.avatarUrl} name={c.displayName} size={36} />
                            <span className="min-w-0">
                              <b className="block truncate text-ink">
                                {c.displayName}
                                {c.featured && <Star className="ml-1 inline size-3 fill-orange text-orange" aria-label="Öne çıkan" />}
                                {c.isSample && <SampleProfileLabel className="ml-1.5 align-middle" />}
                              </b>
                              <small className="block truncate text-[10px] text-muted">@{c.username}</small>
                            </span>
                          </div>
                        </Td>
                        <Td>
                          <StatusPill tone={idl.tone}>{idl.text}</StatusPill>
                        </Td>
                        <Td>{c.location ?? "—"}</Td>
                        <Td className="text-right tabular-nums">{formatNumber(c.followers)}</Td>
                        <Td>
                          <StatusPill tone={CREATOR_STATUS_TONES[c.status] ?? "gray"}>{CREATOR_STATUS_LABELS[c.status] ?? c.status}</StatusPill>
                        </Td>
                        <Td className="text-right">
                          <Button asChild size="xs" variant={on ? "primary" : "secondary"}>
                            <Link href={hrefFor({ sel: c.id, page: page > 1 ? page : null })} scroll={false} aria-label={`${c.displayName} başvurusunu incele`}>
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
            <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} />
            <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p, sel: selectedId })} className="mt-4" />
          </Card>
        }
        panel={
          detail ? (
            <Card>
              <CardHeader title="Başvuru İncelemesi" hint={detail.application ? `Başvuru durumu: ${APPLICATION_STATUS_LABELS[detail.application.status] ?? detail.application.status}` : "Başvuru kaydı yok"} />
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
                      {CREATOR_STATUS_LABELS[detail.status] ?? detail.status}
                    </StatusPill>
                    {detail.featured.isFeatured && (
                      <StatusPill size="sm" tone="warn">
                        Öne çıkan · sıra {detail.featured.rank}
                      </StatusPill>
                    )}
                  </div>
                </div>
              </div>

              {detail.application ? (
                <section aria-label="Başvuru kontrol listesi" className="mb-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted">Kontrol listesi</p>
                  {detail.application.checklist.map((c) => (
                    <DetailRow key={c.key} label={c.label}>
                      <StatusPill size="sm" tone={c.passed === true ? "green" : c.passed === false ? "danger" : "warn"}>
                        {c.passed === true ? "Tamamlandı" : c.passed === false ? "Başarısız" : "Kontrol Gerekli"}
                      </StatusPill>
                    </DetailRow>
                  ))}
                  <DetailRow label="Gönderim">{formatDateTime(detail.application.submittedAt)}</DetailRow>
                  {detail.application.snapshot.categories.length > 0 && <DetailRow label="Kategoriler">{detail.application.snapshot.categories.join(", ")}</DetailRow>}
                  {detail.application.decisionNote && <DetailRow label="Son karar notu">{detail.application.decisionNote}</DetailRow>}
                </section>
              ) : (
                <Notice tone="neutral" className="mb-4">
                  Bu creator için gönderilmiş başvuru bulunmuyor (başvuru süreci tamamlanmamış olabilir).
                </Notice>
              )}

              <section aria-label="İletişim ve sosyal hesaplar" className="mb-4">
                <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted">İletişim ve sosyal hesaplar</p>
                <DetailRow label="Telefon">
                  {detail.contact.hasPhone && detail.contact.phoneMasked ? (
                    <CreatorPhoneReveal creatorId={detail.id} masked={detail.contact.phoneMasked} canReveal={can(user, "creators.verify")} />
                  ) : (
                    <span className="text-muted">Eklenmedi</span>
                  )}
                </DetailRow>
                {detail.contact.preference && <DetailRow label="İletişim tercihi">{CONTACT_PREFERENCES.find((c) => c.key === detail.contact.preference)?.label ?? detail.contact.preference}</DetailRow>}
                {detail.socialLinks.length === 0 ? (
                  <DetailRow label="Sosyal hesaplar">
                    <span className="text-muted">Eklenmedi</span>
                  </DetailRow>
                ) : (
                  <ul className="mt-1.5 grid gap-1.5">
                    {detail.socialLinks.map((l) => (
                      <li key={l.platform} className="flex items-center gap-2.5 rounded-xl bg-soft px-3 py-2 text-[11px]">
                        <SocialIcon platform={l.platform} className="size-4 shrink-0 text-ink" />
                        <span className="min-w-0 flex-1">
                          <b className="text-ink">{socialLabel(l.platform)}</b>
                          {l.primary && <span className="ml-1.5 font-bold text-brand-600">ana platform</span>}
                          <span className="block truncate text-muted">
                            {l.url ? (
                              <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-brand-600 hover:underline">
                                {l.handle}
                              </a>
                            ) : (
                              l.handle
                            )}
                            {audienceLabel(l.audience) ? ` · ${audienceLabel(l.audience)}` : ""}
                          </span>
                        </span>
                        <StatusPill size="sm" tone={l.verified ? "green" : "warn"}>
                          {l.verified ? "Doğrulandı" : "Sahiplik kontrolü"}
                        </StatusPill>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {detail.scope.evidence && (
              <section aria-label="Doğrulama talepleri" className="mb-4">
                <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted">Doğrulama kanıtları</p>
                {detail.requests.length === 0 ? (
                  <p className="text-[11px] text-muted">Sağlayıcı/manuel doğrulama talebi yok. Profil durumu: kimlik {VERIFICATION_LABELS[detail.verification.identity]?.toLowerCase()}, sosyal hesap {VERIFICATION_LABELS[detail.verification.social]?.toLowerCase()}.</p>
                ) : (
                  <ul className="grid gap-2">
                    {detail.requests.map((r) => (
                      <li key={r.id} className="rounded-xl bg-soft px-3 py-2.5 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <b className="text-ink">{VERIFICATION_TYPE_LABELS[r.type] ?? r.type}</b>
                          <StatusPill size="sm" tone={VERIFICATION_TONES[r.status] ?? "gray"}>
                            {VERIFICATION_LABELS[r.status] ?? r.status}
                          </StatusPill>
                        </div>
                        <p className="mt-0.5 text-muted">Sağlayıcı: {r.provider}</p>
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
              <section aria-label="Açık rızalar" className="mb-4">
                <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted">Açık rızalar</p>
                {detail.consents.length === 0 ? (
                  <p className="text-[11px] text-muted">Kayıtlı rıza yok.</p>
                ) : (
                  <ul className="grid gap-1.5">
                    {detail.consents.map((c) => {
                      const active = c.granted && !c.revokedAt;
                      return (
                        <li key={c.id} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-ink-soft">
                            {CONSENT_LABELS[c.kind] ?? c.kind}
                            <small className="ml-1 text-muted">v{c.textVersion}</small>
                          </span>
                          <StatusPill size="sm" tone={active ? "green" : "gray"}>
                            {active ? `Geçerli · ${formatDate(c.grantedAt)}` : `Geri çekildi · ${formatDate(c.revokedAt)}`}
                          </StatusPill>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
              )}

              <DetailRow label="AI ikizi">{detail.twin ? `${TWIN_STATUS_LABELS[detail.twin.status]} · v${detail.twin.version}` : "Yok"}</DetailRow>
              <DetailRow label="Yayınlanan içerik">{formatNumber(detail.publishedContent)}</DetailRow>
              {detail.scope.finance && <DetailRow label="Ödeme hesabı">{detail.payoutAccounts.length ? detail.payoutAccounts.map((a) => `${a.masked} (${a.status})`).join(", ") : "Tanımlı değil"}</DetailRow>}

              {detail.statusHistory.length > 0 && (
                <section className="mt-4" aria-label="Durum geçmişi">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">Durum geçmişi</p>
                  <Timeline items={detail.statusHistory.map((h) => ({ title: `${CREATOR_STATUS_LABELS[h.from ?? ""] ?? h.from ?? "—"} → ${CREATOR_STATUS_LABELS[h.to] ?? h.to}`, meta: `${formatDateTime(h.at)}${h.note ? ` · ${h.note}` : ""}`, tone: "gray" }))} />
                </section>
              )}

              {/* İşlemler — yalnız yetkili olunanlar gösterilir; sunucu yine doğrular */}
              {detail.application && ["submitted", "in_review"].includes(detail.application.status) && (
                <div className="mt-5 grid gap-2.5 border-t border-line-soft pt-4">
                  {canVerify ? (
                    <>
                      <div className="grid grid-cols-2 gap-2.5">
                        <ActionDialog
                          trigger={<Button size="md">Onayla</Button>}
                          title="Creator başvurusunu onayla"
                          description="Onay, kimlik ve sosyal doğrulamayı da onaylı işaretler ve creator'ı bilgilendirir. AI ikizi ayrıca incelenir."
                          action={decideApplicationAction}
                          payload={{ applicationId: detail.application.id, decision: "approve" }}
                          reason={{ label: "Onay notu", defaultValue: "Kimlik, sosyal hesap ve rıza kayıtları incelendi; başvuru onaylandı." }}
                          confirmLabel="Başvuruyu onayla"
                        />
                        <ActionDialog
                          trigger={
                            <Button size="md" variant="outline">
                              Ek Bilgi İste
                            </Button>
                          }
                          title="Ek bilgi iste"
                          description="Creator başvurusunu düzenleyip yeniden göndermek üzere bilgilendirilir."
                          action={decideApplicationAction}
                          payload={{ applicationId: detail.application.id, decision: "changes_requested" }}
                          reason={{ label: "Creator'dan istenen düzenleme", placeholder: "Hangi bilgi/belge eksik veya hatalı?" }}
                          confirmLabel="Düzenleme iste"
                        />
                      </div>
                      <ActionDialog
                        trigger={
                          <Button size="md" variant="danger-soft">
                            Başvuruyu Reddet
                          </Button>
                        }
                        title="Başvuruyu reddet"
                        description="Ret gerekçesi creator'a bildirilir ve denetim kaydına yazılır."
                        action={decideApplicationAction}
                        payload={{ applicationId: detail.application.id, decision: "reject" }}
                        reason={{ label: "Ret gerekçesi" }}
                        confirmLabel="Reddet"
                        tone="danger"
                      />
                    </>
                  ) : (
                    <Notice tone="neutral">Başvuru kararı vermek için &quot;creators.verify&quot; izni gerekir.</Notice>
                  )}
                  <p className="text-[10px] leading-relaxed text-muted">Kimlik ve AI benzerliği izinleri onaylanmadan AI ikizi yayınlanmaz.</p>
                </div>
              )}

              {canManage && (detail.status === "approved" || detail.status === "suspended") && (
                <div className="mt-5 grid gap-3 border-t border-line-soft pt-4">
                  {detail.status === "approved" ? (
                    <>
                      <ActionForm
                        action={setCreatorFeaturedAction}
                        payload={{ creatorId: detail.id, featured: true }}
                        fields={[{ name: "rank", label: "Öne çıkan sırası (küçük = önde)", type: "number", defaultValue: detail.featured.rank, min: 0, max: 9999 }]}
                        submitLabel={detail.featured.isFeatured ? "Sırayı güncelle" : "Öne çıkar"}
                        variant="secondary"
                        footer={
                          detail.featured.isFeatured ? (
                            <ActionButton action={setCreatorFeaturedAction} payload={{ creatorId: detail.id, featured: false, rank: 0 }} variant="ghost">
                              Öne çıkarmayı kaldır
                            </ActionButton>
                          ) : null
                        }
                      />
                      <ActionDialog
                        trigger={
                          <Button variant="danger-soft" size="md">
                            Hesabı Askıya Al
                          </Button>
                        }
                        title="Creator hesabını askıya al"
                        description="Creator profili gizlenir ve yayındaki AI ikizi duraklatılır. Creator bilgilendirilir."
                        action={setCreatorSuspendedAction}
                        payload={{ creatorId: detail.id, suspended: true }}
                        reason={{ label: "Askıya alma gerekçesi" }}
                        confirmLabel="Askıya al"
                        tone="danger"
                      />
                    </>
                  ) : (
                    <ActionDialog
                      trigger={<Button size="md">Askıyı Kaldır</Button>}
                      title="Creator hesabını yeniden etkinleştir"
                      description="Hesap tekrar aktif olur. Duraklatılan AI ikizi otomatik açılmaz; AI İkizleri sayfasından devam ettirin."
                      action={setCreatorSuspendedAction}
                      payload={{ creatorId: detail.id, suspended: false }}
                      reason={{ label: "Gerekçe" }}
                      confirmLabel="Yeniden etkinleştir"
                    />
                  )}
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <EmptyState compact title="Creator seçin" description="Başvuru ayrıntılarını görmek için listeden bir creator seçin." />
            </Card>
          )
        }
      />
    </AdminPage>
  );
}
