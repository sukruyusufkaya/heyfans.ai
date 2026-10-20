import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, UserPlus, Users, UserX, CreditCard } from "lucide-react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { labelOf, TIER_LABELS, USER_ROLE_LABELS, USER_STATUS_LABELS, USER_STATUS_TONES } from "@/components/admin/labels";
import { AdminPage, DetailRow, FilterForm, KpiGrid, Notice, ResultCount, ScoreBar, SplitLayout, StatusPill, TabLinks, href } from "@/components/admin/ui";
import { Donut } from "@/components/charts/charts";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, DataTable, EmptyState, Pagination, StatCard, Td, Th } from "@/components/ui/display";
import { setAdminRoleAction, setUserStatusAction } from "@/features/admin/users-actions";
import { isLocale, LOCALE_META } from "@/i18n/config";
import { m } from "@/i18n/m";
import { getFormatters, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { ADMIN_ROLE_LABELS, can } from "@/lib/permissions";
import { ADMIN_ROLES } from "@/models/identity";
import { getAdminUserDetail, getSecuritySummary, getUserKpis, getUserSegments, listAdminUsers, USER_TABS, type UserTab } from "@/services/admin/users";
import { pick, pickEnum, pickId, pickPage, pctDelta, type SearchParams } from "@/services/admin/shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Kullanıcılar") };
}

const TAB_LABELS: Record<UserTab, string> = { all: m("Tüm Kullanıcılar"), active: m("Aktif"), suspended: m("Askıda"), banned: m("Yasaklı") };
const AGE_METHOD: Record<string, string> = { self_declared: m("Kendi beyanı"), provider: m("Sağlayıcı doğrulaması") };
const AGE_LEVEL: Record<string, string> = { none: m("Yok"), low: m("Düşük"), high: m("Yüksek") };
const AGE_STATUS: Record<string, string> = { pending: m("Bekliyor"), verified: m("Doğrulandı"), failed: m("Başarısız"), expired: m("Süresi doldu") };

