import Link from "next/link";
import { ChevronRight, Gift, ImageIcon, Mic, Video } from "lucide-react";
import { categoryLabel } from "@/components/creator/category-icon";
import { Verified } from "@/components/creator/creator-cards";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { AiTwinLabel, Badge, SampleProfileLabel } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { formatCompact, formatNumber } from "@/lib/utils";

interface Props {
  creator: { username: string; displayName: string; avatarUrl: string | null; coverUrl: string | null; categories: string[]; verified: boolean; followers: number; conversations: number; isSample?: boolean };
  twin: { rating: number | null; voice: boolean; video: boolean; voicePerMinute: number; videoPerMinute: number };
}

/** Sohbet ekranı sağ paneli: creator kartı + hızlı bağlantılar (yalnız gerçek veriler). */
export function ChatInfoPanel({ creator, twin }: Props) {
  const allLinks = [
    { href: `/experiences/voice/${creator.username}`, label: "Sesli görüşme başlat", icon: Mic, hint: twin.voice ? `${formatNumber(twin.voicePerMinute)} kredi / dk` : "Şu an kapalı" },
    { href: `/experiences/video/${creator.username}`, label: "Görüntülü görüşme", icon: Video, hint: twin.video ? `${formatNumber(twin.videoPerMinute)} kredi / dk` : "Şu an kapalı" },
    { href: `/creators/${creator.username}/content`, label: "Özel içerikleri keşfet", icon: ImageIcon, hint: null },
    { href: `/app/gifts?to=${creator.username}`, label: "Hediye gönder", icon: Gift, hint: null },
  ];
  // Örnek profilde ücretli görüşme ve hediye kapalı.
  const links = creator.isSample ? allLinks.filter((l) => l.icon === ImageIcon) : allLinks;
  return (
    <div className="grid content-start gap-4">
      <article className="hf-card overflow-hidden">
        <div className="relative aspect-[16/10]">
          <CreatorPhoto src={creator.avatarUrl ?? creator.coverUrl} name={creator.displayName} rounded="rounded-none" />
          <span className="absolute left-3 top-3">
            <AiTwinLabel size="md" className="bg-white/90" />
          </span>
          {creator.isSample && <SampleProfileLabel size="md" tone="white" className="absolute right-3 top-3" />}
        </div>
        <div className="p-5">
          <Link href={`/creators/${creator.username}`} className="flex items-center gap-1.5 text-xl font-black tracking-[-0.03em] hover:text-brand-600">
            {creator.displayName} {creator.verified && <Verified className="size-5" />}
          </Link>
          {creator.categories.length > 0 && <p className="mt-1.5 text-xs text-muted">{creator.categories.slice(0, 3).map(categoryLabel).join(" • ")}</p>}
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
            <div>
              <dt className="order-2 text-[10px] text-muted">Takipçi</dt>
              <dd className="text-base font-extrabold">{formatCompact(creator.followers)}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-muted">Sohbet</dt>
              <dd className="text-base font-extrabold">{formatCompact(creator.conversations)}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-muted">Puan</dt>
              <dd className="text-base font-extrabold">{twin.rating ? `${twin.rating.toFixed(1).replace(".", ",")}/5` : "—"}</dd>
            </div>
          </dl>
        </div>
      </article>
      <Card>
        <CardHeader title="Daha fazlasını deneyimle" />
        <ul className="-mx-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-soft">
                <l.icon className="size-[18px] shrink-0 text-brand-500" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold">{l.label}</span>
                  {l.hint && <span className="block text-[10px] text-muted">{l.hint}</span>}
                </span>
                {l.hint === "Şu an kapalı" && <Badge tone="gray" size="sm">Kapalı</Badge>}
                <ChevronRight className="size-4 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
