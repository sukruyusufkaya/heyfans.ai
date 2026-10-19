import Link from "next/link";
import { BadgeCheck, MessageCircle, ArrowRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { FavoriteButton } from "@/components/creator/social-buttons";
import { categoryLabel } from "@/components/creator/category-icon";
import type { CreatorCard } from "@/services/creators/public";
import { cn, formatCompact, formatMoney } from "@/lib/utils";

function Verified({ className }: { className?: string }) {
  return <BadgeCheck className={cn("size-4 shrink-0 fill-brand-500 text-white", className)} aria-label="Doğrulanmış" />;
}

function OnlinePill({ online }: { online: boolean }) {
  if (!online) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[9px] font-bold text-white backdrop-blur">
      <span className="size-1.5 rounded-full bg-[#2ee59d]" /> Çevrimiçi
    </span>
  );
}

/** Fotoğraf üstü yazılı kart (Ana sayfa "Öne Çıkan", Kategoriler "Trend"). */
export function CreatorTile({ creator, className, href }: { creator: CreatorCard; className?: string; href?: string }) {
  const chatHref = creator.twinLive ? `/chat/${creator.username}` : `/creators/${creator.username}`;
  return (
    <article className={cn("group relative overflow-hidden rounded-[15px] shadow-[var(--shadow-card)]", className)}>
      <Link href={href ?? `/creators/${creator.username}`} className="block aspect-[4/3.1]" aria-label={`${creator.displayName} profili`}>
        <CreatorPhoto src={creator.avatarUrl ?? creator.coverUrl} name={creator.displayName} rounded="rounded-none" className="transition-transform duration-500 group-hover:scale-[1.04]" />
        <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/25 to-transparent" aria-hidden />
      </Link>
      <div className="pointer-events-none absolute right-2.5 top-2.5">
        <OnlinePill online={creator.isOnline} />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <div className="min-w-0 text-white">
          {creator.categories[0] && (
            <Badge tone="white" size="sm" className="mb-1.5">
              {categoryLabel(creator.categories[0])}
            </Badge>
          )}
          <p className="flex items-center gap-1 truncate text-[13px] font-extrabold">
            {creator.displayName} {creator.verified && <Verified />}
          </p>
          <p className="text-[10px] text-white/80">{formatCompact(creator.followers)} takipçi</p>
        </div>
        <Link href={chatHref} className="pointer-events-auto shrink-0 rounded-full bg-white px-3 py-2 text-[10px] font-extrabold text-brand-600 shadow hover:bg-brand-50">
          Sohbet Et
        </Link>
      </div>
    </article>
  );
}

/** Keşfet kartı: üstte görsel, altta bilgi + çağrı. */
export function CreatorCardTall({
  creator,
  favorite,
  authed,
  cta = "profile",
  className,
}: {
  creator: CreatorCard;
  favorite?: boolean;
  authed: boolean;
  cta?: "profile" | "chat";
  className?: string;
}) {
  return (
    <article className={cn("hf-card flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-card-hover)]", className)}>
      <div className="relative aspect-[4/3]">
        <Link href={`/creators/${creator.username}`} aria-label={`${creator.displayName} profili`} className="block size-full">
          <CreatorPhoto src={creator.avatarUrl ?? creator.coverUrl} name={creator.displayName} rounded="rounded-none" />
        </Link>
        <div className="absolute left-2.5 top-2.5">
          <OnlinePill online={creator.isOnline} />
        </div>
        <FavoriteButton targetId={creator.id} initial={Boolean(favorite)} authed={authed} className="absolute right-2.5 top-2.5" />
        <div className="absolute bottom-2.5 left-2.5 flex gap-1.5">
          {creator.categories.slice(0, 2).map((c) => (
            <Badge key={c} tone="white" size="sm">
              {categoryLabel(c)}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <Link href={`/creators/${creator.username}`} className="flex items-center gap-1 truncate text-[15px] font-extrabold hover:text-brand-600">
          {creator.displayName} {creator.verified && <Verified />}
        </Link>
        <p className="mt-0.5 text-[11px] text-muted">{formatCompact(creator.followers)} takipçi</p>
        {creator.headline && <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-strong">{creator.headline}</p>}
        <div className="mt-auto pt-3">
          {cta === "profile" ? (
            <Link href={`/creators/${creator.username}`} className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-brand-500 text-[11px] font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
              Profili Gör <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <Link
              href={creator.twinLive ? `/chat/${creator.username}` : `/creators/${creator.username}`}
              className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-brand-300 text-[11px] font-extrabold text-brand-600 hover:bg-brand-50"
            >
              <MessageCircle className="size-3.5" /> Sohbet Et
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

/** Küçük kart: "Bu Hafta Yeni" / "Popüler" satırları. */
export function CreatorCardCompact({ creator, favorite, authed, badge, rank }: { creator: CreatorCard; favorite?: boolean; authed: boolean; badge?: string; rank?: number }) {
  return (
    <article className="hf-card overflow-hidden">
      <div className="relative aspect-[16/10]">
        <Link href={`/creators/${creator.username}`} className="block size-full" aria-label={`${creator.displayName} profili`}>
          <CreatorPhoto src={creator.avatarUrl ?? creator.coverUrl} name={creator.displayName} rounded="rounded-none" />
        </Link>
        {badge && <Badge tone="solid" size="sm" className="absolute left-2 top-2">{badge}</Badge>}
        {rank != null && <span className="absolute left-2 top-2 grid size-6 place-items-center rounded-full bg-brand-500 text-[11px] font-black text-white">{rank}</span>}
        <FavoriteButton targetId={creator.id} initial={Boolean(favorite)} authed={authed} className="absolute right-2 top-2 size-7" />
      </div>
      <div className="p-3">
        <Link href={`/creators/${creator.username}`} className="flex items-center gap-1 truncate text-[13px] font-extrabold hover:text-brand-600">
          {creator.displayName} {creator.verified && <Verified className="size-3.5" />}
        </Link>
        <p className="text-[10px] text-muted">{formatCompact(creator.followers)} takipçi</p>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {creator.categories.slice(0, 2).map((c) => (
            <Badge key={c} tone="gray" size="sm">
              {categoryLabel(c)}
            </Badge>
          ))}
          <Badge tone="pink" size="sm" className="ml-auto">
            {creator.startingPriceMinor ? `${formatMoney(creator.startingPriceMinor, "TRY", { decimals: false })}/ay` : "Ücretsiz"}
          </Badge>
        </div>
        <Link href={`/creators/${creator.username}`} className="mt-2.5 flex h-8 items-center justify-center rounded-full border border-brand-300 text-[11px] font-extrabold text-brand-600 hover:bg-brand-50">
          Profili Gör
        </Link>
      </div>
    </article>
  );
}

export function CreatorMiniRow({ creator, right }: { creator: Pick<CreatorCard, "username" | "displayName" | "avatarUrl" | "verified" | "followers">; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Link href={`/creators/${creator.username}`} className="size-12 shrink-0 overflow-hidden rounded-xl">
        <CreatorPhoto src={creator.avatarUrl} name={creator.displayName} rounded="rounded-xl" showMonogram />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/creators/${creator.username}`} className="flex items-center gap-1 truncate text-[13px] font-extrabold hover:text-brand-600">
          {creator.displayName} {creator.verified && <Verified className="size-3.5" />}
        </Link>
        <p className="flex items-center gap-1 text-[11px] text-muted">
          <Users className="size-3" /> {formatCompact(creator.followers)} takipçi
        </p>
      </div>
      {right}
    </div>
  );
}

export { Verified };
