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
import { cn, formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { listSubscriptionViews, type SubscriptionView } from "@/services/fan/subscriptions";
import { listPayments, TX_STATUS_LABELS } from "@/services/fan/wallet";

export const metadata: Metadata = { title: "Aboneliklerim" };
export const dynamic = "force-dynamic";

const searchSchema = z.object({
  tab: z.enum(["active", "canceled", "history"]).catch("active"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

const TIER_LABELS: Record<string, string> = { free: "Ücretsiz", basic: "Temel", premium: "Premium", vip: "VIP" };
const STATUS_LABELS: Record<string, string> = { pending: "Beklemede", active: "Aktif", past_due: "Ödeme gecikti", canceled: "İptal edildi", expired: "Süresi doldu" };

function monthlyEquivalent(s: SubscriptionView) {
  return s.interval === "year" ? Math.round(s.amountMinor / 12) : s.amountMinor;
}

function SubCard({ s }: { s: SubscriptionView }) {
  const name = s.scope === "platform" ? "HEYFANS Platform" : (s.creator?.displayName ?? "İçerik üreticisi");
  const ending = s.cancelAtPeriodEnd || !s.isActive;
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-line-soft bg-[#fcfafd] p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        {s.scope === "platform" ? (
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-500">
            <Crown className="size-5" aria-hidden />
          </span>
        ) : (
          <Link href={s.creator ? `/creators/${s.creator.username}` : "#"} aria-label={`${name} profili`}>
            <Avatar src={s.creator?.avatarUrl ?? null} name={name} size={48} />
          </Link>
        )}
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-extrabold">
            <span className="truncate">{name}</span> {s.creator?.verified && <Verified />}
            {s.isDemo && <Badge tone="warn" size="sm">Demo</Badge>}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {s.planName} üyeliği · {formatMoney(s.amountMinor, s.currency)} / {s.interval === "year" ? "yıl" : "ay"}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={s.isActive ? (s.cancelAtPeriodEnd ? "warn" : "green") : "gray"} size="sm" dot>
              {s.isActive ? (s.cancelAtPeriodEnd ? "Dönem sonunda sona erecek" : "Aktif") : (STATUS_LABELS[s.status] ?? s.status)}
            </Badge>
            <Badge tone="gray" size="sm">{TIER_LABELS[s.tier] ?? s.tier}</Badge>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2.5 sm:items-end">
        {s.periodEnd && (
          <div className="sm:text-end">
            <p className="text-[9px] font-black tracking-[0.14em] text-muted">{ending ? "BİTİŞ TARİHİ" : "SONRAKİ YENİLEME"}</p>
            <p className="text-xs font-extrabold">{formatDate(s.periodEnd)}</p>
          </div>
        )}
        {s.isActive ? (
          <div className="flex flex-wrap gap-2">
            {s.scope === "creator" && s.creator && (
              <Link href={`/creators/${s.creator.username}/membership`} className="inline-flex h-9 items-center rounded-full border border-brand-300 px-4 text-[11px] font-extrabold text-brand-600 hover:bg-brand-50">
                Planı değiştir
              </Link>
            )}
            <SubscriptionActions id={s.id} name={name} cancelAtPeriodEnd={s.cancelAtPeriodEnd} periodEnd={s.periodEnd} />
          </div>
        ) : (
          s.scope === "creator" &&
          s.creator && (
            <Link href={`/creators/${s.creator.username}/membership`} className="inline-flex h-9 items-center rounded-full bg-brand-500 px-4 text-[11px] font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
              Yeniden üye ol
            </Link>
          )
        )}
      </div>
    </li>
  );
}

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireUser("/app/subscriptions");
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
      <PageHeader eyebrow="HEYFANS / ÜYELİK YÖNETİMİ" title="Aboneliklerim" description="Aktif üyeliklerini, bitiş tarihlerini ve avantajlarını tek yerden yönet." />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Aktif üyelik" value={active.length} icon={<Layers />} />
        <StatCard label="Aylık üyelik toplamı" value={<span className="text-[18px]">{monthlyText}</span>} icon={<Wallet />} tone="violet" foot={active.some((s) => s.interval === "year") ? "Yıllıklar aya bölündü" : undefined} />
        <StatCard label="Yaklaşan dönem sonu" value={nextEnd?.periodEnd ? formatDate(nextEnd.periodEnd) : "—"} icon={<CalendarClock />} tone="teal" />
      </div>

      <Card padded={false} className="mt-4 p-3">
        <LinkTabs
          label="Üyelik görünümü"
          items={[
            { href: href("active"), label: "Aktif Üyelikler", active: sp.tab === "active", count: active.length },
            { href: href("canceled"), label: "İptal Edilenler / Biten", active: sp.tab === "canceled", count: endedOrEnding.length },
            { href: href("history"), label: "Ödeme Geçmişi", active: sp.tab === "history" },
          ]}
        />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          {sp.tab !== "history" ? (
            <>
              <CardHeader title={sp.tab === "active" ? "Üyeliklerin" : "İptal edilen ve sona eren üyelikler"} hint="Her içerik üreticisinin planını ayrı yönet." />
              {list.length ? (
                <ul className="grid gap-3">
                  {list.map((s) => (
                    <SubCard key={s.id} s={s} />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<Crown />}
                  title={sp.tab === "active" ? "Aktif üyeliğin yok" : "İptal edilmiş üyeliğin yok"}
                  description={sp.tab === "active" ? "Bir içerik üreticisine üye olarak özel içeriklere ve gelişmiş sohbet haklarına eriş." : undefined}
                  action={
                    sp.tab === "active" ? (
                      <Link href="/explore" className="inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                        İçerik üreticilerini keşfet
                      </Link>
                    ) : undefined
                  }
                />
              )}
            </>
          ) : (
            <>
              <CardHeader title="Üyelik ödemeleri" hint="Üyelikler için yaptığın ödemeler" />
              {payments && payments.rows.length ? (
                <>
                  <DataTable>
                    <thead>
                      <tr>
                        <Th>Tarih</Th>
                        <Th>Üyelik</Th>
                        <Th className="text-end">Tutar</Th>
                        <Th>Durum</Th>
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
                                {TX_STATUS_LABELS[p.status]}
                              </Badge>
                              {p.isTest && <Badge tone="warn" size="sm">Test</Badge>}
                            </span>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                  <Pagination className="mt-5" page={payments.page} pageCount={payments.pageCount} hrefFor={(n) => href("history", n)} />
                </>
              ) : (
                <EmptyState compact title="Henüz üyelik ödemen yok" />
              )}
            </>
          )}
        </Card>

        <aside className="grid content-start gap-4">
          <Card className="hf-gradient-pink">
            <CardHeader title="Üyelik Avantajların" />
            <ul className="grid gap-3.5">
              {[
                { icon: MessageCircle, t: "Kişiselleştirilmiş sohbet", d: "AI ikizleriyle yakın etkileşim" },
                { icon: Crown, t: "Özel içerik", d: "Creator onaylı koleksiyonlar" },
                { icon: Mic, t: "Sesli deneyimler", d: "Plan kapsamındaki kullanım hakları" },
                { icon: Headphones, t: "Kontrol sende", d: "Dönem sonunda iptal ve geri alma" },
              ].map((i) => (
                <li key={i.t} className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-white text-brand-500">
                    <i.icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold">{i.t}</p>
                    <p className="text-[11px] text-muted">{i.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <p className="text-sm font-extrabold">Yeni bir üyelik keşfet</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">Sevdiğin içerik üreticilerinin planlarını incele.</p>
            <Link href="/explore" className={cn("mt-4 flex h-10 items-center justify-center rounded-full bg-brand-500 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600")}>
              İçerik üreticilerini keşfet
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
