import Link from "next/link";
import { ChevronRight, Gift, ImageIcon, Mic, Video } from "lucide-react";
import { categoryLabel } from "@/components/creator/category-icon";
import { Verified } from "@/components/creator/creator-cards";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { AiTwinLabel, Badge, SampleProfileLabel } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { LOCALE_META } from "@/i18n/config";
import { getFormatters, getT } from "@/i18n/server";

interface Props {
  creator: { username: string; displayName: string; avatarUrl: string | null; coverUrl: string | null; categories: string[]; verified: boolean; followers: number; conversations: number; isSample?: boolean };
  twin: { rating: number | null; voice: boolean; video: boolean; voicePerMinute: number; videoPerMinute: number };
}

/** Sohbet ekranı sağ paneli: creator kartı + hızlı bağlantılar (yalnız gerçek veriler). */
export async function ChatInfoPanel({ creator, twin }: Props) {
  const t = await getT();
  const { formatCompact, formatNumber, locale } = await getFormatters();
  const ratingFormat = new Intl.NumberFormat(LOCALE_META[locale].intl, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const allLinks = [
    { href: `/experiences/voice/${creator.username}`, label: t("Sesli görüşme başlat"), icon: Mic, hint: twin.voice ? t("{n} kredi / dk", { n: formatNumber(twin.voicePerMinute) }) : t("Şu an kapalı"), closed: !twin.voice },
    { href: `/experiences/video/${creator.username}`, label: t("Görüntülü görüşme"), icon: Video, hint: twin.video ? t("{n} kredi / dk", { n: formatNumber(twin.videoPerMinute) }) : t("Şu an kapalı"), closed: !twin.video },
    { href: `/creators/${creator.username}/content`, label: t("Özel içerikleri keşfet"), icon: ImageIcon, hint: null, closed: false },
    { href: `/app/gifts?to=${creator.username}`, label: t("Hediye gönder"), icon: Gift, hint: null, closed: false },
  ];
  // Örnek profilde ücretli görüşme ve hediye kapalı.
  const links = creator.isSample ? allLinks.filter((l) => l.icon === ImageIcon) : allLinks;
  return (
    <div className="grid content-start gap-4">
      <article className="hf-card overflow-hidden">
        <div className="relative aspect-[16/10]">
          <CreatorPhoto src={creator.avatarUrl ?? creator.coverUrl} name={creator.displayName} rounded="rounded-none" />
          <span className="absolute start-3 top-3">
            <AiTwinLabel size="md" className="bg-white/90" />
          </span>
          {creator.isSample && <SampleProfileLabel size="md" tone="white" className="absolute end-3 top-3" />}
        </div>
        <div className="p-5">
          <Link href={`/creators/${creator.username}`} className="flex items-center gap-1.5 text-xl font-black tracking-[-0.03em] hover:text-brand-600">
            {creator.displayName} {creator.verified && <Verified className="size-5" />}
          </Link>
          {creator.categories.length > 0 && <p className="mt-1.5 text-xs text-muted">{creator.categories.slice(0, 3).map((c) => t(categoryLabel(c))).join(" • ")}</p>}
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
            <div>
              <dt className="order-2 text-[10px] text-muted">{t("Takipçi")}</dt>
              <dd className="text-base font-extrabold">{formatCompact(creator.followers)}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-muted">{t("Sohbet")}</dt>
              <dd className="text-base font-extrabold">{formatCompact(creator.conversations)}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-muted">{t("Puan")}</dt>
              <dd className="text-base font-extrabold">{twin.rating ? `${ratingFormat.format(twin.rating)}/5` : "—"}</dd>
            </div>
          </dl>
        </div>
      </article>
      <Card>
        <CardHeader title={t("Daha fazlasını deneyimle")} />
        <ul className="-mx-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-soft">
                <l.icon className="size-[18px] shrink-0 text-brand-500" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold">{l.label}</span>
                  {l.hint && <span className="block text-[10px] text-muted">{l.hint}</span>}
                </span>
                {l.closed && (
                  <Badge tone="gray" size="sm">
                    {t("Kapalı")}
                  </Badge>
                )}
                <ChevronRight className="rtl:-scale-x-100 size-4 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
