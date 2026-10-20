"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, CreditCard, Crown, FileImage, Flag, Gift, MessageCircle, Sparkles, Trash2, UserPlus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteNotificationAction, markNotificationsReadAction } from "@/features/fan/actions";
import { useFormatters, useT } from "@/i18n/client";
import { m } from "@/i18n/m";
import { cn } from "@/lib/utils";

/** `title` ve `body` sunucuda okuyanın diline çevrilmiş olarak gelir (bildirim kalıbı + params). */
export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  message: MessageCircle,
  new_content: FileImage,
  subscription: Crown,
  payment: CreditCard,
  gift: Gift,
  custom_request: Sparkles,
  moderation: Flag,
  system: Bell,
  follow: UserPlus,
  payout: Wallet,
};

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  message: m("Sohbet"),
  new_content: m("İçerik"),
  subscription: m("Üyelik"),
  payment: m("Ödeme"),
  gift: m("Hediye"),
  custom_request: m("Özel talep"),
  moderation: m("Güvenlik"),
  system: m("Sistem"),
  follow: m("Takip"),
  payout: m("Ödeme talebi"),
  twin_review: m("AI ikizi"),
  creator_review: m("Başvuru"),
};

/** İç bağlantı güvenliği: yalnız uygulama içi (/ ile başlayan, // olmayan) adreslere yönlendirilir. */
function safeLink(link: string | null) {
  return link && link.startsWith("/") && !link.startsWith("//") ? link : null;
}

export function MarkAllReadButton({ unread }: { unread: number }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      variant="soft"
      size="sm"
      shape="pill"
      disabled={unread === 0}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        const res = await markNotificationsReadAction();
        setBusy(false);
        if (res.ok) {
          toast.success(res.data.updated ? t("{count} bildirim okundu olarak işaretlendi.", { count: res.data.updated }) : t("Okunmamış bildirim yok."));
          router.refresh();
        } else toast.error(res.error);
      }}
    >
      <CheckCheck /> {t("Tümünü okundu işaretle")}
    </Button>
  );
}

export function NotificationRow({ n }: { n: NotificationView }) {
  const t = useT();
  const { formatRelative } = useFormatters();
  const router = useRouter();
  const [read, setRead] = React.useState(n.read);
  const [gone, setGone] = React.useState(false);
  const Icon = ICONS[n.type] ?? Bell;
  const href = safeLink(n.link);

  async function markRead() {
    if (read) return;
    setRead(true);
    const res = await markNotificationsReadAction([n.id]);
    if (!res.ok) {
      setRead(false);
      toast.error(res.error);
    } else router.refresh();
  }

  async function remove() {
    setGone(true);
    const res = await deleteNotificationAction(n.id);
    if (!res.ok) {
      setGone(false);
      toast.error(res.error);
    } else router.refresh();
  }

  if (gone) return null;
  const body = (
    <>
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", read ? "bg-soft text-muted-strong" : "bg-brand-100 text-brand-500")}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[13px] leading-snug", read ? "font-bold text-ink-soft" : "font-extrabold text-ink")}>{n.title}</span>
        {n.body && <span className="mt-0.5 block text-xs leading-relaxed text-muted-strong">{n.body}</span>}
        <span className="mt-1 block text-[10px] text-muted">
          {t(NOTIFICATION_TYPE_LABELS[n.type] ?? m("Bildirim"))} · {formatRelative(n.createdAt)}
        </span>
      </span>
    </>
  );
  return (
    <li className={cn("group flex items-center gap-2 rounded-2xl border p-3 transition-colors", read ? "border-line-soft bg-white" : "border-brand-200 bg-brand-50/60")}>
      {href ? (
        <Link href={href} onClick={markRead} className="flex min-w-0 flex-1 items-center gap-3.5">
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3.5">{body}</div>
      )}
      {!read && <span className="size-2 shrink-0 rounded-full bg-brand-500" role="img" aria-label={t("Okunmadı")} />}
      <div className="flex shrink-0 items-center gap-0.5">
        {!read && (
          <button type="button" onClick={markRead} aria-label={t("Okundu olarak işaretle")} title={t("Okundu olarak işaretle")} className="grid size-8 place-items-center rounded-full text-muted hover:bg-white hover:text-brand-600">
            <CheckCheck className="size-4" />
          </button>
        )}
        <button type="button" onClick={remove} aria-label={t("Bildirimi sil")} title={t("Bildirimi sil")} className="grid size-8 place-items-center rounded-full text-muted hover:bg-white hover:text-danger">
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}
