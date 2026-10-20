import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCircle2, Settings2, Wallet, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/display";
import { STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { RequestsInbox, type RequestItem } from "@/features/studio/requests-inbox";
import { m } from "@/i18n/m";
import { getFormatters, getT } from "@/i18n/server";
import { requireCreator } from "@/lib/auth/session";
import { cn, serialize } from "@/lib/utils";
import { getPlatformSettings } from "@/services/platform/settings";
import { getRequestsInbox, requestsQuerySchema } from "@/services/studio/requests";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Özel Talepler") };
}

const TABS = [
  { key: "all", label: m("Tüm talepler") },
  { key: "pending", label: m("Yeni") },
  { key: "in_review", label: m("İncelenen") },
  { key: "approved", label: m("Onaylanan") },
  { key: "processing", label: m("İşlenen") },
  { key: "completed", label: m("Tamamlanan") },
  { key: "rejected", label: m("Reddedilen") },
  { key: "canceled", label: m("İptal") },
] as const;

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const { formatMoney, formatNumber } = await getFormatters();
  const { user } = await requireCreator();
  const raw = await searchParams;
  const { status } = requestsQuerySchema.parse({ status: Array.isArray(raw.status) ? raw.status[0] : raw.status });
  const [inbox, settings] = await Promise.all([getRequestsInbox(user.id, status), getPlatformSettings()]);
  const c = inbox.counts;
  const waiting = (c.pending ?? 0) + (c.in_review ?? 0);

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow={STUDIO_EYEBROW}
        title={t("Özel Talepler")}
        description={t("Hayranlarının kişiselleştirilmiş deneyim isteklerini güvenle yönet.")}
        actions={
          <Button asChild variant="outline">
            <Link href="/studio/settings">
              <Settings2 /> {t("Talep ayarları")}
            </Link>
          </Button>
        }
      />
      <section aria-label={t("Talep göstergeleri")} className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("Bekleyen talepler")} icon={<Bell />} value={formatNumber(waiting)} foot={t("{pending, number} yeni · {review, number} incelemede", { pending: c.pending ?? 0, review: c.in_review ?? 0 })} />
        <StatCard label={t("Tamamlanan")} icon={<CheckCircle2 />} tone="green" value={formatNumber(c.completed ?? 0)} />
        <StatCard label={t("Özel talep geliri")} icon={<Wallet />} tone="violet" value={formatMoney(inbox.earningsMinor)} foot={t("Creator payın")} />
        <StatCard label={t("Reddedilen / iptal")} icon={<XCircle />} tone="orange" value={formatNumber((c.rejected ?? 0) + (c.canceled ?? 0))} />
      </section>

      <nav aria-label={t("Durum sekmeleri")} className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const n = tab.key === "all" ? c.all : c[tab.key] ?? 0;
          const on = status === tab.key;
          return (
            <Link key={tab.key} href={tab.key === "all" ? "/studio/requests" : `/studio/requests?status=${tab.key}`} aria-current={on ? "page" : undefined} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-extrabold transition-colors", on ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink")}>
              {t(tab.label)}
              <span className={cn("rounded-full px-1.5 text-[9px]", on ? "bg-white/25" : "bg-white")}>{n}</span>
            </Link>
          );
        })}
      </nav>

      <RequestsInbox items={serialize(inbox.items) as unknown as RequestItem[]} creditValueMinor={settings.credits.valueMinor} />
    </div>
  );
}
