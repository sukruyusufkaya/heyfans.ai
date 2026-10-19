import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Mail, ReceiptText, ShieldCheck, Smartphone } from "lucide-react";
import { z } from "zod";
import { LinkTabs, buildHref, flattenSearchParams } from "@/components/fan/link-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, EmptyState, PageHeader, Pagination, Td, Th } from "@/components/ui/display";
import { NotificationPrefs } from "@/features/fan/notification-prefs";
import { AccountRequests, PasswordForm, SessionsList } from "@/features/fan/settings-client";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { getPreferences, listAccountRequests } from "@/services/fan/account";
import { listPayments, TX_KIND_LABELS, TX_STATUS_LABELS } from "@/services/fan/wallet";

export const metadata: Metadata = { title: "Hesap ve Ödeme Ayarları" };
export const dynamic = "force-dynamic";

const searchSchema = z.object({
  tab: z.enum(["security", "payments", "notifications"]).catch("security"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireUser("/app/settings");
  const sp = searchSchema.parse(flattenSearchParams(await searchParams));
  const [prefs, requests, payments] = await Promise.all([
    getPreferences(user.id),
    sp.tab === "security" ? listAccountRequests(user.id) : Promise.resolve([]),
    sp.tab === "payments" ? listPayments(user.id, { page: sp.page }) : Promise.resolve(null),
  ]);
  const href = (tab: string, page = 1) => buildHref("/app/settings", { tab: tab === "security" ? null : tab, page: page > 1 ? page : null });

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader eyebrow="HEYFANS / HESAP AYARLARI" title="Hesap ve Ödeme Ayarları" description="Güvenlik, faturalandırma ve bildirim tercihlerini yönet." />
      <Card padded={false} className="mb-4 p-3">
        <LinkTabs
          label="Ayar bölümleri"
          items={[
            { href: href("security"), label: "Hesap Güvenliği", active: sp.tab === "security" },
            { href: href("payments"), label: "Ödemeler ve Fatura Geçmişi", active: sp.tab === "payments" },
            { href: href("notifications"), label: "Bildirim Ayarları", active: sp.tab === "notifications" },
          ]}
        />
      </Card>

      {sp.tab === "security" && (
        <div className="grid gap-4">
          <Card>
            <CardHeader title="Hesap Güvenliği" hint="Hesap bilgilerini ve erişim güvenliğini yönet." icon={<ShieldCheck />} />
            <ul className="divide-y divide-line-soft text-xs">
              <li className="flex flex-wrap items-center justify-between gap-3 pb-4">
                <div className="flex items-center gap-3">
                  <Mail className="size-[18px] text-brand-500" aria-hidden />
                  <div>
                    <p className="font-extrabold">E-posta adresi</p>
                    <p className="text-muted">{user.email}</p>
                  </div>
                </div>
                <Badge tone={user.emailVerified ? "green" : "warn"} size="md">
                  {user.emailVerified ? "Doğrulandı" : "Doğrulanmadı"}
                </Badge>
              </li>
              <li className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="size-[18px] text-brand-500" aria-hidden />
                  <div>
                    <p className="font-extrabold">İki adımlı doğrulama</p>
                    <p className="text-muted">{user.twoFactorEnabled ? "Etkin — girişte doğrulama kodu istenir." : "Etkin değil. Hesabını ek bir doğrulama adımıyla koru."}</p>
                  </div>
                </div>
                <Button asChild variant={user.twoFactorEnabled ? "secondary" : "soft"} size="sm" shape="pill">
                  <Link href="/security/mfa">{user.twoFactorEnabled ? "Yönet" : "Etkinleştir"}</Link>
                </Button>
              </li>
            </ul>
          </Card>
          <Card>
            <CardHeader title="Şifre" hint="Düzenli olarak güçlü ve benzersiz bir şifre kullan." />
            <PasswordForm />
          </Card>
          <Card>
            <CardHeader title="Aktif Oturumlar" hint="Hesabına bağlı cihaz oturumları." />
            <SessionsList />
          </Card>
          <Card>
            <CardHeader title="Hesap Yönetimi" hint="Verilerin üzerinde kontrol sende." />
            <AccountRequests requests={requests} />
          </Card>
        </div>
      )}

      {sp.tab === "payments" && (
        <div className="grid gap-4">
          <Card>
            <CardHeader title="Kayıtlı Ödeme Yöntemleri" icon={<CreditCard />} />
            <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-xs leading-relaxed text-ink-soft">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden />
              <p>
                <b className="text-ink">HEYFANS kart bilgilerini saklamaz.</b> Kart bilgilerin yalnızca ödeme sağlayıcısının güvenli sayfasında girilir ve orada işlenir; bu nedenle burada kayıtlı kart listesi bulunmaz.
              </p>
            </div>
          </Card>
          <Card>
            <CardHeader title="Fatura ve Ödemeler" hint="Kredi, üyelik ve içerik ödemelerin." icon={<ReceiptText />} />
            {payments && payments.rows.length ? (
              <>
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Tarih</Th>
                      <Th>Ürün</Th>
                      <Th>Tür</Th>
                      <Th className="text-right">Tutar</Th>
                      <Th>Durum</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.rows.map((p) => (
                      <tr key={p.id}>
                        <Td className="whitespace-nowrap">{formatDateTime(p.createdAt)}</Td>
                        <Td className="font-extrabold text-ink">{p.label}</Td>
                        <Td>{TX_KIND_LABELS[p.kind]}</Td>
                        <Td className="text-right font-extrabold tabular-nums">
                          {formatMoney(p.amountMinor, p.currency)}
                          {p.refundedMinor > 0 && <span className="block text-[10px] font-bold text-muted">İade: {formatMoney(p.refundedMinor, p.currency)}</span>}
                        </Td>
                        <Td>
                          <span className="inline-flex flex-wrap items-center gap-1.5">
                            <Badge tone={p.status === "succeeded" ? "green" : p.status === "failed" || p.status === "chargeback" ? "danger" : p.status === "pending" || p.status === "created" ? "warn" : "gray"} size="sm">
                              {TX_STATUS_LABELS[p.status]}
                            </Badge>
                            {p.isTest && (
                              <Badge tone="warn" size="sm" title="Test ödeme sağlayıcısıyla yapılmış işlem">
                                TEST
                              </Badge>
                            )}
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
                <Pagination className="mt-5" page={payments.page} pageCount={payments.pageCount} hrefFor={(n) => href("payments", n)} />
              </>
            ) : (
              <EmptyState compact icon={<ReceiptText />} title="Henüz ödeme geçmişin yok" description="Kredi satın aldığında veya üye olduğunda ödemelerin burada listelenir." />
            )}
          </Card>
        </div>
      )}

      {sp.tab === "notifications" && (
        <Card>
          <CardHeader title="Bildirim Ayarları" hint="Hangi bildirimleri almak istediğini seç." />
          <NotificationPrefs initial={prefs.notifications} />
        </Card>
      )}
    </div>
  );
}
