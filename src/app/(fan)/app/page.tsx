import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Coins, Crown, Heart, Lock, MessageCircle, Sparkles } from "lucide-react";
import { CategoryIcon } from "@/components/creator/category-icon";
import { CreatorCardTall } from "@/components/creator/creator-cards";
import { ContentTypeIcon } from "@/components/fan/content-parts";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/display";
import { requireUser } from "@/lib/auth/session";
import { getFanHome } from "@/services/fan/feed";
import { LOCALE_META } from "@/i18n/config";
import { getFormatters, getLocale, getT } from "@/i18n/server";
import { m } from "@/i18n/m";
import type { Translator } from "@/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Ana Sayfa") };
}
export const dynamic = "force-dynamic";
const TZ = "Europe/Istanbul"; // i18n-ignore (saat dilimi kimliği)

function greeting(t: Translator, now = new Date()) {
  // Yalnız saati ayrıştırmak için sabit (Latin rakamlı) yerel kullanılır.
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: TZ }).format(now)) % 24;
  if (hour >= 5 && hour < 12) return t(m("Günaydın"));
  if (hour >= 12 && hour < 18) return t(m("İyi günler"));
  if (hour >= 18 && hour < 23) return t(m("İyi akşamlar"));
  return t(m("İyi geceler"));
}

