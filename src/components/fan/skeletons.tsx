"use client";
import { Skeleton } from "@/components/ui/display";
import { useT } from "@/i18n/client";

/** Hayran sayfaları için ortak yükleme iskeleti: başlık + istenen düzen. */
export function PageSkeleton({ variant = "cards" }: { variant?: "cards" | "list" | "split" }) {
  const t = useT();
  return (
    <div className="mx-auto max-w-[1320px]" role="status" aria-live="polite" aria-label={t("Yükleniyor")}>
      <div className="mb-6 space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      {variant === "cards" && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-[16px]" />
          ))}
        </div>
      )}
      {variant === "list" && (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-[16px]" />
          ))}
        </div>
      )}
      {variant === "split" && (
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Skeleton className="h-[480px] rounded-[16px]" />
          <Skeleton className="h-[480px] rounded-[16px]" />
        </div>
      )}
      <span className="sr-only">{t("Yükleniyor…")}</span>
    </div>
  );
}
