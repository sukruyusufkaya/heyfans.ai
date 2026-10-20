import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { LinkTabs, buildHref, flattenSearchParams } from "@/components/fan/link-tabs";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/display";
import { MarkAllReadButton, NotificationRow } from "@/features/fan/notification-list";
import { NotificationPrefs } from "@/features/fan/notification-prefs";
import { requireUser } from "@/lib/auth/session";
import { NOTIFICATION_TYPES } from "@/models/social";
import { getPreferences } from "@/services/fan/account";
import { listNotifications } from "@/services/notifications/notifications";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";
import type { MessageParams } from "@/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Bildirimler") };
}
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: m("Tümü") },
  { key: "unread", label: m("Okunmamış") },
  { key: "message", label: m("Sohbetler") },
  { key: "new_content", label: m("İçerikler") },
  { key: "subscription", label: m("Üyelikler") },
  { key: "payment", label: m("Ödemeler") },
  { key: "custom_request", label: m("Talepler") },
  { key: "system", label: m("Sistem") },
] as const;

const searchSchema = z.object({
  filter: z.enum(["all", "unread", ...NOTIFICATION_TYPES]).catch("all"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireUser("/app/notifications");
  const t = await getT();
  const sp = searchSchema.parse(flattenSearchParams(await searchParams));
  const [data, prefs] = await Promise.all([listNotifications(user.id, { filter: sp.filter, page: sp.page, pageSize: 15 }), getPreferences(user.id)]);
  const href = (filter: string, page = 1) => buildHref("/app/notifications", { filter: filter === "all" ? null : filter, page: page > 1 ? page : null });

  return (
    <div className="mx-auto max-w-[1320px]">
      <PageHeader eyebrow={t("HEYFANS / BİLDİRİMLER")} title={t("Bildirimler")} description={t("Sohbetlerden üyeliklere kadar tüm gelişmeler burada.")} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("Bildirim Merkezi")} hint={t("Hesabın ve takip ettiğin içerik üreticilerinin güncellemeleri.")} action={<MarkAllReadButton unread={data.unread} />} />
          <LinkTabs
            className="mb-4"
            label={t("Bildirim filtresi")}
            items={FILTERS.map((f) => ({
              href: href(f.key),
              label: t(f.label),
              active: sp.filter === f.key,
              count: f.key === "all" ? undefined : f.key === "unread" && data.unread ? data.unread : undefined,
            }))}
          />
          {data.items.length ? (
            <>
              <ul className="grid gap-2.5">
                {data.items.map((n) => {
                  // Bildirim metni Türkçe ICU kalıbı olarak saklanır; okuyanın dilinde sunucuda çevrilir.
                  const params = n.data?.params as MessageParams | undefined;
                  return (
                    <NotificationRow
                      key={`${n._id.toString()}:${n.readAt ? "r" : "u"}`}
                      n={{ id: n._id.toString(), type: n.type, title: t(n.title, params), body: n.body ? t(n.body, params) : null, link: n.link ?? null, read: Boolean(n.readAt), createdAt: new Date(n.createdAt).toISOString() }}
                    />
                  );
                })}
              </ul>
              <Pagination className="mt-5" page={data.page} pageCount={data.pageCount} hrefFor={(n) => href(sp.filter, n)} />
            </>
          ) : (
            <EmptyState
              icon={<Bell />}
              title={sp.filter === "unread" ? t("Okunmamış bildirimin yok") : t("Henüz bildirimin yok")}
              description={sp.filter === "all" ? t("Yeni mesajlar, içerikler, üyelik ve ödeme gelişmeleri burada görünür.") : t("Bu filtrede bildirim bulunamadı.")}
            />
          )}
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader title={t("Bildirim Tercihleri")} hint={t("Hangi bildirimleri almak istediğini seç.")} />
            <NotificationPrefs initial={prefs.notifications} />
          </Card>
          <Card className="hf-gradient-pink">
            <p className="flex items-center gap-2 text-sm font-extrabold">
              <ShieldCheck className="size-4 text-brand-500" aria-hidden /> {t("Hesabın güvende")}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-strong">{t("Güvenlikle ilgili kritik uyarılar tercihlerinden bağımsız olarak ayrıca iletilir.")}</p>
            <Link href="/app/settings" className="mt-3 inline-block text-xs font-extrabold text-brand-600 hover:underline">
              {t("Hesap güvenliği ayarları →")}
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
