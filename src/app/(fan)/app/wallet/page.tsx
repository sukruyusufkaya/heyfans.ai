import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Coins, Lock, ReceiptText, Sparkles, Undo2 } from "lucide-react";
import { z } from "zod";
import { LinkTabs, buildHref, flattenSearchParams } from "@/components/fan/link-tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, EmptyState, PageHeader, Pagination, Progress, Td, Th } from "@/components/ui/display";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { getWalletPage, type LedgerRowView } from "@/services/fan/wallet";
import { LOCALE_META } from "@/i18n/config";
import { getFormatters, getT } from "@/i18n/server";
import { m } from "@/i18n/m";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Kredi ve Cüzdanım") };
}
export const dynamic = "force-dynamic";

const searchSchema = z.object({
  filter: z.enum(["all", "in", "out"]).catch("all"),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

const STATUS: Record<LedgerRowView["status"], { label: string; tone: "green" | "gray" | "violet" }> = {
  completed: { label: m("Tamamlandı"), tone: "green" },
  reversed: { label: m("İade edildi"), tone: "gray" },
  refund: { label: m("İade"), tone: "violet" },
};

export default async function WalletPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireUser("/app/wallet");
  const t = await getT();
  const { formatDateTime, formatMoney, formatNumber, locale } = await getFormatters();
  const sp = searchSchema.parse(flattenSearchParams(await searchParams));
  const w = await getWalletPage(user.id, { filter: sp.filter === "all" ? undefined : sp.filter, page: sp.page });
  const monthName = new Intl.DateTimeFormat(LOCALE_META[locale].intl, { month: "long", year: "numeric" }).format(new Date());
  const hrefFor = (filter: string, page = 1) => buildHref("/app/wallet", { filter: filter === "all" ? null : filter, page: page > 1 ? page : null });

  return (
    <div className="mx-auto max-w-[1320px]">
      <PageHeader
        eyebrow={t("HEYFANS / CÜZDAN")}
        title={t("Kredi ve Cüzdanım")}
        description={t("Kredi bakiyeni yönet, paketleri incele ve işlemlerini takip et.")}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section aria-label={t("Bakiye")} className="relative overflow-hidden rounded-[18px] bg-[linear-gradient(120deg,#1a0b20_0%,#42103a_55%,#8a0f60_100%)] p-6 text-white shadow-[0_18px_35px_rgb(50_23_38/0.15)] sm:p-7">
          <span aria-hidden className="pointer-events-none absolute -end-10 -top-10 size-56 rounded-full bg-brand-500/30 blur-3xl" />
          <p className="relative text-[10px] font-black tracking-[0.18em] text-[#ff99ce]">{t("KULLANILABİLİR BAKİYE")}</p>
          <p className="relative mt-3 flex items-baseline gap-2.5 text-[44px] font-black leading-none tracking-[-0.05em]">
            {formatNumber(w.summary.balance)} <span className="text-lg font-extrabold tracking-normal text-white/80">{t("kredi")}</span>
          </p>
          <p className="relative mt-3 max-w-sm text-xs leading-relaxed text-white/75">{t("AI sohbetlerinde, görüşmelerde, hediyelerde ve özel deneyimlerde kullanabilirsin.")}</p>
          <dl className="relative mt-5 flex flex-wrap gap-x-8 gap-y-2 text-[11px] text-white/70">
            <div>
              <dt className="inline">{t("Toplam yüklenen:")} </dt>
              <dd className="inline font-extrabold text-white">{formatNumber(w.summary.lifetimePurchased)}</dd>
            </div>
            <div>
              <dt className="inline">{t("Toplam harcanan:")} </dt>
              <dd className="inline font-extrabold text-white">{formatNumber(w.summary.lifetimeSpent)}</dd>
            </div>
          </dl>
          {w.summary.status === "frozen" && (
            <p role="alert" className="relative mt-4 flex items-center gap-2 rounded-xl bg-danger/90 px-3.5 py-2.5 text-xs font-bold">
              <Lock className="size-4" aria-hidden /> {t("Cüzdanın geçici olarak donduruldu. Destek ile iletişime geç.")}
            </p>
          )}
        </section>

        <Card>
          <CardHeader title={t("Bu ayki kullanım")} hint={monthName} />
          <p className="flex items-baseline gap-2 text-[30px] font-black tracking-[-0.04em]">
            {formatNumber(w.month.netSpent)} <span className="text-sm font-extrabold text-muted">{t("kredi")}</span>
            <Badge tone="pink" size="sm" className="ms-auto">
              {t("Bu ay")}
            </Badge>
          </p>
          {w.month.groups.length ? (
            <ul className="mt-4 grid gap-3">
              {w.month.groups.map((g) => (
                <li key={g.key}>
                  <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-ink-soft">{t(g.label)}</span>
                    <span className="font-extrabold">{formatNumber(g.credits)}</span>
                  </div>
                  <Progress value={w.month.grossSpent ? (g.credits / w.month.grossSpent) * 100 : 0} label={t("{label} harcaması", { label: t(g.label) })} />
                </li>
              ))}
              {w.month.refunded > 0 && <li className="text-[11px] text-muted">{t("İade edilen: {n} kredi (net hesaba yansıtıldı)", { n: formatNumber(w.month.refunded) })}</li>}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted">{t("Bu ay henüz kredi harcamadın.")}</p>
          )}
        </Card>
      </div>

      <section className="mt-6" aria-labelledby="packs">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 id="packs" className="text-xl font-extrabold tracking-[-0.03em]">
              {t("Kredi Paketleri")}
            </h2>
            <p className="mt-1 text-xs text-muted">{t("Krediler satın alma onaylandığında hesabına eklenir. Fiyatlara KDV dahildir.")}</p>
          </div>
        </div>
        {w.packs.length ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {w.packs.map((p) => {
              const total = p.credits + (p.bonusCredits ?? 0);
              return (
                <article key={p.key} className={cn("hf-card relative flex flex-col p-5", p.isPopular && "border-brand-300 shadow-[0_14px_32px_rgb(236_0_136/0.12)]")} aria-label={t("{n} kredilik paket", { n: total })}>
                  <div className="flex items-center justify-between">
                    <span className="grid size-9 place-items-center rounded-xl bg-brand-100 text-brand-500">
                      <Coins className="size-[18px]" aria-hidden />
                    </span>
                    <Badge tone={p.isPopular ? "solid" : "pink"} size="sm">
                      {p.isPopular ? t("AVANTAJLI") : t("KREDİ PAKETİ")}
                    </Badge>
                  </div>
                  <p className="mt-4 text-[26px] font-black leading-none tracking-[-0.04em]">{formatNumber(p.credits)}</p>
                  <p className="mt-1 text-[11px] font-bold text-muted">{t("kredi")}
                    {p.bonusCredits ? <span className="text-success"> + {t("{n} bonus", { n: formatNumber(p.bonusCredits) })}</span> : null}</p>
                  <p className="mt-3 text-sm font-extrabold">{formatMoney(p.priceMinor, "TRY")}</p>
                  <Link
                    href={`/checkout?type=credit_pack&pack=${encodeURIComponent(p.key)}`}
                    className={cn(
                      "mt-4 flex h-10 items-center justify-center rounded-full text-xs font-extrabold",
                      p.isPopular ? "bg-brand-500 text-white shadow-[var(--shadow-pink)] hover:bg-brand-600" : "border border-brand-300 text-brand-600 hover:bg-brand-50",
                    )}
                  >
                    {t("Satın al")}
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <Card>
            <EmptyState icon={<Coins />} title={t("Şu anda satın alınabilir paket yok")} description={t("Kredi paketleri yönetim tarafından tanımlandığında burada görünür.")} />
          </Card>
        )}
      </section>

      <Card className="mt-6">
        <CardHeader
          title={t("İşlem Geçmişi")}
          hint={t("Son kredi hareketlerin")}
          icon={<ReceiptText />}
          action={
            <Link href="/app/settings" className="text-[11px] font-extrabold text-brand-600 hover:underline">
              {t("Ödeme geçmişi →")}
            </Link>
          }
        />
        <LinkTabs
          label={t("İşlem filtresi")}
          className="mb-4"
          items={[
            { href: hrefFor("all"), label: t("Tüm işlemler"), active: sp.filter === "all" },
            { href: hrefFor("in"), label: <><ArrowDownLeft className="rtl:-scale-x-100" /> {t("Girenler")}</>, active: sp.filter === "in" },
            { href: hrefFor("out"), label: <><ArrowUpRight className="rtl:-scale-x-100" /> {t("Çıkanlar")}</>, active: sp.filter === "out" },
          ]}
        />
        {w.ledger.rows.length ? (
          <>
            <div className="hidden md:block">
              <DataTable>
                <thead>
                  <tr>
                    <Th>{t("Tarih")}</Th>
                    <Th>{t("İşlem")}</Th>
                    <Th className="text-end">{t("Miktar")}</Th>
                    <Th className="text-end">{t("Bakiye")}</Th>
                    <Th>{t("Durum")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {w.ledger.rows.map((r) => (
                    <tr key={r.id}>
                      <Td className="whitespace-nowrap text-muted-strong">{formatDateTime(r.createdAt)}</Td>
                      <Td>
                        <span className="font-extrabold text-ink">{t(r.label)}</span>
                        <span className="block max-w-[320px] truncate text-[10px] text-muted">{r.description}</span>
                      </Td>
                      <Td className={cn("text-end font-extrabold tabular-nums", r.amount > 0 ? "text-success" : "text-ink")}>
                        {r.amount > 0 ? "+" : "−"}
                        {t("{n} kredi", { n: formatNumber(Math.abs(r.amount)) })}
                      </Td>
                      <Td className="text-end tabular-nums text-muted-strong">{formatNumber(r.balanceAfter)}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-1.5">
                          <Badge tone={STATUS[r.status].tone} size="sm">
                            {r.status !== "completed" && <Undo2 className="rtl:-scale-x-100" />} {t(STATUS[r.status].label)}
                          </Badge>
                          {r.isDemo && (
                            <Badge tone="warn" size="sm">
                              {t("Demo")}
                            </Badge>
                          )}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
            <ul className="grid gap-2 md:hidden">
              {w.ledger.rows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-line-soft p-3">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", r.amount > 0 ? "bg-success-soft text-success" : "bg-soft text-muted-strong")}>
                    {r.amount > 0 ? <ArrowDownLeft className="rtl:-scale-x-100 size-4" /> : <ArrowUpRight className="rtl:-scale-x-100 size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-extrabold">{t(r.label)}</span>
                    <span className="block text-[10px] text-muted">
                      {formatDateTime(r.createdAt)} · {t(STATUS[r.status].label)}
                    </span>
                  </span>
                  <span className={cn("shrink-0 text-xs font-black tabular-nums", r.amount > 0 ? "text-success" : "text-ink")}>
                    {r.amount > 0 ? "+" : "−"}
                    {formatNumber(Math.abs(r.amount))}
                  </span>
                </li>
              ))}
            </ul>
            <Pagination className="mt-5" page={w.ledger.page} pageCount={w.ledger.pageCount} hrefFor={(n) => hrefFor(sp.filter, n)} />
          </>
        ) : (
          <EmptyState compact icon={<Sparkles />} title={t("Henüz işlem yok")} description={t("Kredi yüklediğinde ya da harcadığında hareketlerin burada listelenir.")} />
        )}
      </Card>
    </div>
  );
}
