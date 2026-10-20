"use client";
import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toggleFavoriteAction, toggleFollowAction } from "@/features/social/actions";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** Takip düğmesi — iyimser güncelleme; oturum yoksa girişe yönlendirir. */
export function FollowButton({
  creatorId,
  initial,
  authed,
  size = "md",
  className,
  variant,
}: {
  creatorId: string;
  initial: boolean;
  authed: boolean;
  size?: ButtonProps["size"];
  className?: string;
  variant?: ButtonProps["variant"];
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [following, setFollowing] = useOptimistic(initial);
  return (
    <Button
      size={size}
      shape="pill"
      variant={variant ?? (following ? "outline" : "primary")}
      className={className}
      aria-pressed={following}
      disabled={pending}
      onClick={() => {
        if (!authed) return router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        start(async () => {
          setFollowing(!following);
          const res = await toggleFollowAction(creatorId, !following);
          if (!res.ok) toast.error(res.error);
          else router.refresh();
        });
      }}
    >
      {following ? <Check /> : <Plus />}
      {following ? t("Takip ediliyor") : t("Takip Et")}
    </Button>
  );
}

export function FavoriteButton({
  targetId,
  targetType = "creator",
  initial,
  authed,
  className,
  tone = "glass",
}: {
  targetId: string;
  targetType?: "creator" | "content" | "twin";
  initial: boolean;
  authed: boolean;
  className?: string;
  tone?: "glass" | "plain";
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [fav, setFav] = useOptimistic(initial);
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={fav}
      aria-label={fav ? t("Favorilerden çıkar") : t("Favorilere ekle")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!authed) return router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        start(async () => {
          setFav(!fav);
          const res = await toggleFavoriteAction(targetType, targetId, !fav);
          if (!res.ok) toast.error(res.error);
          else router.refresh();
        });
      }}
      className={cn(
        "grid size-8 place-items-center rounded-full transition-transform active:scale-90",
        tone === "glass" ? "bg-white/75 text-brand-500 backdrop-blur hover:bg-white" : "text-brand-500 hover:bg-brand-50",
        className,
      )}
    >
      <Heart className={cn("size-4", fav && "fill-current")} />
    </button>
  );
}
