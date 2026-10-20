import type { Metadata } from "next";
import { Crown, Gift, Heart, UserPlus, Users } from "lucide-react";
import { AreaTrend, Donut } from "@/components/charts/charts";
import { Avatar, EmptyState, PageHeader, StatCard } from "@/components/ui/display";
import { Card, CardHeader } from "@/components/ui/card";
import { STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { getFormatters, getT } from "@/i18n/server";
import { requireCreator } from "@/lib/auth/session";
import { getAudience } from "@/services/studio/fans";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Hayranlar ve Kitle") };
}

export default async function FansPage() {
  const t = await getT();
  const { formatNumber, formatRelative } = await getFormatters();
  const { user } = await requireCreator();
  const d = await getAudience(user.id);
  const donut = d.tiers.filter((tier) => tier.value > 0).map((tier) => ({ name: t(tier.label), value: tier.value }));
  const maxCredits = Math.max(1, ...d.supporters.map((s) => s.credits));

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader eyebrow={STUDIO_EYEBROW} title={t("Hayranlar ve Kitle")} description={t("Hayranlarını tanı, segmentlerini keşfet ve etkileşimi analiz et.")} />

      <section aria-label={t("Kitle göstergeleri")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("Takipçi")} icon={<Users />} value={formatNumber(d.followers)} foot={t("Profil sayacı")} />
        <StatCard label={t("Aktif aboneler")} icon={<Crown />} tone="violet" value={formatNumber(d.totalSubscribers)} />
        <StatCard label={t("Yeni takipçi (30 gün)")} icon={<UserPlus />} tone="teal" value={`+${formatNumber(d.newFollowers30)}`} />
        <StatCard label={t("Destekçi")} icon={<Gift />} tone="orange" value={formatNumber(d.supporters.length)} foot={t("Hediye/bahşiş gönderen")} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("Hayran kitlesi büyümesi")} hint={t("Son 30 günde günlük yeni takipçi")} />
          {d.growth.some((p) => p.value > 0) ? <AreaTrend data={d.growth} height={240} seriesLabel={t("Yeni takipçi")} /> : <EmptyState compact title={t("Henüz veri bulunmuyor")} description={t("Hayranlar seni takip ettikçe büyüme grafiği burada oluşur.")} />}
        </Card>
        <Card>
          <CardHeader title={t("Abone dağılımı")} hint={t("Etkin aboneler, kademeye göre")} />
          {donut.length ? (
            <Donut data={donut} height={150} centerValue={formatNumber(d.totalSubscribers)} centerLabel={t("abone")} />
          ) : (
            <EmptyState compact title={t("Henüz abone yok")} description={t("Üyelik planların aktif olduğunda abone dağılımı burada görünür.")} />
          )}
          <ul className="mt-4 grid gap-2 border-t border-line-soft pt-3 text-[12px]">
            {d.tiers.map((tier) => (
              <li key={tier.key} className="flex justify-between">
                <span className="text-muted-strong">{t(tier.label)}</span>
                <b className="tabular-nums">{formatNumber(tier.value)}</b>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("En çok destekleyenler")} hint={t("Gönderilen hediye ve bahşiş kredisine göre · yalnız görünen adlar")} icon={<Heart />} />
          {d.supporters.length ? (
            <ol className="grid gap-3.5">
              {d.supporters.map((s, i) => (
                <li key={`${s.name}-${i}`} className="flex items-center gap-3">
                  <span className="w-5 text-center text-[11px] font-black text-brand-500">{i + 1}</span>
                  <Avatar src={s.image} name={s.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-extrabold">{s.name}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f3eaf2]">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500" style={{ width: `${(s.credits / maxCredits) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-[12px] font-black">{t("{count, number} kredi", { count: s.credits })}</p>
                    <p className="text-[10px] text-muted">{t("{count} destek", { count: s.count })}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState compact title={t("Henüz destek yok")} description={t("Hayranlar hediye ya da bahşiş gönderdiğinde burada listelenir.")} />
          )}
        </Card>
        <Card>
          <CardHeader title={t("Yeni takipçiler")} hint={t("Son takip edenler")} />
          {d.recent.length ? (
            <ul className="grid gap-3">
              {d.recent.map((f) => (
                <li key={f.id} className="flex items-center gap-3">
                  <Avatar src={f.image} name={f.name} size={36} />
                  <p className="flex-1 truncate text-[12px] font-extrabold">{f.name}</p>
                  <span className="text-[10px] text-muted">{formatRelative(f.at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title={t("Henüz takipçi yok")} />
          )}
          <p className="mt-4 border-t border-line-soft pt-3 text-[10px] leading-relaxed text-muted">{t("Gizlilik gereği hayranların e-posta, kimlik ve özel sohbet içeriği gösterilmez; yalnız görünen adları listelenir.")}</p>
        </Card>
      </div>
    </div>
  );
}
