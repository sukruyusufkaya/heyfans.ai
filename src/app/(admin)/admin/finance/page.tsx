import type { Metadata } from "next";
import Link from "next/link";
import { Coins, Landmark, Receipt, Undo2 } from "lucide-react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { MoneyBars } from "@/components/admin/charts";
import { PAYOUT_ACCOUNT_LABELS, PAYOUT_ACCOUNT_TONES, PAYOUT_STATUS_LABELS, PAYOUT_STATUS_TONES, TX_KIND_LABELS, TX_STATUS_LABELS, TX_STATUS_TONES } from "@/components/admin/labels";
import { AdminPage, DetailRow, FilterForm, KpiGrid, Notice, ResultCount, StatusPill, TabLinks, href } from "@/components/admin/ui";
import { Donut } from "@/components/charts/charts";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, EmptyState, Pagination, StatCard, Td, Th } from "@/components/ui/display";
import { refundTransactionAction, updatePayoutAction, verifyPayoutAccountAction } from "@/features/admin/finance-actions";
import { m } from "@/i18n/m";
import { getFormatters, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { getFinanceOverview, getReconciliation, listPayoutAccountsForReview, listPayouts, listTransactions, PAYOUT_FILTERS, RANGES, TX_KINDS, TX_STATUSES, type RangeKey } from "@/services/admin/finance";
import { pick, pickEnum, pickPage, type SearchParams } from "@/services/admin/shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Finans ve İşlemler") };
}

const FINANCE_TABS = ["transactions", "payouts", "accounts", "reconciliation"] as const;
const TAB_LABELS = { transactions: m("İşlemler"), payouts: m("Ödeme Talepleri"), accounts: m("Ödeme Hesapları"), reconciliation: m("Mutabakat") } as const;
const RANGE_LABELS: Record<RangeKey, string> = { "30": m("Son 30 gün"), "90": m("Son 90 gün"), "365": m("Son 12 ay") };

export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("finance.read");
  const t = await getT();
  const { formatMoney, formatNumber } = await getFormatters();
  const sp = await searchParams;
  const tab = pickEnum(sp, "tab", FINANCE_TABS, "transactions");
  const range = pickEnum(sp, "range", ["30", "90", "365"] as const, "30");
  const canRefund = can(user, "finance.refund");
  const canPayout = can(user, "payouts.manage");
  const [ov] = await Promise.all([getFinanceOverview(RANGES[range])]);
  const donut = ov.byKind.map((k) => ({ name: TX_KIND_LABELS[k.kind] ? t(TX_KIND_LABELS[k.kind]!) : k.kind, value: k.value }));
  const keep = { range: range === "30" ? null : range };

  return (
    <AdminPage
      title={t("Finans ve İşlemler")}
      description={t("Abonelik, kredi, creator hakediş, iade ve finans mutabakatını izleyin.")}
      actions={
        <>
          <TabLinks label={t("Dönem")} active={range} tabs={(["30", "90", "365"] as const).map((r) => ({ key: r, label: t(RANGE_LABELS[r]), href: href("/admin/finance", { tab: tab === "transactions" ? null : tab, range: r === "30" ? null : r }) }))} className="mb-0" />
        </>
      }
    >
      <KpiGrid>
        <StatCard label={t("Brüt İşlem Hacmi · {range}", { range: t(RANGE_LABELS[range]) })} value={formatMoney(ov.gross, "TRY", { decimals: false })} icon={<Receipt />} tone="pink" delta={ov.grossDelta} foot={ov.grossDelta ? t("önceki döneme göre") : t("{count} işlem", { count: formatNumber(ov.grossCount) })} />
        <StatCard label={t("Platform Payı")} value={formatMoney(ov.platformFee, "TRY", { decimals: false })} icon={<Landmark />} tone="violet" delta={ov.platformDelta} foot={ov.platformDelta ? t("hak ediş defterinden") : t("hak ediş defterinden")} />
        <StatCard label={t("Creator Hakedişi")} value={formatMoney(ov.creatorShare, "TRY", { decimals: false })} icon={<Coins />} tone="teal" delta={ov.creatorDelta} foot={ov.creatorDelta ? t("önceki döneme göre") : t("hak ediş defterinden")} />
        <StatCard label={t("İade ve İtiraz")} value={formatMoney(ov.refunds, "TRY", { decimals: false })} icon={<Undo2 className="rtl:-scale-x-100" />} tone="orange" delta={ov.refundDelta && { ...ov.refundDelta, direction: ov.refundDelta.direction === "up" ? "down" : ov.refundDelta.direction === "down" ? "up" : "flat" }} foot={t("{count} iade", { count: formatNumber(ov.refundCount) })} />
      </KpiGrid>
      {ov.testCount > 0 && (
        <Notice tone="warn" className="-mt-2">
          {t("Bu dönemdeki {count} işlem test/demo sağlayıcıdan gelir; gerçek para hareketi içermez. Komisyon ve ödeme kuralları ayrıca belirlenmelidir.", { count: formatNumber(ov.testCount) })}
        </Notice>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("Gelir Akışı")} hint={t("Son 12 ay · brüt başarılı ödemeler (₺)")} />
          {ov.monthly.every((mo) => mo.value === 0) ? <EmptyState compact title={t("Henüz veri bulunmuyor")} description={t("Son 12 ayda başarılı ödeme yok.")} /> : <MoneyBars data={ov.monthly} height={230} />}
        </Card>
        <Card>
          <CardHeader title={t("Gelir Kaynakları")} hint={t("{range} · işlem türüne göre", { range: t(RANGE_LABELS[range]) })} />
          {donut.length === 0 ? <EmptyState compact title={t("Henüz veri bulunmuyor")} /> : <Donut data={donut} height={150} centerValue={formatMoney(ov.gross, "TRY", { decimals: false })} centerLabel={t("brüt")} />}
          <p className="mt-3 text-[11px] leading-relaxed text-muted">{t("Vergi, işlem komisyonu ve creator payları platform ayarlarındaki kurallara göre ayrıştırılır.")}</p>
        </Card>
      </div>

      <Card>
        <TabLinks label={t("Finans bölümleri")} active={tab} tabs={FINANCE_TABS.map((tb) => ({ key: tb, label: t(TAB_LABELS[tb]), href: href("/admin/finance", { tab: tb === "transactions" ? null : tb, ...keep }) }))} className="mb-4" />
        {tab === "transactions" && <TransactionsTab sp={sp} canRefund={canRefund} keep={keep} />}
        {tab === "payouts" && <PayoutsTab sp={sp} canPayout={canPayout} keep={keep} />}
        {tab === "accounts" && <AccountsTab canPayout={canPayout} />}
        {tab === "reconciliation" && <ReconciliationTab />}
      </Card>
    </AdminPage>
  );
}

