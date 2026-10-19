import Link from "next/link";
import { FileText, Heart, ImageIcon, Images, Lock, MessageCircle, Music2, Play, Sparkles } from "lucide-react";
import { ContentCover } from "@/components/creator/creator-photo";
import { FavoriteButton } from "@/components/creator/social-buttons";
import { Verified } from "@/components/creator/creator-cards";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/display";
import { cn, formatCompact, formatMoney, formatRelative } from "@/lib/utils";
import type { PostView } from "@/services/fan/posts";

export const CONTENT_TYPE_LABELS: Record<string, string> = { photo: "Fotoğraf", video: "Video", audio: "Ses kaydı", text: "Yazı", collection: "Koleksiyon" };
export const ACCESS_SHORT: Record<string, string> = { public: "Herkese açık", followers: "Takipçilere özel", subscribers: "Üyelere özel", purchase: "Tek seferlik satın alma" };
const TIER_NAMES: Record<string, string> = { basic: "Temel", premium: "Premium", vip: "VIP" };

const TYPE_ICON = { photo: ImageIcon, video: Play, audio: Music2, text: FileText, collection: Images } as const;

export function ContentTypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = TYPE_ICON[type as keyof typeof TYPE_ICON] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}

/** Kilit nedenine göre kullanıcıya sunulacak tek eylem (sunucudaki erişim kararıyla birebir). */
export function lockAction(post: Pick<PostView, "id" | "lockReason" | "creator" | "priceMinor" | "currency" | "minPlanTier">): { label: string; href: string } | null {
  switch (post.lockReason) {
    case "purchase":
      return { label: post.priceMinor ? `${formatMoney(post.priceMinor, post.currency)} ile aç` : "Satın al", href: `/checkout?type=content&id=${post.id}` };
    case "subscribe":
      return { label: post.minPlanTier ? `${TIER_NAMES[post.minPlanTier] ?? "Üyelik"} üyelik gerekli` : "Üye ol", href: `/creators/${post.creator.username}/membership` };
    case "follow":
      return { label: "Takip ederek aç", href: `/content/${post.id}` };
    case "login":
      return { label: "Giriş yap", href: `/login?next=${encodeURIComponent(`/content/${post.id}`)}` };
    default:
      return null;
  }
}

/** Akış kartı (Takip Ettiklerim, Ana Panel). */
export function PostCard({ post, favorite, authed = true }: { post: PostView; favorite?: boolean; authed?: boolean }) {
  const action = post.locked ? lockAction(post) : null;
  return (
    <article className="hf-card p-4 sm:p-5">
      <header className="flex items-center gap-3">
        <Link href={`/creators/${post.creator.username}`} className="shrink-0" aria-label={`${post.creator.displayName} profili`}>
          <Avatar src={post.creator.avatarUrl} name={post.creator.displayName} size={42} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/creators/${post.creator.username}`} className="flex items-center gap-1 truncate text-[13px] font-extrabold hover:text-brand-600">
            {post.creator.displayName} {post.creator.verified && <Verified className="size-3.5" />}
          </Link>
          <p className="text-[10px] text-muted">
            {formatRelative(post.publishedAt)} · {ACCESS_SHORT[post.access]}
          </p>
        </div>
        {post.locked && (
          <Badge tone="pink" size="sm">
            <Lock /> Özel paylaşım
          </Badge>
        )}
        {post.isAi && (
          <Badge tone="violet" size="sm">
            AI üretimi
          </Badge>
        )}
        <FavoriteButton targetType="content" targetId={post.id} initial={Boolean(favorite)} authed={authed} tone="plain" className="size-8" />
      </header>
      <div className="mt-3.5">
        <Link href={`/content/${post.id}`} className="text-[15px] font-extrabold tracking-[-0.02em] hover:text-brand-600">
          {post.title}
        </Link>
        {post.caption && !post.locked && <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-soft">{post.caption}</p>}
      </div>
      <Link href={`/content/${post.id}`} className="relative mt-3.5 block aspect-[16/8] overflow-hidden rounded-[14px]" aria-label={`${post.title} içeriğini aç`}>
        <ContentCover src={post.coverUrl} title={post.title} type={post.type} locked={post.locked} />
        {post.locked ? (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-12 place-items-center rounded-full bg-white/85 text-brand-500 shadow">
              <Lock className="size-5" />
            </span>
          </span>
        ) : (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
            <ContentTypeIcon type={post.type} className="size-3" /> {CONTENT_TYPE_LABELS[post.type] ?? post.type}
          </span>
        )}
      </Link>
      <footer className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Heart className="size-3.5" aria-hidden /> {formatCompact(post.likes)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="size-3.5" aria-hidden /> {formatCompact(post.comments)} yorum
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-3">
          <Link href={`/chat/${post.creator.username}`} className="font-extrabold text-brand-500 hover:underline">
            AI ikiziyle sohbet et →
          </Link>
          {action ? (
            <Link href={action.href} className="rounded-full bg-brand-500 px-3.5 py-2 text-[11px] font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
              {action.label}
            </Link>
          ) : (
            <Link href={`/content/${post.id}`} className="font-extrabold text-brand-500 hover:underline">
              İçeriği görüntüle →
            </Link>
          )}
        </span>
      </footer>
    </article>
  );
}

/** Galeri kutucuğu — kilitli içerikte bulanık kapak + kilit rozeti. */
export function ContentTile({ post, favorite, big, authed = true }: { post: PostView; favorite?: boolean; big?: boolean; authed?: boolean }) {
  const action = post.locked ? lockAction(post) : null;
  return (
    <article className="hf-card group overflow-hidden transition-shadow hover:shadow-[var(--shadow-card-hover)]">
      <div className={cn("relative", big ? "aspect-[4/3]" : "aspect-[4/3.2]")}>
        <Link href={`/content/${post.id}`} className="block size-full" aria-label={`${post.title}${post.locked ? " (kilitli)" : ""}`}>
          <ContentCover src={post.coverUrl} title={post.title} type={post.type} locked={post.locked} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        </Link>
        <span className="pointer-events-none absolute left-2.5 top-2.5">
          {post.locked ? (
            <Badge tone="solid" size="sm">
              <Lock /> {post.lockReason === "sample" ? "Örnek içerik" : post.access === "purchase" ? "Satın alınabilir" : post.access === "followers" ? "Takipçilere özel" : "Üyelere özel"}
            </Badge>
          ) : (
            <Badge tone="white" size="sm">
              <ContentTypeIcon type={post.type} className="size-3" /> {CONTENT_TYPE_LABELS[post.type] ?? post.type}
            </Badge>
          )}
        </span>
        <FavoriteButton targetType="content" targetId={post.id} initial={Boolean(favorite)} authed={authed} className="absolute right-2.5 top-2.5" />
        {post.locked && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid size-11 place-items-center rounded-full bg-white/85 text-brand-500 shadow">
              <Lock className="size-5" />
            </span>
          </span>
        )}
      </div>
      <div className="p-3.5">
        <Link href={`/content/${post.id}`} className="line-clamp-1 text-[13px] font-extrabold hover:text-brand-600">
          {post.title}
        </Link>
        <p className="mt-1 text-[10px] text-muted">
          {CONTENT_TYPE_LABELS[post.type] ?? post.type} · {ACCESS_SHORT[post.access]}
          {post.isAi && " · AI üretimi"}
        </p>
        {action && (
          <Link href={action.href} className="mt-2.5 flex h-8 items-center justify-center rounded-full border border-brand-300 text-[11px] font-extrabold text-brand-600 hover:bg-brand-50">
            {action.label}
          </Link>
        )}
      </div>
    </article>
  );
}
