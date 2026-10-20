import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye, Flag, Heart, Lock, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Verified } from "@/components/creator/creator-cards";
import { ContentCover } from "@/components/creator/creator-photo";
import { FavoriteButton, FollowButton } from "@/components/creator/social-buttons";
import { ACCESS_SHORT, CONTENT_TYPE_LABELS, ContentTypeIcon, lockAction } from "@/components/fan/content-parts";
import { ReportDialog } from "@/components/fan/report-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/display";
import { requireUser } from "@/lib/auth/session";
import { objectIdSchema } from "@/lib/validation/common";
import { getContentDetail } from "@/services/fan/posts";
import { getFormatters, getT } from "@/i18n/server";
import { m } from "@/i18n/m";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("İçerik") };
}

const LOCK_COPY: Record<string, { title: string; text: string }> = {
  purchase: { title: m("Bu içerik sana özel olabilir."), text: m("İçeriğin tamamını görüntülemek için tek seferlik satın alma ile kilidi aç.") },
  subscribe: { title: m("Bu içerik üyelere özel."), text: m("İçeriği görüntülemek için içerik üreticisinin üyelik planlarından birini seç.") },
  follow: { title: m("Bu içerik takipçilere özel."), text: m("İçerik üreticisini takip ederek bu içeriğe hemen erişebilirsin.") },
  sample: { title: m("Örnek içerik"), text: m("Bu içerik kurgusal bir örnek profile ait; örnek profillerde abonelik ve satın alma kapalıdır.") },
};

