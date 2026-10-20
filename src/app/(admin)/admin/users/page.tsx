import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, UserPlus, Users, UserX, CreditCard } from "lucide-react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { TIER_LABELS, USER_ROLE_LABELS, USER_STATUS_LABELS, USER_STATUS_TONES } from "@/components/admin/labels";
import { AdminPage, DetailRow, FilterForm, KpiGrid, Notice, ResultCount, ScoreBar, SplitLayout, StatusPill, TabLinks, href } from "@/components/admin/ui";
import { Donut } from "@/components/charts/charts";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, DataTable, EmptyState, Pagination, StatCard, Td, Th } from "@/components/ui/display";
import { setAdminRoleAction, setUserStatusAction } from "@/features/admin/users-actions";
import { requireAdmin } from "@/lib/auth/session";
import { ADMIN_ROLE_LABELS, can } from "@/lib/permissions";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/utils";
import { ADMIN_ROLES } from "@/models/identity";
import { getAdminUserDetail, getSecuritySummary, getUserKpis, getUserSegments, listAdminUsers, USER_TABS, type UserTab } from "@/services/admin/users";
import { pick, pickEnum, pickId, pickPage, pctDelta, type SearchParams } from "@/services/admin/shared";

export const metadata: Metadata = { title: "Kullanıcılar" };

