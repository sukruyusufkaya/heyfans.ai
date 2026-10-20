import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Globe, Mail, ReceiptText, ShieldCheck, Smartphone } from "lucide-react";
import { z } from "zod";
import { LinkTabs, buildHref, flattenSearchParams } from "@/components/fan/link-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { DataTable, EmptyState, PageHeader, Pagination, Td, Th } from "@/components/ui/display";
import { NotificationPrefs } from "@/features/fan/notification-prefs";
import { AccountRequests, PasswordForm, SessionsList } from "@/features/fan/settings-client";
import { requireUser } from "@/lib/auth/session";
import { getPreferences, listAccountRequests } from "@/services/fan/account";
import { listPayments, TX_KIND_LABELS, TX_STATUS_LABELS } from "@/services/fan/wallet";
import { getFormatters, getT } from "@/i18n/server";
import { rich } from "@/components/fan/rich";
import { m } from "@/i18n/m";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Hesap ve Ödeme Ayarları") };
}
export const dynamic = "force-dynamic";

const searchSchema = z.object({
  tab: z.enum(["security", "payments", "notifications", "language"]).catch("security"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireUser("/app/settings");
  const t = await getT();
  const { formatDateTime, formatMoney } = await getFormatters();
  const sp = searchSchema.parse(flattenSearchParams(await searchParams));
  const [prefs, requests, payments] = await Promise.all([
    getPreferences(user.id),
    sp.tab === "security" ? listAccountRequests(user.id) : Promise.resolve([]),
    sp.tab === "payments" ? listPayments(user.id, { page: sp.page }) : Promise.resolve(null),
  ]);
  const href = (tab: string, page = 1) => buildHref("/app/settings", { tab: tab === "security" ? null : tab, page: page > 1 ? page : null });

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader eyebrow={t("HEYFANS / HESAP AYARLARI")} title={t("Hesap ve Ödeme Ayarları")} description={t("Güvenlik, faturalandırma ve bildirim tercihlerini yönet.")} />
      <Card padded={false} className="mb-4 p-3">
        <LinkTabs
          label={t("Ayar bölümleri")}
          items={[
            { href: href("security"), label: t("Hesap Güvenliği"), active: sp.tab === "security" },
            { href: href("payments"), label: t("Ödemeler ve Fatura Geçmişi"), active: sp.tab === "payments" },
            { href: href("notifications"), label: t("Bildirim Ayarları"), active: sp.tab === "notifications" },
            { href: href("language"), label: t("Dil"), active: sp.tab === "language" },
          ]}
        />
      </Card>

      {sp.tab === "security" && (
        <div className="grid gap-4">
          <Card>
            <CardHeader title={t("Hesap Güvenliği")} hint={t("Hesap bilgilerini ve erişim güvenliğini yönet.")} icon={<ShieldCheck />} />
            <ul className="divide-y divide-line-soft text-xs">
              <li className="flex flex-wrap items-center justify-between gap-3 pb-4">
                <div className="flex items-center gap-3">
                  <Mail className="size-[18px] text-brand-500" aria-hidden />
                  <div>
                    <p className="font-extrabold">{t("E-posta adresi")}</p>
                    <p className="text-muted">{user.email}</p>
                  </div>
                </div>
                <Badge tone={user.emailVerified ? "green" : "warn"} size="md">
                  {user.emailVerified ? t("Doğrulandı") : t("Doğrulanmadı")}
                </Badge>
              </li>
              <li className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="size-[18px] text-brand-500" aria-hidden />
                  <div>
                    <p className="font-extrabold">{t("İki adımlı doğrulama")}</p>
                    <p className="text-muted">{user.twoFactorEnabled ? t("Etkin — girişte doğrulama kodu istenir.") : t("Etkin değil. Hesabını ek bir doğrulama adımıyla koru.")}</p>
                  </div>
                </div>
                <Button asChild variant={user.twoFactorEnabled ? "secondary" : "soft"} size="sm" shape="pill">
                  <Link href="/security/mfa">{user.twoFactorEnabled ? t("Yönet") : t("Etkinleştir")}</Link>
                </Button>
              </li>
            </ul>
          </Card>
          <Card>
            <CardHeader title={t("Şifre")} hint={t("Düzenli olarak güçlü ve benzersiz bir şifre kullan.")} />
            <PasswordForm />
          </Card>
          <Card>
            <CardHeader title={t("Aktif Oturumlar")} hint={t("Hesabına bağlı cihaz oturumları.")} />
            <SessionsList />
          </Card>
          <Card>
            <CardHeader title={t("Hesap Yönetimi")} hint={t("Verilerin üzerinde kontrol sende.")} />
            <AccountRequests requests={requests} />
          </Card>
        </div>
      )}

      {sp.tab === "payments" && (
        <div className="grid gap-4">
          <Card>
            <CardHeader title={t("Kayıtlı Ödeme Yöntemleri")} icon={<CreditCard />} />
            <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-xs leading-relaxed text-ink-soft">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden />
              <p>
                {rich(t, m("<b>HEYFANS kart bilgilerini saklamaz.</b> Kart bilgilerin yalnızca ödeme sağlayıcısının güvenli sayfasında girilir ve orada işlenir; bu nedenle burada kayıtlı kart listesi bulunmaz."), { b: (c) => <b className="text-ink">{c}</b> })}
              </p>
            </div>
          </Card>
          <Card>
            <CardHeader title={t("Fatura ve Ödemeler")} hint={t("Kredi, üyelik ve içerik ödemelerin.")} icon={<ReceiptText />} />
            {payments && payments.rows.length ? (
              <>
                <DataTable>
                  <thead>
                    <tr>
                      <Th>{t("Tarih")}</Th>
                      <Th>{t("Ürün")}</Th>
                      <Th>{t("Tür")}</Th>
                      <Th className="text-end">{t("Tutar")}</Th>
                      <Th>{t("Durum")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.rows.map((p) => (
                      <tr key={p.id}>
                        <Td className="whitespace-nowrap">{formatDateTime(p.createdAt)}</Td>
                        <Td className="font-extrabold text-ink">{p.label}</Td>
                        <Td>{t(TX_KIND_LABELS[p.kind])}</Td>
                        <Td className="text-end font-extrabold tabular-nums">
                          {formatMoney(p.amountMinor, p.currency)}
                          {p.refundedMinor > 0 && <span className="block text-[10px] font-bold text-muted">{t("İade: {amount}", { amount: formatMoney(p.refundedMinor, p.currency) })}</span>}
                        </Td>
                        <Td>
                          <span className="inline-flex flex-wrap items-center gap-1.5">
                            <Badge tone={p.status === "succeeded" ? "green" : p.status === "failed" || p.status === "chargeback" ? "danger" : p.status === "pending" || p.status === "created" ? "warn" : "gray"} size="sm">
                              {t(TX_STATUS_LABELS[p.status])}
                            </Badge>
                            {p.isTest && (
                              <Badge tone="warn" size="sm" title={t("Test ödeme sağlayıcısıyla yapılmış işlem")}>
                                {t("TEST")}
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
              <EmptyState compact icon={<ReceiptText />} title={t("Henüz ödeme geçmişin yok")} description={t("Kredi satın aldığında veya üye olduğunda ödemelerin burada listelenir.")} />
            )}
          </Card>
        </div>
      )}

      {sp.tab === "notifications" && (
        <Card>
          <CardHeader title={t("Bildirim Ayarları")} hint={t("Hangi bildirimleri almak istediğini seç.")} />
          <NotificationPrefs initial={prefs.notifications} />
        </Card>
      )}

      {sp.tab === "language" && (
        <Card>
          <CardHeader title={t("Dil")} hint={t("Arayüz, e-posta ve bildirim dilin. Varsayılan olarak bulunduğun konuma göre seçilir.")} icon={<Globe />} />
          <LanguageSwitcher variant="select" className="w-full max-w-xs" />
        </Card>
      )}
    </div>
  );
}
