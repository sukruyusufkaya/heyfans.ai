import Link from "next/link";
import { ArrowRight, Bot, Check, Crown, FileText, Gem, Heart, ImageIcon, Layers, Lock, MapPin, MessageCircle, Mic, Send, Star, Video } from "lucide-react";
import { categoryLabel } from "@/components/creator/category-icon";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { PostCover } from "@/components/public/post-cover";
import { AiTwinLabel, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/display";
import { getFormatters, getT } from "@/i18n/server";
import { m } from "@/i18n/m";
import type { Translator } from "@/i18n/translate";
import { cn } from "@/lib/utils";
import { ACCESS_LABELS, TIER_LABELS } from "@/services/content/access";
import type { PublicCreatorProfile, PublicPlan, PublicPost } from "@/services/public/profile";
import { SocialIcon, socialHref, socialLabel } from "./social-icon";

/* ─── AI ikizi sohbet kartı ────────────────────────────────── */
export async function TwinTeaserCard({ creator, ai }: { creator: PublicCreatorProfile; ai: { available: boolean; mock: boolean } }) {
  const t = await getT();
  const twin = creator.twin;
  const live = Boolean(twin?.live);
  return (
    <section className="hf-card hf-gradient-pink flex h-full flex-col p-5" aria-labelledby="twin-teaser-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="twin-teaser-title" className="flex items-center gap-2.5 text-[15px] font-extrabold">
          <Bot className="size-[18px] text-brand-500" aria-hidden /> {t("AI İkiziyle Sohbet Et")}
        </h2>
        {live && (
          <Badge tone="green" size="sm" dot>
            {t("Yayında")}
          </Badge>
        )}
      </div>

      {live && twin ? (
        <>
          <div className="mt-4 flex items-center gap-3">
            <span className="size-14 shrink-0 overflow-hidden rounded-full border-2 border-white shadow">
              <CreatorPhoto src={creator.avatarUrl} name={creator.displayName} rounded="rounded-full" />
            </span>
            <p className="text-xs leading-relaxed text-ink-soft">
              {t("{name} adlı içerik üreticisinin AI ikizi burada. İstediğin zaman sohbet et, sorular sor ve onunla daha yakından tanış.", { name: creator.displayName })}
            </p>
          </div>
          <div className="mt-4 grid flex-1 content-start gap-2.5">
            <div className="max-w-[92%] rounded-2xl rounded-es-sm bg-white p-3 text-xs leading-relaxed text-ink-soft shadow-sm">
              <AiTwinLabel className="mb-1.5" />
              <p>{twin.greeting ?? t("Merhaba! Ben {name}. Seninle sohbet etmek için sabırsızlanıyorum.", { name: twin.name ?? creator.displayName })}</p>
            </div>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-strong">
            {t("Günde {count} mesaj ücretsiz · {pricing}. Yanıtlar yapay zekâ tarafından üretilir.", { count: twin.freeMessagesPerDay, pricing: creator.isSample ? t("örnek profilde kredili sohbet yok") : t("sonrası mesaj başına {credits} kredi", { credits: twin.messageCredits }) })}
          </p>
          {ai.available ? (
            <Link
              href={`/chat/${creator.username}`}
              className="mt-3 flex h-11 items-center justify-between gap-2 rounded-full bg-white px-5 text-xs font-extrabold text-ink shadow-sm ring-1 ring-line hover:ring-brand-300"
              aria-label={t("{name} AI ikiziyle sohbete başla", { name: creator.displayName })}
            >
              <span className="text-muted">{t("Mesajını yaz…")}</span>
              <span className="grid size-7 place-items-center rounded-full bg-brand-500 text-white">
                <Send className="rtl:-scale-x-100 size-3.5" aria-hidden />
              </span>
            </Link>
          ) : (
            <p role="status" className="mt-3 rounded-xl border border-[#f9d9aa] bg-[#fff7e9] px-3.5 py-2.5 text-[11px] font-semibold text-[#9a4f00]">
              {t("AI sohbeti şu anda kapalı; kısa süre içinde yeniden açılacak.")}
            </p>
          )}
          {ai.available && ai.mock && <p className="mt-2 text-[10px] font-semibold text-muted">{t("Test ortamı: yanıtlar “Test yanıtı” olarak etiketlenir.")}</p>}
        </>
      ) : (
        <div className="grid flex-1 place-items-center">
          <EmptyState compact icon={<Bot />} title={t("AI ikizi henüz yayında değil")} description={twin ? t("AI ikizi şu anda duraklatılmış veya incelemede.") : t("{name} henüz bir AI ikizi yayına almadı.", { name: creator.displayName })} />
        </div>
      )}
    </section>
  );
}

/* ─── Abonelik planları ────────────────────────────────────── */
const TIER_ICONS = { free: Heart, basic: Heart, premium: Star, vip: Gem } as const;

export async function PlansCard({ creator, activeTier, isOwner, full }: { creator: PublicCreatorProfile; activeTier: string; isOwner: boolean; full?: boolean }) {
  const t = await getT();
  return (
    <section className="hf-card p-5" aria-labelledby="plans-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="plans-title" className="flex items-center gap-2.5 text-[15px] font-extrabold">
          <Crown className="size-[18px] text-brand-500" aria-hidden /> {t("Abonelik Planları")}
        </h2>
        {!full && creator.plans.length > 0 && (
          <Link href={`/creators/${creator.username}?tab=plans`} className="text-[11px] font-extrabold text-brand-500 hover:text-brand-600">
            {t("Tüm Planları Gör →")}
          </Link>
        )}
      </div>
      {creator.plans.length ? (
        <ul className={cn("grid gap-3", full ? "md:grid-cols-3" : "sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3")}>
          {creator.plans.map((p) => (
            <PlanItem key={p.id} plan={p} username={creator.username} activeTier={activeTier} isOwner={isOwner} full={full} sample={creator.isSample} />
          ))}
        </ul>
      ) : (
        <EmptyState compact icon={<Crown />} title={t("Henüz abonelik planı yok")} description={t("{name} henüz bir abonelik planı yayınlamadı. Takip ederek yeni planlardan haberdar olabilirsin.", { name: creator.displayName })} />
      )}
    </section>
  );
}

async function PlanItem({ plan, username, activeTier, isOwner, full, sample }: { plan: PublicPlan; username: string; activeTier: string; isOwner: boolean; full?: boolean; sample?: boolean }) {
  const [t, { formatMoney, formatNumber }] = await Promise.all([getT(), getFormatters()]);
  const Icon = TIER_ICONS[plan.tier] ?? Heart;
  const active = activeTier === plan.tier;
  return (
    <li className={cn("relative flex flex-col rounded-2xl border bg-white p-4", plan.isPopular ? "border-brand-500 shadow-[var(--shadow-pink)]" : "border-line")}>
      {plan.isPopular && (
        <Badge tone="solid" size="sm" className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <Crown aria-hidden /> {t("En Popüler")}
        </Badge>
      )}
      <span className="mx-auto grid size-10 place-items-center rounded-full bg-brand-100 text-brand-500">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="mt-2 text-center text-sm font-extrabold">{t(plan.name)}</h3>
      <p className="mt-1 text-center">
        <span className="text-xl font-black tracking-tight text-brand-600">{formatMoney(plan.priceMonthlyMinor, plan.currency, { decimals: false })}</span>
        <span className="text-[11px] text-muted"> {t("/ ay")}</span>
      </p>
      {full && plan.priceYearlyMinor ? <p className="text-center text-[10px] text-muted">{t("veya yıllık {price}", { price: formatMoney(plan.priceYearlyMinor, plan.currency, { decimals: false }) })}</p> : null}
      <ul className="my-3 grid flex-1 content-start gap-1.5">
        {plan.benefits.slice(0, full ? 8 : 4).map((b) => (
          <li key={b} className="flex items-start gap-1.5 text-[11px] leading-snug text-ink-soft">
            <Check className="mt-0.5 size-3 shrink-0 text-brand-500" strokeWidth={3} aria-hidden /> {t(b)}
          </li>
        ))}
        {full && plan.monthlyCredits > 0 && (
          <li className="flex items-start gap-1.5 text-[11px] leading-snug text-ink-soft">
            <Check className="mt-0.5 size-3 shrink-0 text-brand-500" strokeWidth={3} aria-hidden /> {t("Aylık {credits} kredi", { credits: formatNumber(plan.monthlyCredits) })}
          </li>
        )}
      </ul>
      {sample ? (
        <span className="grid h-9 place-items-center rounded-full bg-soft text-center text-[11px] font-extrabold text-muted" title={t("Örnek profillerde abonelik kapalıdır")}>
          {t("Örnek profil · abonelik kapalı")}
        </span>
      ) : isOwner ? (
        <span className="grid h-9 place-items-center rounded-full bg-soft text-[11px] font-extrabold text-muted">{t("Senin planın")}</span>
      ) : active ? (
        <span className="grid h-9 place-items-center rounded-full bg-success-soft text-[11px] font-extrabold text-success">{t("Aktif planın")}</span>
      ) : (
        <Link
          href={`/creators/${username}/membership?plan=${plan.id}`}
          className={cn("grid h-9 place-items-center rounded-full text-[11px] font-extrabold", plan.isPopular ? "bg-brand-500 text-white shadow-[var(--shadow-pink)] hover:bg-brand-600" : "border border-brand-300 text-brand-600 hover:bg-brand-50")}
        >
          {t("Abone Ol")}
        </Link>
      )}
    </li>
  );
}

/* ─── Hakkında ─────────────────────────────────────────────── */
export async function AboutCard({ creator }: { creator: PublicCreatorProfile }) {
  const [t, { formatDate }] = await Promise.all([getT(), getFormatters()]);
  const links = creator.socialLinks.map((s) => ({ ...s, href: socialHref(s) })).filter((s) => s.href);
  return (
    <section className="hf-card p-5" aria-labelledby="about-title">
      <h2 id="about-title" className="mb-4 text-[15px] font-extrabold">
        {t("Hakkında")}
      </h2>
      <dl className="grid gap-4 text-xs">
        {creator.categories.length > 0 && (
          <div>
            <dt className="mb-1.5 font-black text-ink">{t("Kategoriler")}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {creator.categories.map((c) => (
                <Link key={c} href={`/categories/${c}`}>
                  <Badge tone="pink" size="md" className="hover:bg-brand-150">
                    {t(categoryLabel(c))}
                  </Badge>
                </Link>
              ))}
            </dd>
          </div>
        )}
        {creator.tags.length > 0 && (
          <div>
            <dt className="mb-1.5 font-black text-ink">{t("Etiketler")}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {creator.tags.slice(0, 12).map((tag) => (
                <Link key={tag} href={`/explore?q=${encodeURIComponent(tag)}`}>
                  <Badge tone="gray" size="md" className="hover:bg-brand-50 hover:text-brand-600">
                    #{tag}
                  </Badge>
                </Link>
              ))}
            </dd>
          </div>
        )}
        {creator.location && (
          <div className="flex items-center gap-2 text-ink-soft">
            <dt className="sr-only">{t("Konum")}</dt>
            <MapPin className="size-4 text-brand-500" aria-hidden />
            <dd>{creator.location}</dd>
          </div>
        )}
        {creator.languages.length > 0 && (
          <div>
            <dt className="mb-1 font-black text-ink">{t("Diller")}</dt>
            <dd className="uppercase text-ink-soft">{creator.languages.join(" · ")}</dd>
          </div>
        )}
        <div>
          <dt className="mb-1 font-black text-ink">{t("Katılım")}</dt>
          <dd className="text-ink-soft">{formatDate(creator.createdAt)}</dd>
        </div>
        {links.length > 0 && (
          <div>
            <dt className="mb-1.5 font-black text-ink">{t("Bağlantılar")}</dt>
            <dd className="flex flex-wrap gap-2">
              {links.map((s) => (
                <a key={`${s.platform}-${s.handle}`} href={s.href!} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-bold text-ink-soft hover:border-brand-300 hover:text-brand-600">
                  <SocialIcon platform={s.platform} className="size-3.5" /> {t(socialLabel(s.platform))}
                </a>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

/* ─── Gönderiler ───────────────────────────────────────────── */
const TYPE_ICONS = { photo: ImageIcon, video: Video, audio: Mic, text: FileText, collection: Layers } as const;
/** Kaynak (Türkçe) etiketler; gösterirken `t(TYPE_LABELS[tür])` kullanın. */
export const TYPE_LABELS: Record<string, string> = { photo: m("Fotoğraf"), video: m("Video"), audio: m("Ses"), text: m("Yazı"), collection: m("Koleksiyon") };

function lockText(p: PublicPost, t: Translator, formatMoney: (amountMinor: number | null | undefined, currency?: string, opts?: { decimals?: boolean }) => string, sample?: boolean) {
  if (p.decision.allowed) return null;
  if (sample) return t("Örnek içerik · satın alma kapalı");
  if (p.access === "purchase") return p.priceMinor ? t("{price} ile aç", { price: formatMoney(p.priceMinor, "TRY", { decimals: false }) }) : t("Satın alarak aç");
  if (p.access === "subscribers") return t("{tier}+ abonelere özel", { tier: t(TIER_LABELS[p.minPlanTier ?? "basic"] ?? "") });
  const label = ACCESS_LABELS[p.access];
  return label ? t(label) : t("Özel içerik");
}

export async function PostGrid({ posts, className, sample }: { posts: PublicPost[]; className?: string; sample?: boolean }) {
  const [t, { formatCompact, formatMoney }] = await Promise.all([getT(), getFormatters()]);
  return (
    <ul className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6", className)}>
      {posts.map((p) => {
        const Icon = TYPE_ICONS[p.type] ?? ImageIcon;
        const lock = lockText(p, t, formatMoney, sample);
        return (
          <li key={p.id} className="group relative overflow-hidden rounded-2xl bg-soft shadow-[var(--shadow-card)]">
            <Link href={`/content/${p.id}`} className="relative block aspect-[4/5]" aria-label={lock ? t("{title} — {lock}", { title: p.title, lock }) : p.title}>
              <PostCover src={p.coverUrl} title={p.title} type={p.type} locked={!p.decision.allowed} className="transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/65 to-transparent" aria-hidden />
              {lock && (
                <>
                  <Badge tone="solid" size="sm" className="absolute end-2 top-2">
                    <Lock aria-hidden /> {t("Özel")}
                  </Badge>
                  <span className="absolute inset-0 grid place-items-center p-3 text-center">
                    <span className="flex flex-col items-center gap-1.5 rounded-xl bg-black/35 px-3 py-2 text-[10px] font-extrabold text-white backdrop-blur-sm">
                      <Lock className="size-4" aria-hidden /> {lock}
                    </span>
                  </span>
                </>
              )}
              <span className="absolute inset-x-2.5 bottom-2.5 text-white">
                <span className="block truncate text-[11px] font-extrabold">{p.title}</span>
                <span className="mt-0.5 flex items-center gap-2.5 text-[10px] text-white/90">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-3 fill-current" aria-hidden /> {formatCompact(p.likes)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="size-3" aria-hidden /> {formatCompact(p.comments)}
                  </span>
                  <Icon className="ms-auto size-3.5" aria-label={TYPE_LABELS[p.type] ? t(TYPE_LABELS[p.type]!) : p.type} />
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SeeAllLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-extrabold text-brand-500 hover:text-brand-600">
      {children} <ArrowRight className="rtl:-scale-x-100 size-3.5" aria-hidden />
    </Link>
  );
}