export default async function FanHomePage() {
  const { user } = await requireUser("/app");
  const t = await getT();
  const locale = await getLocale();
  const { formatNumber, formatRelative } = await getFormatters();
  const home = await getFanHome({ id: user.id, roles: user.roles });
  const firstName = user.name.split(/\s+/)[0] ?? user.name;
  const today = new Intl.DateTimeFormat(LOCALE_META[locale].intl, { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date());
  const favorites = new Set(home.favorites);

  const stats = [
    { label: t("Bu ay gönderilen mesaj"), value: formatNumber(home.stats.messagesThisMonth), icon: MessageCircle, href: "/chat" },
    { label: t("Favori içerik üretici"), value: formatNumber(home.stats.favoriteCreators), icon: Heart, href: "/app/favorites" },
    { label: t("Aktif üyelik"), value: formatNumber(home.stats.activeSubs), icon: Crown, href: "/app/subscriptions" },
    { label: t("Kalan kredi"), value: formatNumber(home.stats.credits), icon: Coins, href: "/app/wallet" },
  ];

  return (
    <div className="mx-auto max-w-[1320px]">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow mb-2">{t("HEYFANS / HOŞ GELDİN")}</p>
          <h1 className="text-[26px] font-black leading-[1.08] tracking-[-0.035em] sm:text-[30px]">
            {greeting(t)}, {firstName} <span className="text-brand-500" aria-hidden>✦</span>
          </h1>
          <p className="mt-2 text-xs text-muted">{t("Bugün sevdiğin içerik üreticilerinin dünyasında neler olduğunu keşfet.")}</p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-white px-4 py-2.5 text-[11px] font-extrabold text-muted-strong sm:self-auto">
          <CalendarDays className="size-3.5" aria-hidden /> {today}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2.35fr_1fr]">
        <section
          aria-label={t("Öne çıkan")}
          className="relative flex min-h-[250px] flex-col justify-center overflow-hidden rounded-[21px] bg-[linear-gradient(110deg,#1a0b20_0%,#330c2a_52%,#7a0f57_100%)] p-7 text-white shadow-[0_18px_35px_rgb(50_23_38/0.15)] sm:p-9"
        >
          <span aria-hidden className="pointer-events-none absolute -end-16 -top-16 size-72 rounded-full bg-brand-500/30 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-24 end-1/4 size-64 rounded-full bg-violet/30 blur-3xl" />
          <div className="relative">
            <span className="text-[11px] font-extrabold tracking-wide text-[#ff99ce]">✦ {t("SENİN İÇİN ÖZEL")}</span>
            <h2 className="mt-4 text-[28px] font-black leading-[1.1] tracking-[-0.04em] sm:text-[33px]">
              {t("Gerçek insanlar.")}
              <br />
              <span className="text-[#fc3aa8]">{t("Sana özel bağlantılar.")}</span>
            </h2>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-[#eedeea]">{t("Favori içerik üreticilerinin onaylı AI ikizleriyle sohbet et, sana özel anları keşfet.")}</p>
            <Link href="/explore" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-brand-500 px-6 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
              {t("AI ikizlerini keşfet")} <ArrowRight className="rtl:-scale-x-100 size-4" />
            </Link>
          </div>
        </section>

        <Card>
          <CardHeader title={t("Senin etkinliğin")} />
          <ul className="grid grid-cols-2 gap-2.5">
            {stats.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="block rounded-[14px] border border-[#f3ebf0] bg-[#fffafd] p-3.5 transition-colors hover:border-brand-200">
                  <span className="mb-2.5 grid size-8 place-items-center rounded-[10px] bg-brand-100 text-brand-500">
                    <s.icon className="size-4" aria-hidden />
                  </span>
                  <b className="block text-[22px] font-black tracking-[-0.03em]">{s.value}</b>
                  <span className="mt-0.5 block text-[10px] font-bold text-muted">{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section className="mt-7" aria-labelledby="rec-title">
        <SectionTitle
          title={<span id="rec-title">{t("Senin için önerilen AI ikizleri")}</span>}
          subtitle={home.personalized ? t("İlgi alanlarına göre seçildi.") : t("Popüler ikizler. Önerileri kişiselleştirmek için ilgi alanlarını seç.")}
          action={
            <Link href="/explore" className="inline-flex items-center gap-1 text-xs font-extrabold text-brand-500 hover:underline">
              {t("Tümünü gör")} <ArrowRight className="rtl:-scale-x-100 size-3.5" />
            </Link>
          }
        />
        {home.recommended.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {home.recommended.map((c) => (
              <CreatorCardTall key={c.id} creator={c} favorite={favorites.has(c.id)} authed />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState icon={<Sparkles />} title={t("Şimdilik önerilecek ikiz yok")} description={t("Yeni içerik üreticileri katıldıkça burada görünecek.")} action={<Link href="/explore" className="text-xs font-extrabold text-brand-500 hover:underline">{t("Keşfet'e git")}</Link>} />
          </Card>
        )}
      </section>

      <div className="mt-7 grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <div className="grid min-w-0 gap-4">
          <Card>
            <CardHeader
              title={t("İlgi alanlarına göre keşfet")}
              action={
                <Link href="/app/personalization" className="inline-flex items-center gap-1 text-xs font-extrabold text-brand-500 hover:underline">
                  {t("Düzenle")} <ArrowRight className="rtl:-scale-x-100 size-3.5" />
                </Link>
              }
            />
            {home.interests.length ? (
              <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                {home.interests.map((i) => (
                  <li key={i.slug}>
                    <Link href={`/categories/${i.slug}`} className="block rounded-[11px] border border-[#fae5ef] bg-brand-50 p-4 text-center text-brand-500 transition-colors hover:bg-brand-100">
                      <CategoryIcon name={i.icon} className="mx-auto mb-2 size-5" />
                      <b className="text-[11px] text-ink-soft">{t(i.name)}</b>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact title={t("Henüz ilgi alanı seçmedin")} description={t("Seçtiğin alanlara göre ikiz önerileri hazırlarız.")} action={<Link href="/app/personalization" className="text-xs font-extrabold text-brand-500 hover:underline">{t("İlgi alanlarını seç")}</Link>} />
            )}
          </Card>

          <Card>
            <CardHeader
              title={t("Son sohbetlerin")}
              action={
                <Link href="/chat" className="inline-flex items-center gap-1 text-xs font-extrabold text-brand-500 hover:underline">
                  {t("Tümü")} <ArrowRight className="rtl:-scale-x-100 size-3.5" />
                </Link>
              }
            />
            {home.chats.length ? (
              <ul className="-mx-2">
                {home.chats.map((c) => (
                  <li key={c.conversationId}>
                    <Link href={`/chat/${c.username}`} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-soft">
                      <Avatar src={c.avatarUrl} name={c.displayName} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-extrabold">{c.displayName}</span>
                        <span className="block truncate text-[11px] text-muted">{c.preview ?? t("Sohbete başla")}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[10px] text-muted">{c.lastAt ? formatRelative(c.lastAt) : ""}</span>
                        {c.unread > 0 && <span className="grid size-[18px] place-items-center rounded-full bg-brand-500 text-[10px] font-black text-white">{c.unread}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={<MessageCircle />} title={t("Henüz sohbetin yok")} description={t("Bir AI ikiziyle konuşmaya başladığında burada görünür.")} action={<Link href="/explore" className="text-xs font-extrabold text-brand-500 hover:underline">{t("İkizleri keşfet")}</Link>} />
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader
            title={t("Yeni paylaşımlar")}
            action={
              <Link href="/app/following" className="inline-flex items-center gap-1 text-xs font-extrabold text-brand-500 hover:underline">
                {t("Gör")} <ArrowRight className="rtl:-scale-x-100 size-3.5" />
              </Link>
            }
          />
          {home.posts.length ? (
            <ul className="-mx-2">
              {home.posts.map((p) => {
                return (
                  <li key={p.id}>
                    <Link href={`/content/${p.id}`} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-soft">
                      <Avatar src={p.creator.avatarUrl} name={p.creator.displayName} size={38} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold">{p.creator.displayName}</span>
                        <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted">
                          {p.locked ? <Lock className="size-3" aria-label={t("Kilitli")} /> : <ContentTypeIcon type={p.type} className="size-3" />}
                          <span className="truncate">{p.title}</span> · {formatRelative(p.publishedAt)}
                        </span>
                      </span>
                      {p.fresh && (
                        <Badge tone="pink" size="sm">
                          {t("Yeni")}
                        </Badge>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              compact
              title={home.followedCount ? t("Yeni paylaşım yok") : t("Henüz kimseyi takip etmiyorsun")}
              description={home.followedCount ? t("Takip ettiklerin paylaşım yaptığında burada görünür.") : t("İçerik üreticilerini takip ederek paylaşımlarını burada gör.")}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
