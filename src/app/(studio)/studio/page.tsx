import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, Bot, ChevronRight, CreditCard, Crown, Inbox, LineChart, MessageCircle, Plus, Users, Wallet } from "lucide-react";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/display";
import { Meter, Notice, STUDIO_EYEBROW, TwinStatusBadge } from "@/components/studio/studio-ui";
import { Avatar } from "@/components/ui/display";
import { EarningsTrend } from "@/features/studio/earnings-trend";
import { getFormatters, getT } from "@/i18n/server";
import { requireCreator } from "@/lib/auth/session";
import { getDashboard } from "@/services/studio/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Genel Panel") };
}

const ACTIVITY_ICON = { notification: Bell, request: Inbox, subscription: Crown };

export default async function StudioDashboardPage() {
  const t = await getT();
  const { formatMoney, formatNumber, formatRelative, formatDate, formatPercent } = await getFormatters();
  const delta = (v: number | null | undefined): { value: string; direction: "up" | "down" | "flat" } | null => {
    if (v == null) return null;
    return { value: formatPercent(Math.abs(v) * 100), direction: v > 0 ? "up" : v < 0 ? "down" : "flat" };
  };
  const { user } = await requireCreator();
  const d = await getDashboard(user.id);
  const { creator, twin, kpis } = d;
  const q = twin?.quality;
  const tested = q && (q.personaScore != null || q.knowledgeScore != null || q.safetyScore != null);

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow={STUDIO_EYEBROW}
        title={t("Creator Genel Panel")}
        description={t("Kazançlarını, hayranlarını ve AI ikizinin performansını tek merkezden yönet.")}
        actions={
          <>
            <Button asChild>
              <Link href="/studio/content/new">
                <Plus /> {t("Yeni içerik oluştur")}
              </Link>
            </Button>
          </>
        }
      />

      {creator.status !== "approved" && (
        <Notice tone="info" title={creator.status === "pending_review" ? t("Başvurun inceleniyor") : t("Hesabın henüz onaylanmadı")} className="mb-5">
          {t("Onay tamamlanana kadar içeriklerin yayına alınmadan önce incelemeye düşer, AI ikizin yayına alınamaz ve ödeme talep edemezsin. Bu sürede stüdyoyu hazırlamaya devam edebilirsin.")}
        </Notice>
      )}

      <section aria-label={t("Özet göstergeler")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Toplam kazanç")}
          icon={<Wallet />}
          value={formatMoney(kpis.totalEarnings)}
          delta={delta(kpis.earningsDelta)}
          foot={t("son 30 gün: {amount}", { amount: formatMoney(kpis.earnings30) })}
        />
        <StatCard
          label={t("Aktif aboneler")}
          icon={<Crown />}
          tone="violet"
          value={formatNumber(kpis.activeSubs)}
          delta={delta(kpis.newSubsDelta)}
          foot={t("30 günde +{count, number} yeni", { count: kpis.newSubs })}
        />
        <StatCard
          label={t("AI sohbetleri")}
          icon={<MessageCircle />}
          tone="teal"
          value={formatNumber(kpis.conversations)}
          foot={t("30 günde +{count, number} yeni sohbet", { count: kpis.conversations30 })}
        />
        <StatCard
          label={t("Takipçi büyümesi")}
          icon={<Users />}
          tone="orange"
          value={formatNumber(kpis.followers)}
          delta={delta(kpis.followersDelta)}
          foot={t("30 günde +{count, number}", { count: kpis.newFollowers })}
        />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("Kazanç performansı")} hint={t("Creator payın (platform, ödeme ve vergi kesintilerinden sonra)")} />
          <EarningsTrend series={d.charts} />
        </Card>

        <Card>
          <CardHeader title={t("AI İkizi Performansı")} hint={t("Test skorları ve etkileşim")} action={twin ? <TwinStatusBadge status={twin.status} /> : undefined} />
          {twin ? (
            <>
              <div className="flex items-center gap-4">
                <Avatar src={creator.avatarUrl} name={creator.displayName} size={64} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-extrabold">{t("{name} AI İkizi", { name: creator.displayName })}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{t("Son güncelleme: {date}", { date: formatDate(twin.updatedAt) })}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={twin.features.chat ? "green" : "gray"} size="sm">
                      {t(twin.features.chat ? "Sohbet açık" : "Sohbet kapalı")}
                    </Badge>
                    <Badge tone={twin.features.voice ? "green" : "gray"} size="sm">
                      {t(twin.features.voice ? "Ses açık" : "Ses kapalı")}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-5 grid gap-3.5">
                <Meter label={t("Persona tutarlılığı")} value={q?.personaScore} />
                <Meter label={t("Bilgi doğruluğu")} value={q?.knowledgeScore} tone="violet" />
                <Meter label={t("Güvenlik uyumu")} value={q?.safetyScore} tone="teal" />
              </div>
              {!tested && <p className="mt-2 text-[11px] text-muted">{t("Skorlar, AI İkizi Testi çalıştırıldığında oluşur.")}</p>}
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-line-soft pt-4">
                <p className="text-[11px] text-muted">
                  {twin.stats.avgRating ? t("{count, number} mesaj · {rating}/5 puan", { count: twin.stats.messages, rating: formatNumber(twin.stats.avgRating) }) : t("{count, number} mesaj", { count: twin.stats.messages })}
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/studio/test">{t("Test et")}</Link>
                </Button>
              </div>
            </>
          ) : (
            <EmptyState compact icon={<Bot />} title={t("AI ikizin henüz oluşturulmadı")} description={t("Kişiliğini, bilgi tabanını ve sınırlarını tanımlayıp incelemeye gönder.")} action={<Button asChild size="sm"><Link href="/studio/personality">{t("Başla")}</Link></Button>} />
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.1fr)_minmax(0,0.95fr)]">
        <Card>
          <CardHeader title={t("Son aktiviteler")} hint={t("Hayranlarından ve sistemden son gelişmeler")} />
          {d.activity.length ? (
            <ul className="-mt-1">
              {d.activity.map((a) => {
                const Icon = ACTIVITY_ICON[a.kind];
                return (
                  <li key={a.id}>
                    <Link href={a.href} className="group flex items-center gap-3 border-b border-line-soft py-3 last:border-0">
                      <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-brand-100 text-brand-500">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-extrabold text-ink">{a.title}</span>
                        <span className="block truncate text-[10px] text-muted">
                          {a.sub ? `${a.sub} · ` : ""}
                          {formatRelative(a.at)}
                        </span>
                      </span>
                      <ChevronRight className="rtl:-scale-x-100 size-4 shrink-0 text-muted/60 group-hover:text-brand-500" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact title={t("Henüz aktivite yok")} description={t("Yeni abonelik, talep ve bildirimler burada listelenir.")} />
          )}
        </Card>

        <Card>
          <CardHeader title={t("Hızlı işlemler")} hint={t("En çok kullanılan stüdyo araçları")} />
          <div className="grid gap-2.5">
            {[
              { href: "/studio/content/new", label: t("Yeni içerik ekle"), icon: Plus },
              { href: "/studio/personality", label: t("AI ikizimi düzenle"), icon: Bot },
              { href: "/studio/memberships", label: t("Üyelik planları"), icon: Crown },
              { href: "/studio/analytics", label: t("Raporları incele"), icon: LineChart },
              { href: "/studio/requests", label: t("Özel talepler"), icon: Inbox },
              { href: "/studio/payouts", label: t("Ödemeler"), icon: CreditCard },
            ].map((q) => (
              <Link key={q.href} href={q.href} className="group flex items-center gap-3 rounded-[13px] border border-line bg-white p-3 text-[12px] font-extrabold transition-colors hover:border-brand-300 hover:bg-brand-50">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-brand-100 text-brand-500">
                  <q.icon className="size-4" aria-hidden />
                </span>
                <span className="flex-1 truncate">{q.label}</span>
                <ChevronRight className="rtl:-scale-x-100 size-4 text-muted/60 group-hover:text-brand-500" aria-hidden />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden bg-gradient-to-br from-[#fff1f9] to-[#f7eaf7]" padded={false}>
          <div className="p-5">
            <h2 className="text-[15px] font-extrabold tracking-[-0.02em]">{t("Topluluğun büyüyor")}</h2>
            <div className="mt-3 aspect-[16/9] overflow-hidden rounded-[14px]">
              <CreatorPhoto src={creator.avatarUrl ?? creator.coverUrl} name={creator.displayName} rounded="rounded-[14px]" />
            </div>
            <p className="mt-3 text-[14px] font-extrabold">{t("Yeni hayranlarla buluş")}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              {t("{followers, number} takipçin var; son 30 günde {newFollowers, number} yeni kişi seni takip etti. AI ikizinin kişiliğini geliştirerek bağı güçlendir.", { followers: kpis.followers, newFollowers: kpis.newFollowers })}
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/studio/ai-twin">
                <ArrowRight className="rtl:-scale-x-100" /> {t("AI ikizime git")}
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
