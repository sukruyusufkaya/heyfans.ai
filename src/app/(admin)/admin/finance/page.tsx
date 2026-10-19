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
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { formatDateTime, formatMoney, formatNumber, formatPercent } from "@/lib/utils";
import { getFinanceOverview, getReconciliation, listPayoutAccountsForReview, listPayouts, listTransactions, PAYOUT_FILTERS, RANGES, TX_KINDS, TX_STATUSES, type RangeKey } from "@/services/admin/finance";
import { pick, pickEnum, pickPage, type SearchParams } from "@/services/admin/shared";

export const metadata: Metadata = { title: "Finans ve İşlemler" };

const FINANCE_TABS = ["transactions", "payouts", "accounts", "reconciliation"] as const;
const TAB_LABELS = { transactions: "İşlemler", payouts: "Ödeme Talepleri", accounts: "Ödeme Hesapları", reconciliation: "Mutabakat" } as const;
const RANGE_LABELS: Record<RangeKey, string> = { "30": "Son 30 gün", "90": "Son 90 gün", "365": "Son 12 ay" };

export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireAdmin("finance.read");
  const sp = await searchParams;
  const tab = pickEnum(sp, "tab", FINANCE_TABS, "transactions");
  const range = pickEnum(sp, "range", ["30", "90", "365"] as const, "30");
  const canRefund = can(user, "finance.refund");
  const canPayout = can(user, "payouts.manage");
  const [ov] = await Promise.all([getFinanceOverview(RANGES[range])]);
  const donut = ov.byKind.map((k) => ({ name: TX_KIND_LABELS[k.kind] ?? k.kind, value: k.value }));
  const keep = { range: range === "30" ? null : range };

  return (
    <AdminPage
      title="Finans ve İşlemler"
      description="Abonelik, kredi, creator hakediş, iade ve finans mutabakatını izleyin."
      actions={
        <>
          <TabLinks label="Dönem" active={range} tabs={(["30", "90", "365"] as const).map((r) => ({ key: r, label: RANGE_LABELS[r], href: href("/admin/finance", { tab: tab === "transactions" ? null : tab, range: r === "30" ? null : r }) }))} className="mb-0" />
        </>
      }
    >
      <KpiGrid>
        <StatCard label={`Brüt İşlem Hacmi · ${RANGE_LABELS[range]}`} value={formatMoney(ov.gross, "TRY", { decimals: false })} icon={<Receipt />} tone="pink" delta={ov.grossDelta} foot={ov.grossDelta ? "önceki döneme göre" : `${formatNumber(ov.grossCount)} işlem`} />
        <StatCard label="Platform Payı" value={formatMoney(ov.platformFee, "TRY", { decimals: false })} icon={<Landmark />} tone="violet" delta={ov.platformDelta} foot={ov.platformDelta ? "hak ediş defterinden" : "hak ediş defterinden"} />
        <StatCard label="Creator Hakedişi" value={formatMoney(ov.creatorShare, "TRY", { decimals: false })} icon={<Coins />} tone="teal" delta={ov.creatorDelta} foot={ov.creatorDelta ? "önceki döneme göre" : "hak ediş defterinden"} />
        <StatCard label="İade ve İtiraz" value={formatMoney(ov.refunds, "TRY", { decimals: false })} icon={<Undo2 />} tone="orange" delta={ov.refundDelta && { ...ov.refundDelta, direction: ov.refundDelta.direction === "up" ? "down" : ov.refundDelta.direction === "down" ? "up" : "flat" }} foot={`${formatNumber(ov.refundCount)} iade`} />
      </KpiGrid>
      {ov.testCount > 0 && (
        <Notice tone="warn" className="-mt-2">
          Bu dönemdeki {formatNumber(ov.testCount)} işlem test/demo sağlayıcıdan gelir; gerçek para hareketi içermez. Komisyon ve ödeme kuralları ayrıca belirlenmelidir.
        </Notice>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Gelir Akışı" hint="Son 12 ay · brüt başarılı ödemeler (₺)" />
          {ov.monthly.every((m) => m.value === 0) ? <EmptyState compact title="Henüz veri bulunmuyor" description="Son 12 ayda başarılı ödeme yok." /> : <MoneyBars data={ov.monthly} height={230} />}
        </Card>
        <Card>
          <CardHeader title="Gelir Kaynakları" hint={`${RANGE_LABELS[range]} · işlem türüne göre`} />
          {donut.length === 0 ? <EmptyState compact title="Henüz veri bulunmuyor" /> : <Donut data={donut} height={150} centerValue={formatMoney(ov.gross, "TRY", { decimals: false })} centerLabel="brüt" />}
          <p className="mt-3 text-[11px] leading-relaxed text-muted">Vergi, işlem komisyonu ve creator payları platform ayarlarındaki kurallara göre ayrıştırılır.</p>
        </Card>
      </div>

      <Card>
        <TabLinks label="Finans bölümleri" active={tab} tabs={FINANCE_TABS.map((t) => ({ key: t, label: TAB_LABELS[t], href: href("/admin/finance", { tab: t === "transactions" ? null : t, ...keep }) }))} className="mb-4" />
        {tab === "transactions" && <TransactionsTab sp={sp} canRefund={canRefund} keep={keep} />}
        {tab === "payouts" && <PayoutsTab sp={sp} canPayout={canPayout} keep={keep} />}
        {tab === "accounts" && <AccountsTab canPayout={canPayout} />}
        {tab === "reconciliation" && <ReconciliationTab />}
      </Card>
    </AdminPage>
  );
}

async function TransactionsTab({ sp, canRefund, keep }: { sp: SearchParams; canRefund: boolean; keep: { range: string | null } }) {
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
        placeholder="İşlem kimliği (24 hane) veya ürün adı ara"
        hidden={{ range: keep.range }}
        selects={[
          { name: "kind", label: "İşlem türü", value: kind, options: [{ value: "all", label: "Tüm türler" }, ...TX_KINDS.filter((k) => k !== "all").map((k) => ({ value: k, label: TX_KIND_LABELS[k] ?? k }))] },
          { name: "status", label: "Durum", value: status, options: [{ value: "all", label: "Tüm durumlar" }, ...TX_STATUSES.filter((s) => s !== "all").map((s) => ({ value: s, label: TX_STATUS_LABELS[s] ?? s }))] },
          { name: "provider", label: "Sağlayıcı", value: provider, options: [{ value: "all", label: "Tüm sağlayıcılar" }, ...list.providers.map((p) => ({ value: p, label: p }))] },
        ]}
        clearHref={href("/admin/finance", keep)}
      />
      {list.items.length === 0 ? (
        <EmptyState compact title="İşlem bulunamadı" description="Filtreleri değiştirmeyi deneyin." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>İşlem no</Th>
              <Th>Tür / Ürün</Th>
              <Th>Kullanıcı</Th>
              <Th className="text-right">Tutar</Th>
              <Th>Durum</Th>
              <Th>Tarih</Th>
              <Th className="text-right">İşlem</Th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((t) => {
              const refundable = t.amountMinor - t.refundedMinor;
              const canDo = canRefund && (t.status === "succeeded" || t.status === "partially_refunded") && refundable > 0;
              return (
                <tr key={t.id}>
                  <Td>
                    <b className="block text-ink">{t.ref}</b>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <StatusPill size="sm" tone="gray">
                        {t.provider}
                      </StatusPill>
                      {t.isTest && (
                        <StatusPill size="sm" tone="warn">
                          TEST
                        </StatusPill>
                      )}
                      {t.isDemo && (
                        <StatusPill size="sm" tone="violet">
                          DEMO
                        </StatusPill>
                      )}
                    </span>
                  </Td>
                  <Td>
                    <b className="block text-ink">{TX_KIND_LABELS[t.kind] ?? t.kind}</b>
                    <span className="block max-w-[220px] truncate text-[10px] text-muted">{t.label}</span>
                  </Td>
                  <Td>{t.user}</Td>
                  <Td className="text-right tabular-nums">
                    <b className="text-ink">{formatMoney(t.amountMinor, t.currency)}</b>
                    {t.refundedMinor > 0 && <span className="block text-[10px] text-violet">iade: {formatMoney(t.refundedMinor, t.currency)}</span>}
                  </Td>
                  <Td>
                    <StatusPill tone={TX_STATUS_TONES[t.status] ?? "gray"}>{TX_STATUS_LABELS[t.status] ?? t.status}</StatusPill>
                  </Td>
                  <Td className="whitespace-nowrap">{formatDateTime(t.createdAt)}</Td>
                  <Td className="text-right">
                    {canDo ? (
                      <ActionDialog
                        trigger={
                          <Button size="xs" variant="secondary" aria-label={`${t.ref} işlemini iade et`}>
                            İade
                          </Button>
                        }
                        title={`İade — ${t.ref}`}
                        description={`${t.label} · ödenen ${formatMoney(t.amountMinor, t.currency)}. En fazla ${formatMoney(refundable, t.currency)} iade edilebilir.`}
                        action={refundTransactionAction}
                        payload={{ transactionId: t.id }}
                        fields={[{ name: "amountTl", label: "İade tutarı (₺)", type: "number", defaultValue: refundable / 100, min: 0.01, max: refundable / 100, step: 0.01, required: true, hint: "Kısmi iade için tutarı düşürebilirsiniz." }]}
                        reason={{ label: "İade gerekçesi" }}
                        confirmLabel="İadeyi uygula"
                        tone="danger"
                        warning={t.isTest ? "Bu bir test işlemidir; yine de defter ters kayıtları oluşturulur." : "İade, sağlayıcıda para iadesi başlatır; kredi alımında harcanmamış krediler geri alınır ve creator hak edişi orantılı olarak ters kaydedilir."}
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
      <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} noun="işlem" />
      <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p })} className="mt-4" />
    </>
  );
}

async function PayoutsTab({ sp, canPayout, keep }: { sp: SearchParams; canPayout: boolean; keep: { range: string | null } }) {
  const filter = pickEnum(sp, "payouts", PAYOUT_FILTERS, "active");
  const page = pickPage(sp);
  const list = await listPayouts({ filter, page });
  const FILTER_LABELS = { active: "Bekleyen", all: "Tümü", paid: "Ödenen", rejected: "Reddedilen / Başarısız" } as const;
  const hrefFor = (extra: Record<string, string | number | null>) => href("/admin/finance", { tab: "payouts", ...keep, payouts: filter === "active" ? null : filter, ...extra });
  return (
    <>
      <TabLinks label="Ödeme talebi filtresi" active={filter} tabs={PAYOUT_FILTERS.map((f) => ({ key: f, label: FILTER_LABELS[f], href: href("/admin/finance", { tab: "payouts", ...keep, payouts: f === "active" ? null : f }) }))} className="mb-4" />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-soft px-4 py-3">
          <p className="text-[10px] font-bold text-muted">Bekleyen talep</p>
          <p className="mt-0.5 text-lg font-black">{formatNumber(list.summary.queued)}</p>
        </div>
        <div className="rounded-xl bg-soft px-4 py-3">
          <p className="text-[10px] font-bold text-muted">Bekleyen tutar</p>
          <p className="mt-0.5 text-lg font-black">{formatMoney(list.summary.queuedMinor)}</p>
        </div>
        <div className="rounded-xl bg-soft px-4 py-3">
          <p className="text-[10px] font-bold text-muted">Ödenen toplam</p>
          <p className="mt-0.5 text-lg font-black">{formatMoney(list.summary.paidMinor)}</p>
        </div>
      </div>
      {list.items.length === 0 ? (
        <EmptyState compact title="Ödeme talebi yok" description="Creator'lar ödeme talebi oluşturduğunda burada görünür. Talepler platform ayarlarında 'ödemeler' açık olduğunda alınır." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Creator</Th>
              <Th className="text-right">Tutar</Th>
              <Th>Ödeme hesabı</Th>
              <Th>Durum</Th>
              <Th>Talep tarihi</Th>
              <Th className="text-right">İşlem</Th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((p) => (
              <tr key={p.id}>
                <Td>
                  <b className="text-ink">{p.creator}</b>
                  {p.providerRef && <span className="block text-[10px] text-muted">Ref: {p.providerRef}</span>}
                </Td>
                <Td className="text-right tabular-nums">
                  <b>{formatMoney(p.amountMinor, p.currency)}</b>
                </Td>
                <Td>
                  {p.account ? (
                    <>
                      <span className="block text-ink-soft">{p.account.masked}</span>
                      <StatusPill size="sm" tone={PAYOUT_ACCOUNT_TONES[p.account.status] ?? "gray"}>
                        {PAYOUT_ACCOUNT_LABELS[p.account.status] ?? p.account.status}
                      </StatusPill>
                    </>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>
                  <StatusPill tone={PAYOUT_STATUS_TONES[p.status] ?? "gray"}>{PAYOUT_STATUS_LABELS[p.status] ?? p.status}</StatusPill>
                </Td>
                <Td className="whitespace-nowrap">{formatDateTime(p.createdAt)}</Td>
                <Td className="text-right">
                  {canPayout ? <PayoutActions id={p.id} status={p.status} amount={formatMoney(p.amountMinor, p.currency)} creator={p.creator} /> : <span className="text-[10px] text-muted">—</span>}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      <ResultCount page={list.page} pageSize={list.pageSize} total={list.total} noun="talep" />
      <Pagination page={list.page} pageCount={list.pageCount} hrefFor={(p) => hrefFor({ page: p })} className="mt-4" />
    </>
  );
}

function PayoutActions({ id, status, amount, creator }: { id: string; status: string; amount: string; creator: string }) {
  const desc = `${creator} · ${amount}`;
  const reject = (
    <ActionDialog
      trigger={
        <Button size="xs" variant="danger-soft">
          Reddet
        </Button>
      }
      title="Ödeme talebini reddet"
      description={`${desc}. Gerekçe creator'a bildirilir.`}
      action={updatePayoutAction}
      payload={{ payoutId: id, to: "rejected" }}
      reason={{ label: "Ret gerekçesi" }}
      confirmLabel="Reddet"
      tone="danger"
    />
  );
  if (status === "requested")
    return (
      <div className="flex justify-end gap-1.5">
        <ActionDialog trigger={<Button size="xs">Onayla</Button>} title="Ödeme talebini onayla" description={desc} action={updatePayoutAction} payload={{ payoutId: id, to: "approved" }} reason={{ label: "Onay notu", defaultValue: "Hesap ve bakiye kontrol edildi." }} confirmLabel="Onayla" />
        {reject}
      </div>
    );
  if (status === "approved")
    return (
      <div className="flex justify-end gap-1.5">
        <ActionDialog trigger={<Button size="xs">İşleme Al</Button>} title="Ödemeyi işleme al" description={`${desc}. Banka transferi başlatıldığında kullanın.`} action={updatePayoutAction} payload={{ payoutId: id, to: "processing" }} reason={{ label: "İşlem notu", defaultValue: "Banka transferi başlatıldı." }} confirmLabel="İşleme al" />
        {reject}
      </div>
    );
  if (status === "processing")
    return (
      <div className="flex justify-end gap-1.5">
        <ActionDialog
          trigger={<Button size="xs">Ödendi</Button>}
          title="Ödendi olarak işaretle"
          description={`${desc}. Yalnız banka/sağlayıcı referansıyla işaretlenebilir.`}
          action={updatePayoutAction}
          payload={{ payoutId: id, to: "paid" }}
          fields={[{ name: "providerRef", label: "Banka / sağlayıcı referansı", required: true, maxLength: 120, placeholder: "ör. EFT-2026-000123" }]}
          reason={{ label: "Ödeme notu", defaultValue: "Transfer tamamlandı." }}
          confirmLabel="Ödendi"
        />
        <ActionDialog
          trigger={
            <Button size="xs" variant="danger-soft">
              Başarısız
            </Button>
          }
          title="Ödeme başarısız"
          description={`${desc}. Hata nedenini yazın.`}
          action={updatePayoutAction}
          payload={{ payoutId: id, to: "failed" }}
          reason={{ label: "Hata nedeni" }}
          confirmLabel="Başarısız işaretle"
          tone="danger"
        />
      </div>
    );
  return <span className="text-[10px] text-muted">—</span>;
}

async function AccountsTab({ canPayout }: { canPayout: boolean }) {
  const { items, verifiedCount } = await listPayoutAccountsForReview();
  return (
    <>
      <p className="mb-4 text-xs text-muted">
        Doğrulanmış ödeme hesabı: <b className="text-ink">{formatNumber(verifiedCount)}</b>. IBAN yalnız maskeli gösterilir; tam numara şifreli saklanır ve bu ekranda açılamaz.
      </p>
      {items.length === 0 ? (
        <EmptyState compact title="İncelenecek hesap yok" description="Doğrulama bekleyen veya reddedilen ödeme hesabı bulunmuyor." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Creator</Th>
              <Th>Hesap sahibi</Th>
              <Th>IBAN</Th>
              <Th>Durum</Th>
              <Th>Eklenme</Th>
              <Th className="text-right">İşlem</Th>
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
                  <StatusPill tone={PAYOUT_ACCOUNT_TONES[a.status] ?? "gray"}>{PAYOUT_ACCOUNT_LABELS[a.status] ?? a.status}</StatusPill>
                </Td>
                <Td className="whitespace-nowrap">{formatDateTime(a.createdAt)}</Td>
                <Td className="text-right">
                  {canPayout ? (
                    <div className="flex justify-end gap-1.5">
                      <ActionDialog trigger={<Button size="xs">Doğrula</Button>} title="Ödeme hesabını doğrula" description={`${a.creator} · ${a.masked}. Hesap sahibinin kimliğiyle eşleştiğini kontrol ettiniz mi?`} action={verifyPayoutAccountAction} payload={{ accountId: a.id, status: "verified" }} reason={{ label: "Doğrulama notu", defaultValue: "Hesap sahibi adı, doğrulanmış creator kimliğiyle eşleşti." }} confirmLabel="Doğrula" />
                      {a.status !== "rejected" && (
                        <ActionDialog
                          trigger={
                            <Button size="xs" variant="danger-soft">
                              Reddet
                            </Button>
                          }
                          title="Ödeme hesabını reddet"
                          description={`${a.creator} · ${a.masked}`}
                          action={verifyPayoutAccountAction}
                          payload={{ accountId: a.id, status: "rejected" }}
                          reason={{ label: "Ret gerekçesi" }}
                          confirmLabel="Reddet"
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
  const r = await getReconciliation();
  const diffOk = r.refundConsistency.diffMinor === 0;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">Defter tutarlılığı</p>
        <DetailRow label="Creator ödemeleri ↔ hak ediş kaydı">
          {r.earningCoverage.pct === null ? "Örnek yok" : `${r.earningCoverage.matched}/${r.earningCoverage.total} (%${r.earningCoverage.pct})`}
        </DetailRow>
        <DetailRow label="İade tutarı: işlem ↔ iade kayıtları">
          <StatusPill size="sm" tone={diffOk ? "green" : "danger"}>
            {diffOk ? "Tutarlı" : `Fark ${formatMoney(r.refundConsistency.diffMinor)}`}
          </StatusPill>
        </DetailRow>
        <DetailRow label="Toplam iade (işlemlerde)">{formatMoney(r.refundConsistency.txRefundedMinor)}</DetailRow>
        <DetailRow label="Toplam iade (iade defterinde)">{formatMoney(r.refundConsistency.refundLedgerMinor)}</DetailRow>
        <DetailRow label="Bekleyen iade kaydı">{formatNumber(r.openRefunds)}</DetailRow>
        <DetailRow label="Bekleyen creator ödemesi">{formatNumber(r.unpaidPayouts)}</DetailRow>
        <DetailRow label="Test sağlayıcı işlemleri">{formatNumber(r.testTx)}</DetailRow>
        <DetailRow label="Demo (tohum) işlemleri">{formatNumber(r.demoTx)}</DetailRow>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">Geçerli finans kuralları</p>
        <DetailRow label="Creator payı (net üzerinden)">{formatPercent(r.rules.creatorShareBps)}</DetailRow>
        <DetailRow label="Ödeme kuruluşu komisyonu">
          {formatPercent(r.rules.processingFeeBps)} + {formatMoney(r.rules.processingFeeFixedMinor)}
        </DetailRow>
        <DetailRow label="KDV (fiyatlara dahil)">{formatPercent(r.rules.vatBps)}</DetailRow>
        <DetailRow label="Hak ediş bekleme süresi">{r.rules.holdDays} gün</DetailRow>
        <DetailRow label="Asgari ödeme">{formatMoney(r.rules.minPayoutMinor)}</DetailRow>
        <DetailRow label="Creator ödemeleri">
          <StatusPill size="sm" tone={r.rules.payoutsEnabled ? "green" : "warn"}>
            {r.rules.payoutsEnabled ? "Açık" : "Kapalı"}
          </StatusPill>
        </DetailRow>
        <Notice tone="neutral" className="mt-4">
          Mutabakat notu: bu kontroller veritabanı defterleri arasındaki iç tutarlılığı gösterir; banka/sağlayıcı ekstresi ile dış mutabakat sağlayıcı entegrasyonu tamamlandığında yapılır. Kurallar{" "}
          <Link href="/admin/settings" className="font-extrabold text-brand-500 hover:underline">
            Platform Ayarları
          </Link>
          &apos;ndan yönetilir.
        </Notice>
      </div>
    </div>
  );
}