/** Hesap dili (users.locale) — servis alanı sağladığında gösterilir. */
function userLocaleLabel(u: object): string | null {
  const l = (u as { locale?: unknown }).locale;
  return isLocale(l) ? LOCALE_META[l].label : null;
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user: me } = await requireAdmin("users.read");
  const t = await getT();
  const { formatDateTime, formatNumber, formatRelative, locale } = await getFormatters();
  const sp = await searchParams;
  const tab = pickEnum(sp, "status", USER_TABS, "all");
  const role = pickEnum(sp, "role", ["all", "fan", "creator", "admin"] as const, "all");
  const q = pick(sp, "q");
  const page = pickPage(sp);
  const canManage = can(me, "users.manage");
  const isSuper = me.adminRole === "super_admin";

  const [kpis, list, segments, security] = await Promise.all([
    getUserKpis(),
    listAdminUsers({ tab, q, role: role === "all" ? "" : role, page }),
    getUserSegments(),
    getSecuritySummary(),
  ]);
  const selectedId = pickId(sp, "sel") ?? list.items[0]?.id ?? null;
  const detail = selectedId ? await getAdminUserDetail(selectedId) : null;
  const base = { status: tab === "all" ? null : tab, role: role === "all" ? null : role, q: q || null };
  const hrefFor = (extra: Record<string, string | number | null>) => href("/admin/users", { ...base, ...extra });
  const protectedTarget = detail ? detail.id === me.id || (detail.roles.includes("admin") && !isSuper) : true;

  return (
    <AdminPage title={t("Kullanıcı Yönetimi")} description={t("Kullanıcı hesapları, erişim izinleri ve hesap güvenliğini yönetin.")}>
      <KpiGrid>
        <StatCard label={t("Toplam Kullanıcı")} value={formatNumber(kpis.total)} icon={<Users />} tone="pink" />
        <StatCard label={t("Aktif Abonelik")} value={formatNumber(kpis.activeSubs)} icon={<CreditCard />} tone="teal" foot={t("platform + creator abonelikleri")} />
        <StatCard label={t("Yeni Kayıt (7 gün)")} value={formatNumber(kpis.new7)} icon={<UserPlus />} tone="violet" delta={pctDelta(kpis.new7, kpis.new7Prev, locale)} foot={pctDelta(kpis.new7, kpis.new7Prev, locale) ? t("önceki 7 güne göre") : undefined} />
        <StatCard label={t("Kısıtlı Hesap")} value={formatNumber(kpis.restricted)} icon={<UserX />} tone="orange" foot={t("askıda veya yasaklı")} />
      </KpiGrid>

      <SplitLayout
        main={
          <div className="grid gap-5">
            <Card>
              <CardHeader title={t("Kullanıcı Listesi")} hint={t("Hesap durumuna göre filtrele")} />
              <TabLinks label={t("Hesap durumu")} active={tab} tabs={USER_TABS.map((tb) => ({ key: tb, label: t(TAB_LABELS[tb]), count: kpis.counts[tb] ?? 0, href: href("/admin/users", { status: tb === "all" ? null : tb, role: base.role, q: base.q }) }))} className="mb-4" />
              <FilterForm
                action="/admin/users"
                q={q}
                placeholder={t("Ad, e-posta, kullanıcı adı veya ID ara")}
                hidden={{ status: base.status }}
                selects={[
                  {
                    name: "role",
                    label: t("Rol filtresi"),
                    value: role,
                    options: [
                      { value: "all", label: t("Tüm roller") },
                      { value: "fan", label: t("Hayranlar") },
                      { value: "creator", label: t("Creator'lar") },
                      { value: "admin", label: t("Yöneticiler") },
                    ],
                  },
                ]}
                clearHref={hrefFor({ q: null, role: null })}
              />
              {list.items.length === 0 ? (
                <EmptyState compact title={t("Kullanıcı bulunamadı")} description={t("Arama veya filtreleri değiştirmeyi deneyin.")} />
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <Th>{t("Kullanıcı")}</Th>
                      <Th>{t("Rol")}</Th>
                      <Th>{t("Üyelik")}</Th>
                      <Th>{t("Son aktivite")}</Th>
                      <Th>{t("Hesap durumu")}</Th>
                      <Th className="text-end">{t("İşlem")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.items.map((u) => {
                      const on = u.id === selectedId;
                      return (
                        <tr key={u.id} className={on ? "bg-brand-50/60" : undefined}>
                          <Td>
                            <div className="flex items-center gap-3">
                              <Avatar src={u.image} name={u.name} size={36} />
                              <span className="min-w-0">
                                <b className="block truncate text-ink">{u.name}</b>
                                <small className="block truncate text-[10px] text-muted">{u.email}</small>
                              </span>
                            </div>
                          </Td>
                          <Td>
                            <div className="flex flex-wrap gap-1">
                              {u.roles
                                .filter((r) => r !== "fan" || u.roles.length === 1)
                                .map((r) => (
                                  <StatusPill key={r} size="sm" tone={r === "admin" ? "violet" : r === "creator" ? "pink" : "gray"}>
                                    {r === "admin" && u.adminRole ? t(ADMIN_ROLE_LABELS[u.adminRole]) : labelOf(t, USER_ROLE_LABELS, r)}
                                  </StatusPill>
                                ))}
                            </div>
                          </Td>
                          <Td>
                            <StatusPill tone={u.tier === "free" ? "gray" : "teal"}>{labelOf(t, TIER_LABELS, u.tier)}</StatusPill>
                          </Td>
                          <Td className="whitespace-nowrap">{u.lastSeenAt ? formatRelative(u.lastSeenAt) : "—"}</Td>
                          <Td>
                            <StatusPill tone={USER_STATUS_TONES[u.status] ?? "gray"}>{labelOf(t, USER_STATUS_LABELS, u.status)}</StatusPill>
                          </Td>
                          <Td className="text-end">
                            <Button asChild size="xs" variant={on ? "primary" : "secondary"}>
                              <Link href={hrefFor({ sel: u.id, page: page > 1 ? page : null })} scroll={false} aria-label={t("{name} ayrıntıları", { name: u.name })}>
                                {t("Detay")}
                              </Link>
                            </Button>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </DataTable>
              )}
              <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} noun={t("kullanıcı")} />
              <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p, sel: selectedId })} className="mt-4" />
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader title={t("Kullanıcı Segmentleri")} hint={t("Rol dağılımı")} />
                <Donut data={segments} height={150} centerValue={formatNumber(kpis.total)} centerLabel={t("kullanıcı")} />
              </Card>
              <Card>
                <CardHeader title={t("Güvenlik Kontrolleri")} hint={t("Hesap güvenliği kapsamı")} />
                <ScoreBar label={t("E-posta doğrulaması")} value={security.totalUsers ? (security.verified / security.totalUsers) * 100 : null} hint={t("{verified}/{totalUsers} hesap", { verified: security.verified, totalUsers: security.totalUsers })} tone="teal" />
                <ScoreBar label={t("Yönetici 2FA etkinliği")} value={security.admins ? (security.adminsWith2fa / security.admins) * 100 : null} hint={t("{adminsWith2fa}/{admins} yönetici", { adminsWith2fa: security.adminsWith2fa, admins: security.admins })} tone="violet" />
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  <ShieldCheck className="size-4 text-brand-500" aria-hidden />
                  <span>{t("Yönetici 2FA zorunluluğu:")}</span>
                  <StatusPill size="sm" tone={security.mfaEnforced ? "green" : "warn"}>
                    {security.mfaEnforced ? t("Açık") : t("Kapalı (yalnız yerel geliştirme)")}
                  </StatusPill>
                  <span>· {t("Etkin yönetici oturumu: {count}", { count: security.adminSessions })}</span>
                </div>
              </Card>
            </div>
          </div>
        }
        panel={
          detail ? (
            <Card>
              <CardHeader title={t("Kullanıcı Detayı")} hint={t("Hesap ve güvenlik özeti")} />
              <div className="mb-4 flex items-center gap-3">
                <Avatar src={detail.image} name={detail.name} size={56} />
                <div className="min-w-0">
                  <h3 className="truncate text-base font-black tracking-tight text-ink">{detail.name}</h3>
                  <p className="truncate text-[11px] text-muted">{detail.email}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <StatusPill size="sm" tone={USER_STATUS_TONES[detail.status] ?? "gray"}>
                      {labelOf(t, USER_STATUS_LABELS, detail.status)}
                    </StatusPill>
                    {detail.isDemo && (
                      <StatusPill size="sm" tone="warn">
                        {t("Demo kaydı")}
                      </StatusPill>
                    )}
                  </div>
                </div>
              </div>
              {detail.statusReason && (
                <Notice tone="warn" className="mb-3">
                  {t("Durum gerekçesi: {reason}", { reason: detail.statusReason })}
                </Notice>
              )}
              <DetailRow label={t("Roller")}>{detail.roles.map((r) => labelOf(t, USER_ROLE_LABELS, r)).join(", ")}</DetailRow>
              {detail.adminRole && <DetailRow label={t("Yönetici rolü")}>{t(ADMIN_ROLE_LABELS[detail.adminRole])}</DetailRow>}
              {userLocaleLabel(detail) && <DetailRow label={t("Hesap dili")}>{userLocaleLabel(detail)}</DetailRow>}
              <DetailRow label={t("Kayıt tarihi")}>{formatDateTime(detail.createdAt)}</DetailRow>
              <DetailRow label={t("Son aktivite")}>{detail.lastSeenAt ? formatDateTime(detail.lastSeenAt) : t("Kaydedilmedi")}</DetailRow>
              <DetailRow label={t("Kayıt niyeti")}>{detail.signupIntent === "creator" ? t("Creator olmak istiyor") : detail.signupIntent === "fan" ? t("Hayran") : "—"}</DetailRow>
              <DetailRow label={t("E-posta doğrulaması")}>
                <StatusPill size="sm" tone={detail.emailVerified ? "green" : "warn"}>
                  {detail.emailVerified ? t("Doğrulandı") : t("Doğrulanmadı")}
                </StatusPill>
              </DetailRow>
              <DetailRow label={t("İki adımlı doğrulama")}>
                <StatusPill size="sm" tone={detail.twoFactorEnabled ? "green" : "gray"}>
                  {detail.twoFactorEnabled ? t("Etkin") : t("Kapalı")}
                </StatusPill>
              </DetailRow>
              <DetailRow label={t("Cüzdan bakiyesi")}>{detail.wallet ? detail.wallet.status === "frozen" ? t("{count} kredi (dondurulmuş)", { count: formatNumber(detail.wallet.balance) }) : t("{count} kredi", { count: formatNumber(detail.wallet.balance) }) : t("Cüzdan yok")}</DetailRow>
              <DetailRow label={t("Abonelikler")}>
                {t("{active} aktif / {total} toplam", { active: detail.subscriptions.active, total: detail.subscriptions.total })}
              </DetailRow>
              <DetailRow label={t("Yaş doğrulama")}>
                {detail.age ? [labelOf(t, AGE_METHOD, detail.age.method), labelOf(t, AGE_LEVEL, detail.age.level), labelOf(t, AGE_STATUS, detail.age.status)].join(" · ") : t("Kayıt yok")}
              </DetailRow>
              {detail.creator && (
                <DetailRow label={t("Creator profili")}>
                  <Link href={href("/admin/creators", { sel: detail.creator.id })} className="text-brand-500 hover:underline">
                    @{detail.creator.username}
                  </Link>
                </DetailRow>
              )}

              {canManage && !protectedTarget && detail.status !== "deleted" && (
                <div className="mt-5 grid gap-2.5 border-t border-line-soft pt-4">
                  {detail.status === "active" ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      <ActionDialog
                        trigger={
                          <Button size="md" variant="outline">
                            {t("Askıya Al")}
                          </Button>
                        }
                        title={t("Hesabı askıya al")}
                        description={t("Kullanıcının tüm oturumları sonlandırılır ve giriş yapamaz. Creator ise profili de askıya alınır.")}
                        action={setUserStatusAction}
                        payload={{ userId: detail.id, status: "suspended" }}
                        reason={{ label: t("Askıya alma gerekçesi") }}
                        confirmLabel={t("Askıya al")}
                        tone="danger"
                      />
                      <ActionDialog
                        trigger={
                          <Button size="md" variant="danger-soft">
                            {t("Yasakla")}
                          </Button>
                        }
                        title={t("Hesabı yasakla")}
                        description={t("Yasak, askıdan daha ağır bir yaptırımdır. Oturumlar sonlandırılır; hesap yalnız yönetici tarafından açılabilir.")}
                        action={setUserStatusAction}
                        payload={{ userId: detail.id, status: "banned" }}
                        reason={{ label: t("Yasaklama gerekçesi") }}
                        confirmLabel={t("Yasakla")}
                        tone="danger"
                      />
                    </div>
                  ) : (
                    <ActionDialog
                      trigger={<Button size="md">{t("Hesabı Yeniden Etkinleştir")}</Button>}
                      title={t("Hesabı yeniden etkinleştir")}
                      description={t("Kullanıcı tekrar giriş yapabilir. Askıya alınmış creator profili ayrıca İçerik Üreticileri sayfasından açılmalıdır.")}
                      action={setUserStatusAction}
                      payload={{ userId: detail.id, status: "active" }}
                      reason={{ label: t("Gerekçe") }}
                      confirmLabel={t("Yeniden etkinleştir")}
                    />
                  )}
                </div>
              )}
              {canManage && protectedTarget && (
                <Notice tone="neutral" className="mt-4">
                  {detail.id === me.id ? t("Kendi hesabınız üzerinde yaptırım uygulayamazsınız.") : t("Yönetici hesaplarını yalnız Süper Yönetici yönetebilir.")}
                </Notice>
              )}

              {isSuper && detail.id !== me.id && detail.status === "active" && (
                <div className="mt-4 border-t border-line-soft pt-4">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">{t("Yönetici rolü (yalnız Süper Yönetici)")}</p>
                  <ActionDialog
                    trigger={
                      <Button size="md" variant="secondary">
                        {t("Yönetici Rolünü Düzenle")}
                      </Button>
                    }
                    title={t("Yönetici rolünü düzenle")}
                    description={t("Rol değişikliği kullanıcının tüm oturumlarını sonlandırır. İşlem denetim kaydına kritik olarak yazılır.")}
                    action={setAdminRoleAction}
                    payload={{ userId: detail.id }}
                    fields={[
                      {
                        name: "adminRole",
                        label: t("Yönetici rolü"),
                        type: "select",
                        defaultValue: detail.adminRole ?? "none",
                        options: [{ value: "none", label: t("Yönetici değil (rolü kaldır)") }, ...ADMIN_ROLES.map((r) => ({ value: r, label: t(ADMIN_ROLE_LABELS[r]) }))],
                      },
                    ]}
                    reason={{ label: t("Rol değişikliği gerekçesi") }}
                    confirmLabel={t("Rolü kaydet")}
                    warning={t("Yönetici rolleri hassas verilere ve finansal işlemlere erişim sağlar. Yalnız gerekli minimum yetkiyi verin.")}
                  />
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <EmptyState compact title={t("Kullanıcı seçin")} description={t("Ayrıntıları görmek için listeden bir kullanıcı seçin.")} />
            </Card>
          )
        }
      />
    </AdminPage>
  );
}