export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const { formatCompact, formatDate, formatMoney } = await getFormatters();
  if (!objectIdSchema.safeParse(id).success) notFound();
  const { user } = await requireUser(`/content/${id}`);
  const data = await getContentDetail({ id: user.id, roles: user.roles }, id);
  if (!data) notFound();
  const { post, decision, media, creator } = data;
  const action = post.locked ? lockAction(post, t, formatMoney) : null;
  const lock = post.lockReason ? LOCK_COPY[post.lockReason] : undefined;
  const isOwner = decision.allowed && decision.via === "owner";

  return (
    <div className="mx-auto max-w-[1180px]">
      <Link href={`/creators/${creator.username}/content`} className="mb-4 inline-flex items-center gap-1 text-xs font-extrabold text-muted-strong hover:text-brand-600">
        <ChevronLeft className="rtl:-scale-x-100 size-4" /> {t("{name} galerisi", { name: creator.displayName })}
      </Link>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-4">
          <Card padded={false} className="overflow-hidden">
            {post.locked ? (
              <div className="relative min-h-[380px] bg-night sm:aspect-[16/10] sm:min-h-0">
                <ContentCover src={null} title={post.title} type={post.type} locked />
                <div className="absolute inset-0 grid place-items-center p-4">
                  <div className="max-w-sm rounded-2xl bg-white/92 p-6 text-center shadow-xl backdrop-blur">
                    <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-100 text-brand-500">
                      <Lock className="size-5" />
                    </span>
                    <p className="mt-3 text-[15px] font-black tracking-[-0.02em]">{lock ? t(lock.title) : t("Bu içerik şu anda görüntülenemiyor.")}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-strong">{lock ? t(lock.text) : null}</p>
                    {post.lockReason === "follow" ? (
                      <div className="mt-4 flex justify-center">
                        <FollowButton creatorId={creator.id} initial={data.following} authed size="lg" />
                      </div>
                    ) : action ? (
                      <Link href={action.href} className="mt-4 inline-flex h-11 items-center rounded-full bg-brand-500 px-6 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                        {action.label}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : media.length ? (
              <div className="grid gap-px bg-line">
                {media.map((m) => (
                  <div key={m.id} className="bg-night">
                    {m.kind === "image" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt={post.title} className="mx-auto max-h-[78vh] w-auto max-w-full object-contain" loading="lazy" />
                    )}
                    {m.kind === "video" && <video src={m.url} controls playsInline preload="metadata" className="mx-auto max-h-[78vh] w-full" aria-label={post.title} />}
                    {m.kind === "audio" && (
                      <div className="bg-white p-6">
                        <audio src={m.url} controls preload="metadata" className="w-full" aria-label={post.title} />
                      </div>
                    )}
                    {m.kind === "document" && (
                      <a href={m.url} className="block bg-white p-6 text-sm font-extrabold text-brand-600 hover:underline">
                        {t("Dosyayı aç")}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative aspect-[16/8]">
                <ContentCover src={post.coverUrl} title={post.title} type={post.type} />
                <span className="absolute start-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur">
                  <ContentTypeIcon type={post.type} className="size-3.5" /> {t(CONTENT_TYPE_LABELS[post.type] ?? post.type)}
                </span>
              </div>
            )}
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow mb-1.5">{post.locked ? t("Yalnızca senin için") : t(CONTENT_TYPE_LABELS[post.type] ?? post.type)}</p>
                  <h1 className="text-[22px] font-black leading-tight tracking-[-0.035em] sm:text-[26px]">{post.title}</h1>
                  <p className="mt-1.5 text-xs text-muted">
                    {t(CONTENT_TYPE_LABELS[post.type] ?? post.type)}
                    {post.mediaCount > 1 ? <> · {t("{count} dosya", { count: post.mediaCount })}</> : null} · {t(ACCESS_SHORT[post.access] ?? post.access)} {post.publishedAt ? `· ${formatDate(post.publishedAt)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {post.isAi && (
                    <Badge tone="violet" size="md">
                      <Sparkles /> {t("AI üretimi")}
                    </Badge>
                  )}
                  {post.locked && (
                    <Badge tone="pink" size="md">
                      {t(ACCESS_SHORT[post.access] ?? post.access)}
                    </Badge>
                  )}
                  <FavoriteButton targetType="content" targetId={post.id} initial={data.favorite} authed tone="plain" className="size-9 border border-line" />
                </div>
              </div>
              {!post.locked && data.caption && <p className="mt-4 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">{data.caption}</p>}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4 text-[11px] text-muted">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <Heart className="size-3.5" aria-hidden /> {t("{count} beğeni", { count: formatCompact(data.stats?.likes) })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="size-3.5" aria-hidden /> {t("{count} yorum", { count: formatCompact(data.stats?.comments) })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Eye className="size-3.5" aria-hidden /> {t("{count} görüntülenme", { count: formatCompact(data.stats?.views) })}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-success">
                    <ShieldCheck className="size-3.5" aria-hidden /> {t("Güvenli erişim")}
                  </span>
                </div>
                {!isOwner && (
                  <ReportDialog
                    targetType="content"
                    targetId={post.id}
                    title={t("İçeriği bildir")}
                    reasons={["copyright", "sexual_content", "minor_safety", "harassment", "hate", "privacy", "spam", "other"]}
                    trigger={
                      <button type="button" className="inline-flex items-center gap-1.5 font-bold hover:text-danger">
                        <Flag className="size-3.5" /> {t("Bildir")}
                      </button>
                    }
                  />
                )}
              </div>
            </div>
          </Card>
        </div>

        <aside className="grid content-start gap-4" aria-label={t("İçerik üreticisi ve erişim")}>
          <Card>
            <div className="flex items-center gap-3">
              <Link href={`/creators/${creator.username}`} aria-label={t("{name} profili", { name: creator.displayName })}>
                <Avatar src={creator.avatarUrl} name={creator.displayName} size={52} />
              </Link>
              <div className="min-w-0">
                <Link href={`/creators/${creator.username}`} className="flex items-center gap-1 truncate text-sm font-extrabold hover:text-brand-600">
                  {creator.displayName} {creator.verified && <Verified />}
                </Link>
                <p className="text-[11px] text-muted">{creator.verified ? t("Doğrulanmış içerik üreticisi") : t("İçerik üreticisi")}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {!isOwner && <FollowButton creatorId={creator.id} initial={data.following} authed size="sm" />}
              <Button asChild variant="outline" size="sm" shape="pill">
                <Link href={`/chat/${creator.username}`}>
                  <MessageCircle /> {t("AI ikiziyle sohbet")}
                </Link>
              </Button>
            </div>
          </Card>

          {post.locked && post.lockReason === "purchase" && (
            <Card>
              <p className="eyebrow">{t("TEK SEFERLİK ERİŞİM")}</p>
              <p className="mt-2 text-[28px] font-black tracking-[-0.04em]">{formatMoney(post.priceMinor, post.currency)}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{t("Satın aldığın içerik hesabına tanımlanır ve erişim koşullarına göre görüntülenir.")}</p>
              {action && (
                <Link href={action.href} className="mt-4 flex h-11 items-center justify-center rounded-full bg-brand-500 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                  {t("İçeriğin kilidini aç")}
                </Link>
              )}
            </Card>
          )}

          {!isOwner && !post.creator.isSample && (
            <Card>
              <p className="text-sm font-extrabold">{t("Üyelikle daha fazlasını aç")}</p>
              <ul className="mt-3 grid gap-2 text-xs text-ink-soft">
                {[m("Premium içerik koleksiyonları"), m("AI ikiziyle kişiselleştirilmiş sohbet"), m("Öncelikli içerik erişimi")].map((perk) => (
                  <li key={perk} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-brand-500" aria-hidden /> {t(perk)}
                  </li>
                ))}
              </ul>
              <Link href={`/creators/${creator.username}/membership`} className="mt-4 flex h-10 items-center justify-center rounded-full border border-brand-300 text-xs font-extrabold text-brand-600 hover:bg-brand-50">
                {t("Üyelik seçeneklerini gör")}
              </Link>
            </Card>
          )}

          <Card className="hf-gradient-pink">
            <p className="flex items-center gap-2 text-sm font-extrabold">
              <ShieldCheck className="size-4 text-brand-500" aria-hidden /> {t("Güvenli ödeme ve erişim")}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-strong">{t("İçeriğe erişim, içerik üreticisinin izinleri ve HEYFANS kullanım kuralları kapsamında sağlanır.")}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