const TAB_LABELS: Record<UserTab, string> = { all: "Tüm Kullanıcılar", active: "Aktif", suspended: "Askıda", banned: "Yasaklı" };
const AGE_METHOD: Record<string, string> = { self_declared: "Kendi beyanı", provider: "Sağlayıcı doğrulaması" };
const AGE_LEVEL: Record<string, string> = { none: "Yok", low: "Düşük", high: "Yüksek" };
const AGE_STATUS: Record<string, string> = { pending: "Bekliyor", verified: "Doğrulandı", failed: "Başarısız", expired: "Süresi doldu" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user: me } = await requireAdmin("users.read");
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
    <AdminPage title="Kullanıcı Yönetimi" description="Kullanıcı hesapları, erişim izinleri ve hesap güvenliğini yönetin.">
      <KpiGrid>
        <StatCard label="Toplam Kullanıcı" value={formatNumber(kpis.total)} icon={<Users />} tone="pink" />
        <StatCard label="Aktif Abonelik" value={formatNumber(kpis.activeSubs)} icon={<CreditCard />} tone="teal" foot="platform + creator abonelikleri" />
        <StatCard label="Yeni Kayıt (7 gün)" value={formatNumber(kpis.new7)} icon={<UserPlus />} tone="violet" delta={pctDelta(kpis.new7, kpis.new7Prev)} foot={pctDelta(kpis.new7, kpis.new7Prev) ? "önceki 7 güne göre" : undefined} />
        <StatCard label="Kısıtlı Hesap" value={formatNumber(kpis.restricted)} icon={<UserX />} tone="orange" foot="askıda veya yasaklı" />
      </KpiGrid>

      <SplitLayout
        main={
          <div className="grid gap-5">
            <Card>
              <CardHeader title="Kullanıcı Listesi" hint="Hesap durumuna göre filtrele" />
              <TabLinks label="Hesap durumu" active={tab} tabs={USER_TABS.map((t) => ({ key: t, label: TAB_LABELS[t], count: kpis.counts[t] ?? 0, href: href("/admin/users", { status: t === "all" ? null : t, role: base.role, q: base.q }) }))} className="mb-4" />
              <FilterForm
                action="/admin/users"
                q={q}
                placeholder="Ad, e-posta, kullanıcı adı veya ID ara"
                hidden={{ status: base.status }}
                selects={[
                  {
                    name: "role",
                    label: "Rol filtresi",
                    value: role,
                    options: [
                      { value: "all", label: "Tüm roller" },
                      { value: "fan", label: "Hayranlar" },
                      { value: "creator", label: "Creator'lar" },
                      { value: "admin", label: "Yöneticiler" },
                    ],
                  },
                ]}
                clearHref={hrefFor({ q: null, role: null })}
              />
              {list.items.length === 0 ? (
                <EmptyState compact title="Kullanıcı bulunamadı" description="Arama veya filtreleri değiştirmeyi deneyin." />
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Kullanıcı</Th>
                      <Th>Rol</Th>
                      <Th>Üyelik</Th>
                      <Th>Son aktivite</Th>
                      <Th>Hesap durumu</Th>
                      <Th className="text-end">İşlem</Th>
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
                                    {r === "admin" && u.adminRole ? ADMIN_ROLE_LABELS[u.adminRole] : USER_ROLE_LABELS[r]}
                                  </StatusPill>
                                ))}
                            </div>
                          </Td>
                          <Td>
                            <StatusPill tone={u.tier === "free" ? "gray" : "teal"}>{TIER_LABELS[u.tier] ?? u.tier}</StatusPill>
                          </Td>
                          <Td className="whitespace-nowrap">{u.lastSeenAt ? formatRelative(u.lastSeenAt) : "—"}</Td>
                          <Td>
                            <StatusPill tone={USER_STATUS_TONES[u.status] ?? "gray"}>{USER_STATUS_LABELS[u.status] ?? u.status}</StatusPill>
                          </Td>
                          <Td className="text-end">
                            <Button asChild size="xs" variant={on ? "primary" : "secondary"}>
                              <Link href={hrefFor({ sel: u.id, page: page > 1 ? page : null })} scroll={false} aria-label={`${u.name} ayrıntıları`}>
                                Detay
                              </Link>
                            </Button>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </DataTable>
              )}
              <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} noun="kullanıcı" />
              <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p, sel: selectedId })} className="mt-4" />
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader title="Kullanıcı Segmentleri" hint="Rol dağılımı" />
                <Donut data={segments} height={150} centerValue={formatNumber(kpis.total)} centerLabel="kullanıcı" />
              </Card>
              <Card>
                <CardHeader title="Güvenlik Kontrolleri" hint="Hesap güvenliği kapsamı" />
                <ScoreBar label="E-posta doğrulaması" value={security.totalUsers ? (security.verified / security.totalUsers) * 100 : null} hint={`${security.verified}/${security.totalUsers} hesap`} tone="teal" />
                <ScoreBar label="Yönetici 2FA etkinliği" value={security.admins ? (security.adminsWith2fa / security.admins) * 100 : null} hint={`${security.adminsWith2fa}/${security.admins} yönetici`} tone="violet" />
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  <ShieldCheck className="size-4 text-brand-500" aria-hidden />
                  <span>Yönetici 2FA zorunluluğu: </span>
                  <StatusPill size="sm" tone={security.mfaEnforced ? "green" : "warn"}>
                    {security.mfaEnforced ? "Açık" : "Kapalı (yalnız yerel geliştirme)"}
                  </StatusPill>
                  <span>· Etkin yönetici oturumu: {security.adminSessions}</span>
                </div>
              </Card>
            </div>
          </div>
        }
        panel={
          detail ? (
            <Card>
              <CardHeader title="Kullanıcı Detayı" hint="Hesap ve güvenlik özeti" />
              <div className="mb-4 flex items-center gap-3">
                <Avatar src={detail.image} name={detail.name} size={56} />
                <div className="min-w-0">
                  <h3 className="truncate text-base font-black tracking-tight text-ink">{detail.name}</h3>
                  <p className="truncate text-[11px] text-muted">{detail.email}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <StatusPill size="sm" tone={USER_STATUS_TONES[detail.status] ?? "gray"}>
                      {USER_STATUS_LABELS[detail.status] ?? detail.status}
                    </StatusPill>
                    {detail.isDemo && (
                      <StatusPill size="sm" tone="warn">
                        Demo kaydı
                      </StatusPill>
                    )}
                  </div>
                </div>
              </div>
              {detail.statusReason && (
                <Notice tone="warn" className="mb-3">
                  Durum gerekçesi: {detail.statusReason}
                </Notice>
              )}
              <DetailRow label="Roller">{detail.roles.map((r) => USER_ROLE_LABELS[r] ?? r).join(", ")}</DetailRow>
              {detail.adminRole && <DetailRow label="Yönetici rolü">{ADMIN_ROLE_LABELS[detail.adminRole]}</DetailRow>}
              <DetailRow label="Kayıt tarihi">{formatDateTime(detail.createdAt)}</DetailRow>
              <DetailRow label="Son aktivite">{detail.lastSeenAt ? formatDateTime(detail.lastSeenAt) : "Kaydedilmedi"}</DetailRow>
              <DetailRow label="Kayıt niyeti">{detail.signupIntent === "creator" ? "Creator olmak istiyor" : detail.signupIntent === "fan" ? "Hayran" : "—"}</DetailRow>
              <DetailRow label="E-posta doğrulaması">
                <StatusPill size="sm" tone={detail.emailVerified ? "green" : "warn"}>
                  {detail.emailVerified ? "Doğrulandı" : "Doğrulanmadı"}
                </StatusPill>
              </DetailRow>
              <DetailRow label="İki adımlı doğrulama">
                <StatusPill size="sm" tone={detail.twoFactorEnabled ? "green" : "gray"}>
                  {detail.twoFactorEnabled ? "Etkin" : "Kapalı"}
                </StatusPill>
              </DetailRow>
              <DetailRow label="Cüzdan bakiyesi">{detail.wallet ? `${formatNumber(detail.wallet.balance)} kredi${detail.wallet.status === "frozen" ? " (dondurulmuş)" : ""}` : "Cüzdan yok"}</DetailRow>
              <DetailRow label="Abonelikler">
                {detail.subscriptions.active} aktif / {detail.subscriptions.total} toplam
              </DetailRow>
              <DetailRow label="Yaş doğrulama">
                {detail.age ? `${AGE_METHOD[detail.age.method] ?? detail.age.method} · ${AGE_LEVEL[detail.age.level] ?? detail.age.level} · ${AGE_STATUS[detail.age.status] ?? detail.age.status}` : "Kayıt yok"}
              </DetailRow>
              {detail.creator && (
                <DetailRow label="Creator profili">
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
                            Askıya Al
                          </Button>
                        }
                        title="Hesabı askıya al"
                        description="Kullanıcının tüm oturumları sonlandırılır ve giriş yapamaz. Creator ise profili de askıya alınır."
                        action={setUserStatusAction}
                        payload={{ userId: detail.id, status: "suspended" }}
                        reason={{ label: "Askıya alma gerekçesi" }}
                        confirmLabel="Askıya al"
                        tone="danger"
                      />
                      <ActionDialog
                        trigger={
                          <Button size="md" variant="danger-soft">
                            Yasakla
                          </Button>
                        }
                        title="Hesabı yasakla"
                        description="Yasak, askıdan daha ağır bir yaptırımdır. Oturumlar sonlandırılır; hesap yalnız yönetici tarafından açılabilir."
                        action={setUserStatusAction}
                        payload={{ userId: detail.id, status: "banned" }}
                        reason={{ label: "Yasaklama gerekçesi" }}
                        confirmLabel="Yasakla"
                        tone="danger"
                      />
                    </div>
                  ) : (
                    <ActionDialog
                      trigger={<Button size="md">Hesabı Yeniden Etkinleştir</Button>}
                      title="Hesabı yeniden etkinleştir"
                      description="Kullanıcı tekrar giriş yapabilir. Askıya alınmış creator profili ayrıca İçerik Üreticileri sayfasından açılmalıdır."
                      action={setUserStatusAction}
                      payload={{ userId: detail.id, status: "active" }}
                      reason={{ label: "Gerekçe" }}
                      confirmLabel="Yeniden etkinleştir"
                    />
                  )}
                </div>
              )}
              {canManage && protectedTarget && (
                <Notice tone="neutral" className="mt-4">
                  {detail.id === me.id ? "Kendi hesabınız üzerinde yaptırım uygulayamazsınız." : "Yönetici hesaplarını yalnız Süper Yönetici yönetebilir."}
                </Notice>
              )}

              {isSuper && detail.id !== me.id && detail.status === "active" && (
                <div className="mt-4 border-t border-line-soft pt-4">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">Yönetici rolü (yalnız Süper Yönetici)</p>
                  <ActionDialog
                    trigger={
                      <Button size="md" variant="secondary">
                        Yönetici Rolünü Düzenle
                      </Button>
                    }
                    title="Yönetici rolünü düzenle"
                    description="Rol değişikliği kullanıcının tüm oturumlarını sonlandırır. İşlem denetim kaydına kritik olarak yazılır."
                    action={setAdminRoleAction}
                    payload={{ userId: detail.id }}
                    fields={[
                      {
                        name: "adminRole",
                        label: "Yönetici rolü",
                        type: "select",
                        defaultValue: detail.adminRole ?? "none",
                        options: [{ value: "none", label: "Yönetici değil (rolü kaldır)" }, ...ADMIN_ROLES.map((r) => ({ value: r, label: ADMIN_ROLE_LABELS[r] }))],
                      },
                    ]}
                    reason={{ label: "Rol değişikliği gerekçesi" }}
                    confirmLabel="Rolü kaydet"
                    warning="Yönetici rolleri hassas verilere ve finansal işlemlere erişim sağlar. Yalnız gerekli minimum yetkiyi verin."
                  />
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <EmptyState compact title="Kullanıcı seçin" description="Ayrıntıları görmek için listeden bir kullanıcı seçin." />
            </Card>
          )
        }
      />
    </AdminPage>
  );
}
