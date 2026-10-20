import Link from "next/link";
import { Coins, Info, MessageCircle, PhoneOff, ShieldCheck } from "lucide-react";
import { CallClient } from "@/features/fan/call-client";
import { AiTwinLabel } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, PageHeader } from "@/components/ui/display";
import { formatNumber } from "@/lib/utils";
import type { getCallAvailability } from "@/services/calls/calls";

type Availability = Awaited<ReturnType<typeof getCallAvailability>>;

/** Sesli / görüntülü görüşme ekranı. Altyapı yoksa sahte görüşme gösterilmez; nedenler dürüstçe listelenir. */
export function CallScreen({ kind, data }: { kind: "voice" | "video"; data: Availability }) {
  const name = data.creator.displayName;
  const isVoice = kind === "voice";
  return (
    <div className="mx-auto max-w-[1320px]">
      <PageHeader
        eyebrow="HEYFANS / FAN EXPERIENCE"
        title={isVoice ? "Sesli Görüşme" : "Görüntülü Görüşme"}
        description={isVoice ? `${name} adlı içerik üreticisinin AI ikiziyle gerçek zamanlı sesli etkileşim.` : `${name} adlı içerik üreticisinin AI ikiziyle canlı, etkileşimli ve kişiselleştirilmiş video deneyimi.`}
        actions={
          <Link href={`/chat/${data.creator.username}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-xs font-extrabold text-muted-strong hover:border-brand-200">
            <MessageCircle className="size-4" /> Yazılı sohbet
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card>
          {data.available ? (
            <CallClient username={data.creator.username} kind={kind} creator={{ displayName: name, avatarUrl: data.creator.avatarUrl ?? null }} ratePerMinute={data.ratePerMinute} initialBalance={data.balance} />
          ) : (
            <div>
              <div className="relative flex min-h-[360px] flex-col items-center justify-center gap-3 overflow-hidden rounded-[18px] bg-[linear-gradient(160deg,#1f1428_0%,#3a0f33_60%,#5a0f45_100%)] px-6 py-14 text-center text-white">
                <Avatar src={data.creator.avatarUrl ?? null} name={name} size={96} ring={false} />
                <p className="text-lg font-black tracking-[-0.03em]">{name}</p>
                <AiTwinLabel size="md" className="bg-white/90" />
                <span className="mt-2 grid size-12 place-items-center rounded-full bg-white/15" aria-hidden>
                  <PhoneOff className="size-5" />
                </span>
                <p className="text-sm font-extrabold">Görüşme şu anda kullanılamıyor</p>
              </div>
              <div role="status" className="mt-4 rounded-2xl border border-[#f3dca8] bg-warning-soft p-4">
                <p className="flex items-center gap-2 text-xs font-extrabold text-ink">
                  <Info className="size-4 text-warning" aria-hidden /> Neden kullanılamıyor?
                </p>
                <ul className="mt-2 list-disc space-y-1 ps-5 text-xs leading-relaxed text-ink-soft">
                  {data.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-muted">Görüşme gerçekleştirilmez ve kredi tahsil edilmez. Altyapı etkinleştiğinde bu ekran otomatik olarak çalışır.</p>
              </div>
            </div>
          )}
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader title="Görüşme bilgileri" action={<span className="rounded-full bg-soft px-2.5 py-1 text-[10px] font-extrabold text-muted-strong">{data.available ? "Hazır" : "Kapalı"}</span>} />
            <div className="mb-4 flex items-center gap-3">
              <Avatar src={data.creator.avatarUrl ?? null} name={name} size={44} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-extrabold">{name}&apos;in AI ikizi</p>
                <p className="text-[11px] text-muted">{isVoice ? "Doğal sesli yanıtlar, anlık konuşma." : "Gerçek zamanlı AI görüntüsü ve sesi."}</p>
              </div>
            </div>
            <dl className="grid gap-3 border-t border-line-soft pt-4 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Dakika ücreti</dt>
                <dd className="font-extrabold">{data.ratePerMinute ? `${formatNumber(data.ratePerMinute)} kredi / dk` : "Ücretsiz"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Kredi bakiyen</dt>
                <dd className="font-extrabold">{formatNumber(data.balance)} kredi</dd>
              </div>
              {data.ratePerMinute > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Tahmini süre</dt>
                  <dd className="font-extrabold">~{formatNumber(Math.floor(data.balance / data.ratePerMinute))} dk</dd>
                </div>
              )}
            </dl>
            <Link href="/app/wallet" className="mt-4 flex h-11 items-center justify-center gap-2 rounded-full bg-brand-500 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
              <Coins className="size-4" /> Kredi satın al
            </Link>
          </Card>
          <Card className="hf-gradient-pink">
            <p className="flex items-center gap-2 text-sm font-extrabold">
              <ShieldCheck className="size-4 text-brand-500" aria-hidden /> {isVoice ? "Kontrol sende" : "Şeffaf AI deneyimi"}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-strong">
              {isVoice
                ? "İstediğin zaman görüşmeyi bitirebilirsin. Ücret, her başlayan dakika için kredi olarak tahsil edilir."
                : "Bu görüşmedeki görüntü ve ses gerçek zamanlı AI teknolojisiyle oluşturulur; gerçek bir insan görüşmesi değildir. Ücret, her başlayan dakika için tahsil edilir."}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