async function TransactionsTab({ sp, canRefund, keep }: { sp: SearchParams; canRefund: boolean; keep: { range: string | null } }) {
  const t = await getT();
  const { formatDateTime, formatMoney } = await getFormatters();
  const kind = pickEnum(sp, "kind", TX_KINDS, "all");
  const status = pickEnum(sp, "status", TX_STATUSES, "all");
  const q = pick(sp, "q");
  const providerRaw = pick(sp, "provider");
  const page = pickPage(sp);
  const list = await listTransactions({ kind, status, provider: providerRaw || "all", q, page });
  const provider = list.providers.includes(providerRaw) ? providerRaw : "all";
  const hrefFor = (extra: Record<string, string | number | null>) => href("/admin/finance", { ...keep, kind: kind === "all" ? null : kind, status: status === "all" ? null : status, provider: provider === "all" ? null : provider, q: q || null, ...extra });
  return (
    <>
      <FilterForm
        action="/admin/finance"
        q={q}
        placeholder={t("İşlem kimliği (24 hane) veya ürün adı ara")}
        hidden={{ range: keep.range }}
        selects={[
          { name: "kind", label: t("İşlem türü"), value: kind, options: [{ value: "all", label: t("Tüm türler") }, ...TX_KINDS.filter((k) => k !== "all").map((k) => ({ value: k, label: TX_KIND_LABELS[k] ? t(TX_KIND_LABELS[k]!) : k }))] },
          { name: "status", label: t("Durum"), value: status, options: [{ value: "all", label: t("Tüm durumlar") }, ...TX_STATUSES.filter((s) => s !== "all").map((s) => ({ value: s, label: TX_STATUS_LABELS[s] ? t(TX_STATUS_LABELS[s]!) : s }))] },
          { name: "provider", label: t("Sağlayıcı"), value: provider, options: [{ value: "all", label: t("Tüm sağlayıcılar") }, ...list.providers.map((p) => ({ value: p, label: p }))] },
        ]}
        clearHref={href("/admin/finance", keep)}
      />
      {list.items.length === 0 ? (
        <EmptyState compact title={t("İşlem bulunamadı")} description={t("Filtreleri değiştirmeyi deneyin.")} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{t("İşlem no")}</Th>
              <Th>{t("Tür / Ürün")}</Th>
              <Th>{t("Kullanıcı")}</Th>
              <Th className="text-end">{t("Tutar")}</Th>
              <Th>{t("Durum")}</Th>
              <Th>{t("Tarih")}</Th>
              <Th className="text-end">{t("İşlem")}</Th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((tx) => {
              const refundable = tx.amountMinor - tx.refundedMinor;
              const canDo = canRefund && (tx.status === "succeeded" || tx.status === "partially_refunded") && refundable > 0;
              return (
                <tr key={tx.id}>
                  <Td>
                    <b className="block text-ink">{tx.ref}</b>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <StatusPill size="sm" tone="gray">
                        {tx.provider}
                      </StatusPill>
                      {tx.isTest && (
                        <StatusPill size="sm" tone="warn">
                          {t("TEST")}
                        </StatusPill>
                      )}
                      {tx.isDemo && (
                        <StatusPill size="sm" tone="violet">
                          {t("DEMO")}
                        </StatusPill>
                      )}
                    </span>
                  </Td>
                  <Td>
                    <b className="block text-ink">{TX_KIND_LABELS[tx.kind] ? t(TX_KIND_LABELS[tx.kind]!) : tx.kind}</b>
                    <span className="block max-w-[220px] truncate text-[10px] text-muted">{tx.label}</span>
                  </Td>
                  <Td>{tx.user}</Td>
                  <Td className="text-end tabular-nums">
                    <b className="text-ink">{formatMoney(tx.amountMinor, tx.currency)}</b>
                    {tx.refundedMinor > 0 && <span className="block text-[10px] text-violet">{t("iade: {amount}", { amount: formatMoney(tx.refundedMinor, tx.currency) })}</span>}
                  </Td>
                  <Td>
                    <StatusPill tone={TX_STATUS_TONES[tx.status] ?? "gray"}>{TX_STATUS_LABELS[tx.status] ? t(TX_STATUS_LABELS[tx.status]!) : tx.status}</StatusPill>
                  </Td>
                  <Td className="whitespace-nowrap">{formatDateTime(tx.createdAt)}</Td>
                  <Td className="text-end">
                    {canDo ? (
                      <ActionDialog
                        trigger={
                          <Button size="xs" variant="secondary" aria-label={t("{ref} işlemini iade et", { ref: tx.ref })}>
                            {t("İade")}
                          </Button>
                        }
                        title={t("İade — {ref}", { ref: tx.ref })}
                        description={t("{label} · ödenen {paid}. En fazla {max} iade edilebilir.", { label: tx.label, paid: formatMoney(tx.amountMinor, tx.currency), max: formatMoney(refundable, tx.currency) })}
                        action={refundTransactionAction}
                        payload={{ transactionId: tx.id }}
                        fields={[{ name: "amountTl", label: t("İade tutarı (₺)"), type: "number", defaultValue: refundable / 100, min: 0.01, max: refundable / 100, step: 0.01, required: true, hint: t("Kısmi iade için tutarı düşürebilirsiniz.") }]}
                        reason={{ label: t("İade gerekçesi") }}
                        confirmLabel={t("İadeyi uygula")}
                        tone="danger"
                        warning={tx.isTest ? t("Bu bir test işlemidir; yine de defter ters kayıtları oluşturulur.") : t("İade, sağlayıcıda para iadesi başlatır; kredi alımında harcanmamış krediler geri alınır ve creator hak edişi orantılı olarak ters kaydedilir.")}
                      />
                    ) : (
                      <span className="text-[10px] text-muted">—</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}
      <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} noun={t("işlem")} />
      <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p })} className="mt-4" />
    </>
  );
}

async function PayoutsTab({ sp, canPayout, keep }: { sp: SearchParams; canPayout: boolean; keep: { range: string | null } }) {
  const t = await getT();
  const { formatDateTime, formatMoney, formatNumber } = await getFormatters();
  const filter = pickEnum(sp, "payouts", PAYOUT_FILTERS, "active");
  const page = pickPage(sp);
  const list = await listPayouts({ filter, page });
  const FILTER_LABELS = { active: t("Bekleyen"), all: t("Tümü"), paid: t("Ödenen"), rejected: t("Reddedilen / Başarısız") } as const;
  const hrefFor = (extra: Record<string, string | number | null>) => href("/admin/finance", { tab: "payouts", ...keep, payouts: filter === "active" ? null : filter, ...extra });
  return (
    <>
      <TabLinks label={t("Ödeme talebi filtresi")} active={filter} tabs={PAYOUT_FILTERS.map((f) => ({ key: f, label: FILTER_LABELS[f], href: href("/admin/finance", { tab: "payouts", ...keep, payouts: f === "active" ? null : f }) }))} className="mb-4" />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-soft px-4 py-3">
          <p className="text-[10px] font-bold text-muted">{t("Bekleyen talep")}</p>
          <p className="mt-0.5 text-lg font-black">{formatNumber(list.summary.queued)}</p>
        </div>
        <div className="rounded-xl bg-soft px-4 py-3">
          <p className="text-[10px] font-bold text-muted">{t("Bekleyen tutar")}</p>
          <p className="mt-0.5 text-lg font-black">{formatMoney(list.summary.queuedMinor)}</p>
        </div>
        <div className="rounded-xl bg-soft px-4 py-3">
          <p className="text-[10px] font-bold text-muted">{t("Ödenen toplam")}</p>
          <p className="mt-0.5 text-lg font-black">{formatMoney(list.summary.paidMinor)}</p>
        </div>
      </div>
      {list.items.length === 0 ? (
        <EmptyState compact title={t("Ödeme talebi yok")} description={t("Creator'lar ödeme talebi oluşturduğunda burada görünür. Talepler platform ayarlarında 'ödemeler' açık olduğunda alınır.")} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{t("Creator")}</Th>
              <Th className="text-end">{t("Tutar")}</Th>
              <Th>{t("Ödeme hesabı")}</Th>
              <Th>{t("Durum")}</Th>
              <Th>{t("Talep tarihi")}</Th>
              <Th className="text-end">{t("İşlem")}</Th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((p) => (
              <tr key={p.id}>
                <Td>
                  <b className="text-ink">{p.creator}</b>
                  {p.providerRef && <span className="block text-[10px] text-muted">{t("Ref: {ref}", { ref: p.providerRef })}</span>}
                </Td>
                <Td className="text-end tabular-nums">
                  <b>{formatMoney(p.amountMinor, p.currency)}</b>
                </Td>
                <Td>
                  {p.account ? (
                    <>
                      <span className="block text-ink-soft">{p.account.masked}</span>
                      <StatusPill size="sm" tone={PAYOUT_ACCOUNT_TONES[p.account.status] ?? "gray"}>
                        {PAYOUT_ACCOUNT_LABELS[p.account.status] ? t(PAYOUT_ACCOUNT_LABELS[p.account.status]!) : p.account.status}
                      </StatusPill>
                    </>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>
                  <StatusPill tone={PAYOUT_STATUS_TONES[p.status] ?? "gray"}>{PAYOUT_STATUS_LABELS[p.status] ? t(PAYOUT_STATUS_LABELS[p.status]!) : p.status}</StatusPill>
                </Td>
                <Td className="whitespace-nowrap">{formatDateTime(p.createdAt)}</Td>
                <Td className="text-end">
                  {canPayout ? <PayoutActions id={p.id} status={p.status} amount={formatMoney(p.amountMinor, p.currency)} creator={p.creator} /> : <span className="text-[10px] text-muted">—</span>}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} noun={t("talep")} />
      <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p })} className="mt-4" />
    </>
  );
}

async function PayoutActions({ id, status, amount, creator }: { id: string; status: string; amount: string; creator: string }) {
  const t = await getT();
  const desc = `${creator} · ${amount}`;
  const reject = (
    <ActionDialog
      trigger={
        <Button size="xs" variant="danger-soft">
          {t("Reddet")}
        </Button>
      }
      title={t("Ödeme talebini reddet")}
      description={t("{desc}. Gerekçe creator'a bildirilir.", { desc })}
      action={updatePayoutAction}
      payload={{ payoutId: id, to: "rejected" }}
      reason={{ label: t("Ret gerekçesi") }}
      confirmLabel={t("Reddet")}
      tone="danger"
    />
  );
  if (status === "requested")
    return (
      <div className="flex justify-end gap-1.5">
        <ActionDialog trigger={<Button size="xs">{t("Onayla")}</Button>} title={t("Ödeme talebini onayla")} description={desc} action={updatePayoutAction} payload={{ payoutId: id, to: "approved" }} reason={{ label: t("Onay notu"), defaultValue: t("Hesap ve bakiye kontrol edildi.") }} confirmLabel={t("Onayla")} />
        {reject}
      </div>
    );
  if (status === "approved")
    return (
      <div className="flex justify-end gap-1.5">
        <ActionDialog trigger={<Button size="xs">{t("İşleme Al")}</Button>} title={t("Ödemeyi işleme al")} description={t("{desc}. Banka transferi başlatıldığında kullanın.", { desc })} action={updatePayoutAction} payload={{ payoutId: id, to: "processing" }} reason={{ label: t("İşlem notu"), defaultValue: t("Banka transferi başlatıldı.") }} confirmLabel={t("İşleme al")} />
        {reject}
      </div>
    );
  if (status === "processing")
    return (
      <div className="flex justify-end gap-1.5">
        <ActionDialog
          trigger={<Button size="xs">{t("Ödendi")}</Button>}
          title={t("Ödendi olarak işaretle")}
          description={t("{desc}. Yalnız banka/sağlayıcı referansıyla işaretlenebilir.", { desc })}
          action={updatePayoutAction}
          payload={{ payoutId: id, to: "paid" }}
          fields={[{ name: "providerRef", label: t("Banka / sağlayıcı referansı"), required: true, maxLength: 120, placeholder: t("ör. EFT-2026-000123") }]}
          reason={{ label: t("Ödeme notu"), defaultValue: t("Transfer tamamlandı.") }}
          confirmLabel={t("Ödendi")}
        />
        <ActionDialog
          trigger={
            <Button size="xs" variant="danger-soft">
              {t("Başarısız")}
            </Button>
          }
          title={t("Ödeme başarısız")}
          description={t("{desc}. Hata nedenini yazın.", { desc })}
          action={updatePayoutAction}
          payload={{ payoutId: id, to: "failed" }}
          reason={{ label: t("Hata nedeni") }}
          confirmLabel={t("Başarısız işaretle")}
          tone="danger"
        />
      </div>
    );
  return <span className="text-[10px] text-muted">—</span>;
}

async function AccountsTab({ canPayout }: { canPayout: boolean }) {
  const t = await getT();
  const { formatDateTime, formatNumber } = await getFormatters();
  const { items, verifiedCount } = await listPayoutAccountsForReview();
  return (
    <>
      <p className="mb-4 text-xs text-muted">
        {t("Doğrulanmış ödeme hesabı:")} <b className="text-ink">{formatNumber(verifiedCount)}</b>{t(". IBAN yalnız maskeli gösterilir; tam numara şifreli saklanır ve bu ekranda açılamaz.")}
      </p>
      {items.length === 0 ? (
        <EmptyState compact title={t("İncelenecek hesap yok")} description={t("Doğrulama bekleyen veya reddedilen ödeme hesabı bulunmuyor.")} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>{t("Creator")}</Th>
              <Th>{t("Hesap sahibi")}</Th>
              <Th>{t("IBAN")}</Th>
              <Th>{t("Durum")}</Th>
              <Th>{t("Eklenme")}</Th>
              <Th className="text-end">{t("İşlem")}</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <Td>
                  <b className="text-ink">{a.creator}</b>
                </Td>
                <Td>{a.holder}</Td>
                <Td>
                  {a.masked}
                  {a.bank && <span className="block text-[10px] text-muted">{a.bank}</span>}
                </Td>
                <Td>
                  <StatusPill tone={PAYOUT_ACCOUNT_TONES[a.status] ?? "gray"}>{PAYOUT_ACCOUNT_LABELS[a.status] ? t(PAYOUT_ACCOUNT_LABELS[a.status]!) : a.status}</StatusPill>
                </Td>
                <Td className="whitespace-nowrap">{formatDateTime(a.createdAt)}</Td>
                <Td className="text-end">
                  {canPayout ? (
                    <div className="flex justify-end gap-1.5">
                      <ActionDialog trigger={<Button size="xs">{t("Doğrula")}</Button>} title={t("Ödeme hesabını doğrula")} description={t("{creator} · {masked}. Hesap sahibinin kimliğiyle eşleştiğini kontrol ettiniz mi?", { creator: a.creator, masked: a.masked })} action={verifyPayoutAccountAction} payload={{ accountId: a.id, status: "verified" }} reason={{ label: t("Doğrulama notu"), defaultValue: t("Hesap sahibi adı, doğrulanmış creator kimliğiyle eşleşti.") }} confirmLabel={t("Doğrula")} />
                      {a.status !== "rejected" && (
                        <ActionDialog
                          trigger={
                            <Button size="xs" variant="danger-soft">
                              {t("Reddet")}
                            </Button>
                          }
                          title={t("Ödeme hesabını reddet")}
                          description={t("{creator} · {masked}", { creator: a.creator, masked: a.masked })}
                          action={verifyPayoutAccountAction}
                          payload={{ accountId: a.id, status: "rejected" }}
                          reason={{ label: t("Ret gerekçesi") }}
                          confirmLabel={t("Reddet")}
                          tone="danger"
                        />
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted">—</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}

async function ReconciliationTab() {
  const t = await getT();
  const { formatMoney, formatNumber, formatPercent } = await getFormatters();
  const r = await getReconciliation();
  const diffOk = r.refundConsistency.diffMinor === 0;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">{t("Defter tutarlılığı")}</p>
        <DetailRow label={t("Creator ödemeleri ↔ hak ediş kaydı")}>
          {r.earningCoverage.pct === null ? t("Örnek yok") : `${r.earningCoverage.matched}/${r.earningCoverage.total} (${formatPercent(r.earningCoverage.pct * 100)})`}
        </DetailRow>
        <DetailRow label={t("İade tutarı: işlem ↔ iade kayıtları")}>
          <StatusPill size="sm" tone={diffOk ? "green" : "danger"}>
            {diffOk ? t("Tutarlı") : t("Fark {amount}", { amount: formatMoney(r.refundConsistency.diffMinor) })}
          </StatusPill>
        </DetailRow>
        <DetailRow label={t("Toplam iade (işlemlerde)")}>{formatMoney(r.refundConsistency.txRefundedMinor)}</DetailRow>
        <DetailRow label={t("Toplam iade (iade defterinde)")}>{formatMoney(r.refundConsistency.refundLedgerMinor)}</DetailRow>
        <DetailRow label={t("Bekleyen iade kaydı")}>{formatNumber(r.openRefunds)}</DetailRow>
        <DetailRow label={t("Bekleyen creator ödemesi")}>{formatNumber(r.unpaidPayouts)}</DetailRow>
        <DetailRow label={t("Test sağlayıcı işlemleri")}>{formatNumber(r.testTx)}</DetailRow>
        <DetailRow label={t("Demo (tohum) işlemleri")}>{formatNumber(r.demoTx)}</DetailRow>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">{t("Geçerli finans kuralları")}</p>
        <DetailRow label={t("Creator payı (net üzerinden)")}>{formatPercent(r.rules.creatorShareBps)}</DetailRow>
        <DetailRow label={t("Ödeme kuruluşu komisyonu")}>
          {formatPercent(r.rules.processingFeeBps)} + {formatMoney(r.rules.processingFeeFixedMinor)}
        </DetailRow>
        <DetailRow label={t("KDV (fiyatlara dahil)")}>{formatPercent(r.rules.vatBps)}</DetailRow>
        <DetailRow label={t("Hak ediş bekleme süresi")}>{t("{count} gün", { count: r.rules.holdDays })}</DetailRow>
        <DetailRow label={t("Asgari ödeme")}>{formatMoney(r.rules.minPayoutMinor)}</DetailRow>
        <DetailRow label={t("Creator ödemeleri")}>
          <StatusPill size="sm" tone={r.rules.payoutsEnabled ? "green" : "warn"}>
            {r.rules.payoutsEnabled ? t("Açık") : t("Kapalı")}
          </StatusPill>
        </DetailRow>
        <Notice tone="neutral" className="mt-4">
          {t.rich("Mutabakat notu: bu kontroller veritabanı defterleri arasındaki iç tutarlılığı gösterir; banka/sağlayıcı ekstresi ile dış mutabakat sağlayıcı entegrasyonu tamamlandığında yapılır. Kurallar <link>Platform Ayarları</link>'ndan yönetilir.", {
            link: (c) => (
              <Link href="/admin/settings" className="font-extrabold text-brand-500 hover:underline">
                {c}
              </Link>
            ),
          })}
        </Notice>
      </div>
    </div>
  );
}
