import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Crown, Headphones, Layers, MessageCircle, Mic, Wallet } from "lucide-react";
import { z } from "zod";
import { Verified } from "@/components/creator/creator-cards";
import { LinkTabs, buildHref, flattenSearchParams } from "@/components/fan/link-tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, DataTable, EmptyState, PageHeader, Pagination, StatCard, Td, Th } from "@/components/ui/display";
import { SubscriptionActions } from "@/features/fan/subscription-actions";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { listSubscriptionViews, type SubscriptionView } from "@/services/fan/subscriptions";
import { listPayments, TX_STATUS_LABELS } from "@/services/fan/wallet";
import { getFormatters, getT } from "@/i18n/server";
import { m } from "@/i18n/m";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Aboneliklerim") };
}
export const dynamic = "force-dynamic";

const searchSchema = z.object({
  tab: z.enum(["active", "canceled", "history"]).catch("active"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

const TIER_LABELS: Record<string, string> = { free: m("Ücretsiz"), basic: m("Temel"), premium: m("Premium"), vip: m("VIP") };
const STATUS_LABELS: Record<string, string> = { pending: m("Beklemede"), active: m("Aktif"), past_due: m("Ödeme gecikti"), canceled: m("İptal edildi"), expired: m("Süresi doldu") };

function monthlyEquivalent(s: SubscriptionView) {
  return s.interval === "year" ? Math.round(s.amountMinor / 12) : s.amountMinor;
}

async function SubCard({ s }: { s: SubscriptionView }) {
  const t = await getT();
  const { formatDate, formatMoney } = await getFormatters();
  const name = s.scope === "platform" ? t("HEYFANS Platform") : (s.creator?.displayName ?? t("İçerik üreticisi"));
  // Platform plan adları veritabanı başvuru içeriğidir (çevrilir); içerik üretici plan adları çevrilmez.
  const planName = s.scope === "platform" ? t(s.planName) : s.planName;
  const price = formatMoney(s.amountMinor, s.currency);
  const ending = s.cancelAtPeriodEnd || !s.isActive;
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-line-soft bg-[#fcfafd] p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        {s.scope === "platform" ? (
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-500">
            <Crown className="size-5" aria-hidden />
          </span>
        ) : (
          <Link href={s.creator ? `/creators/${s.creator.username}` : "#"} aria-label={t("{name} profili", { name })}>
            <Avatar src={s.creator?.avatarUrl ?? null} name={name} size={48} />
          </Link>
        )}
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-extrabold">
            <span className="truncate">{name}</span> {s.creator?.verified && <Verified />}
            {s.isDemo && (
              <Badge tone="warn" size="sm">
                {t("Demo")}
              </Badge>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {s.interval === "year" ? t("{plan} üyeliği · {price} / yıl", { plan: planName, price }) : t("{plan} üyeliği · {price} / ay", { plan: planName, price })}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={s.isActive ? (s.cancelAtPeriodEnd ? "warn" : "green") : "gray"} size="sm" dot>
              {s.isActive ? (s.cancelAtPeriodEnd ? t("Dönem sonunda sona erecek") : t("Aktif")) : t(STATUS_LABELS[s.status] ?? s.status)}
            </Badge>
            <Badge tone="gray" size="sm">
              {t(TIER_LABELS[s.tier] ?? s.tier)}
            </Badge>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2.5 sm:items-end">
        {s.periodEnd && (
          <div className="sm:text-end">
            <p className="text-[9px] font-black tracking-[0.14em] text-muted">{ending ? t("BİTİŞ TARİHİ") : t("SONRAKİ YENİLEME")}</p>
            <p className="text-xs font-extrabold">{formatDate(s.periodEnd)}</p>
          </div>
        )}
        {s.isActive ? (
          <div className="flex flex-wrap gap-2">
            {s.scope === "creator" && s.creator && (
              <Link href={`/creators/${s.creator.username}/membership`} className="inline-flex h-9 items-center rounded-full border border-brand-300 px-4 text-[11px] font-extrabold text-brand-600 hover:bg-brand-50">
                {t("Planı değiştir")}
              </Link>
            )}
            <SubscriptionActions id={s.id} name={name} cancelAtPeriodEnd={s.cancelAtPeriodEnd} periodEnd={s.periodEnd} />
          </div>
        ) : (
          s.scope === "creator" &&
          s.creator && (
            <Link href={`/creators/${s.creator.username}/membership`} className="inline-flex h-9 items-center rounded-full bg-brand-500 px-4 text-[11px] font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
              {t("Yeniden üye ol")}
            </Link>
          )
        )}
      </div>
    </li>
  );
}

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireUser("/app/subscriptions");
  const t = await getT();
  const { formatDate, formatDateTime, formatMoney } = await getFormatters();
  const sp = searchSchema.parse(flattenSearchParams(await searchParams));
  const [subs, payments] = await Promise.all([
    listSubscriptionViews(user.id),
    sp.tab === "history" ? listPayments(user.id, { page: sp.page, kind: "subscription" }) : Promise.resolve(null),
  ]);
  const active = subs.filter((s) => s.isActive);
  const endedOrEnding = subs.filter((s) => s.cancelAtPeriodEnd || !s.isActive);
  const monthlyByCurrency = new Map<string, number>();
  for (const s of active) monthlyByCurrency.set(s.currency, (monthlyByCurrency.get(s.currency) ?? 0) + monthlyEquivalent(s));
  const monthlyText = monthlyByCurrency.size ? [...monthlyByCurrency].map(([c, v]) => formatMoney(v, c)).join(" + ") : formatMoney(0, "TRY");
  const nextEnd = active.filter((s) => s.periodEnd).sort((a, b) => new Date(a.periodEnd!).getTime() - new Date(b.periodEnd!).getTime())[0];
  const href = (tab: string, page = 1) => buildHref("/app/subscriptions", { tab: tab === "active" ? null : tab, page: page > 1 ? page : null });
  const list = sp.tab === "active" ? active : sp.tab === "canceled" ? endedOrEnding : [];

  return (
    <div className="mx-auto max-w-[1320px]">
      <PageHeader eyebrow={t("HEYFANS / ÜYELİK YÖNETİMİ")} title={t("Aboneliklerim")} description={t("Aktif üyeliklerini, bitiş tarihlerini ve avantajlarını tek yerden yönet.")} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t("Aktif üyelik")} value={active.length} icon={<Layers />} />
        <StatCard label={t("Aylık üyelik toplamı")} value={<span className="text-[18px]">{monthlyText}</span>} icon={<Wallet />} tone="violet" foot={active.some((s) => s.interval === "year") ? t("Yıllıklar aya bölündü") : undefined} />
        <StatCard label={t("Yaklaşan dönem sonu")} value={nextEnd?.periodEnd ? formatDate(nextEnd.periodEnd) : "—"} icon={<CalendarClock />} tone="teal" />
      </div>

      <Card padded={false} className="mt-4 p-3">
        <LinkTabs
          label={t("Üyelik görünümü")}
          items={[
            { href: href("active"), label: t("Aktif Üyelikler"), active: sp.tab === "active", count: active.length },
            { href: href("canceled"), label: t("İptal Edilenler / Biten"), active: sp.tab === "canceled", count: endedOrEnding.length },
            { href: href("history"), label: t("Ödeme Geçmişi"), active: sp.tab === "history" },
          ]}
        />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          {sp.tab !== "history" ? (
            <>
              <CardHeader title={sp.tab === "active" ? t("Üyeliklerin") : t("İptal edilen ve sona eren üyelikler")} hint={t("Her içerik üreticisinin planını ayrı yönet.")} />
              {list.length ? (
                <ul className="grid gap-3">
                  {list.map((s) => (
                    <SubCard key={s.id} s={s} />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<Crown />}
                  title={sp.tab === "active" ? t("Aktif üyeliğin yok") : t("İptal edilmiş üyeliğin yok")}
                  description={sp.tab === "active" ? t("Bir içerik üreticisine üye olarak özel içeriklere ve gelişmiş sohbet haklarına eriş.") : undefined}
                  action={
                    sp.tab === "active" ? (
                      <Link href="/explore" className="inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                        {t("İçerik üreticilerini keşfet")}
                      </Link>
                    ) : undefined
                  }
                />
              )}
            </>
          ) : (
            <>
              <CardHeader title={t("Üyelik ödemeleri")} hint={t("Üyelikler için yaptığın ödemeler")} />
              {payments && payments.rows.length ? (
                <>
                  <DataTable>
                    <thead>
                      <tr>
                        <Th>{t("Tarih")}</Th>
                        <Th>{t("Üyelik")}</Th>
                        <Th className="text-end">{t("Tutar")}</Th>
                        <Th>{t("Durum")}</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.rows.map((p) => (
                        <tr key={p.id}>
                          <Td className="whitespace-nowrap">{formatDateTime(p.createdAt)}</Td>
                          <Td className="font-extrabold text-ink">{p.label}</Td>
                          <Td className="text-end font-extrabold tabular-nums">{formatMoney(p.amountMinor, p.currency)}</Td>
                          <Td>
                            <span className="inline-flex items-center gap-1.5">
                              <Badge tone={p.status === "succeeded" ? "green" : p.status === "failed" ? "danger" : "gray"} size="sm">
                                {t(TX_STATUS_LABELS[p.status])}
                              </Badge>
                              {p.isTest && (
                                <Badge tone="warn" size="sm">
                                  {t("Test")}
                                </Badge>
                              )}
                            </span>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                  <Pagination className="mt-5" page={payments.page} pageCount={payments.pageCount} hrefFor={(n) => href("history", n)} />
                </>
              ) : (
                <EmptyState compact title={t("Henüz üyelik ödemen yok")} />
              )}
            </>
          )}
        </Card>

        <aside className="grid content-start gap-4">
          <Card className="hf-gradient-pink">
            <CardHeader title={t("Üyelik Avantajların")} />
            <ul className="grid gap-3.5">
              {[
                { icon: MessageCircle, title: m("Kişiselleştirilmiş sohbet"), desc: m("AI ikizleriyle yakın etkileşim") },
                { icon: Crown, title: m("Özel içerik"), desc: m("Creator onaylı koleksiyonlar") },
                { icon: Mic, title: m("Sesli deneyimler"), desc: m("Plan kapsamındaki kullanım hakları") },
                { icon: Headphones, title: m("Kontrol sende"), desc: m("Dönem sonunda iptal ve geri alma") },
              ].map((i) => (
                <li key={i.title} className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-white text-brand-500">
                    <i.icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold">{t(i.title)}</p>
                    <p className="text-[11px] text-muted">{t(i.desc)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <p className="text-sm font-extrabold">{t("Yeni bir üyelik keşfet")}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{t("Sevdiğin içerik üreticilerinin planlarını incele.")}</p>
            <Link href="/explore" className={cn("mt-4 flex h-10 items-center justify-center rounded-full bg-brand-500 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600")}>
              {t("İçerik üreticilerini keşfet")}
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
