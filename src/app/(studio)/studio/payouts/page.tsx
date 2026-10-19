import type { Metadata } from "next";
import { CheckCircle2, Clock, Landmark, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, EmptyState, PageHeader, StatCard, Td, Th } from "@/components/ui/display";
import { Notice, STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { PayoutAccountDialog, RequestPayoutForm } from "@/features/studio/payout-forms";
import { requireCreator } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { getPayouts } from "@/services/studio/finance";

export const metadata: Metadata = { title: "Ödemeler" };

const STATUS: Record<string, { label: string; tone: "warn" | "violet" | "teal" | "green" | "danger" | "gray" }> = {
  requested: { label: "Talep edildi", tone: "warn" },
  approved: { label: "Onaylandı", tone: "teal" },
  processing: { label: "İşleniyor", tone: "violet" },
  paid: { label: "Ödendi", tone: "green" },
  rejected: { label: "Reddedildi", tone: "danger" },
  failed: { label: "Başarısız", tone: "danger" },
  canceled: { label: "İptal edildi", tone: "gray" },
};
const ACCOUNT_STATUS = { verified: { label: "Doğrulandı", tone: "green" as const }, unverified: { label: "Doğrulama bekliyor", tone: "warn" as const }, rejected: { label: "Reddedildi", tone: "danger" as const } };

export default async function PayoutsPage() {
  const { user } = await requireCreator();
  const d = await getPayouts(user.id);
  const acc = d.account;
  const accStatus = acc ? ACCOUNT_STATUS[acc.status] : null;

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader eyebrow={STUDIO_EYEBROW} title="Ödemeler" description="Bakiyeni, ödeme taleplerini ve hesap hareketlerini yönet." />

      {!d.payoutsEnabled && (
        <Notice tone="warn" title="Ödemeler henüz açılmadı" className="mb-5">
          Ödeme talepleri, ödeme sağlayıcısı ve finansal uygunluk süreci tamamlanana kadar platform genelinde kapalıdır. Kazançların hak ediş defterinde birikmeye devam eder; ödemeler açıldığında talep edebilirsin.
        </Notice>
      )}

      <section aria-label="Bakiye" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Çekilebilir bakiye" icon={<Wallet />} value={formatMoney(d.balance.available)} foot={d.canRequest ? "Ödemeye uygun" : "Şu an talep edilemiyor"} />
        <StatCard label="İşlemdeki ödemeler" icon={<Clock />} tone="violet" value={formatMoney(d.balance.inPayout)} />
        <StatCard label="Toplam ödenen" icon={<CheckCircle2 />} tone="green" value={formatMoney(d.balance.paidOut)} />
        <StatCard label="Bekleyen hak ediş" icon={<Landmark />} tone="orange" value={formatMoney(d.balance.pending)} foot={`${d.holdDays} gün sonra kullanılabilir`} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="bg-gradient-to-br from-white to-[#fff6fb]">
          <CardHeader title="Ödeme talebi oluştur" hint="Uygun bakiyeni güvenli şekilde talep et." />
          <RequestPayoutForm availableMinor={d.balance.available} minMinor={d.minPayoutMinor} canRequest={d.canRequest} reasons={d.reasons} />
        </Card>

        <Card>
          <CardHeader title="Ödeme hesabı" action={accStatus ? <Badge tone={accStatus.tone} dot>{accStatus.label}</Badge> : undefined} />
          {acc ? (
            <div className="flex items-center gap-3 rounded-2xl bg-soft p-4">
              <span className="grid size-11 place-items-center rounded-xl bg-white text-brand-500 shadow-sm">
                <Landmark className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-extrabold">{acc.holderName}</p>
                <p className="text-[11px] text-muted-strong">
                  {acc.bankName ? `${acc.bankName} · ` : ""}
                  <span className="font-mono">{acc.ibanMasked}</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-2xl bg-soft p-4 text-[12px] text-muted-strong">Henüz bir ödeme hesabı eklemedin.</p>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-muted">IBAN şifreli saklanır, yalnız maskelenmiş hali gösterilir. Hesap doğrulaması yönetim ekibi tarafından yapılır.</p>
          <div className="mt-4">
            <PayoutAccountDialog hasAccount={Boolean(acc)} />
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Ödeme geçmişi" hint="Talep durumları ve zaman çizelgesi" />
        {d.requests.length ? (
          <DataTable>
            <thead>
              <tr>
                <Th>Tarih</Th>
                <Th className="text-right">Tutar</Th>
                <Th>Durum</Th>
                <Th>Zaman çizelgesi</Th>
                <Th>Not / referans</Th>
              </tr>
            </thead>
            <tbody>
              {d.requests.map((r) => {
                const st = STATUS[r.status] ?? { label: r.status, tone: "gray" as const };
                return (
                  <tr key={r._id.toString()}>
                    <Td className="whitespace-nowrap">{formatDate(r.createdAt)}</Td>
                    <Td className="text-right font-extrabold tabular-nums">{formatMoney(r.amount.amountMinor)}</Td>
                    <Td>
                      <Badge tone={st.tone} size="sm">
                        {st.label}
                      </Badge>
                    </Td>
                    <Td>
                      <ol className="grid gap-0.5 text-[10px] text-muted-strong">
                        {r.history.map((h, i) => (
                          <li key={i} className="whitespace-nowrap">
                            <b className="text-ink-soft">{STATUS[h.to]?.label ?? h.to}</b> · {formatDateTime(h.at)}
                          </li>
                        ))}
                      </ol>
                    </Td>
                    <Td className="text-[11px]">{[r.note, r.providerRef && `Ref: ${r.providerRef}`].filter(Boolean).join(" · ") || "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState compact title="Henüz ödeme talebin yok" description="Ödeme talepleri açıldığında ve bakiyen uygun olduğunda burada listelenir." />
        )}
      </Card>
    </div>
  );
}
