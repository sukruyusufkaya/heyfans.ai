import { Skeleton } from "@/components/ui/display";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

/** Hero iskeleti (başlık + açıklama + düğme) — public sayfaların loading.tsx dosyaları kullanır. */
export function HeroSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="hf-gradient-hero border-b border-[#fbe3f1]" aria-hidden>
      <div className={cn("mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8", compact ? "py-10" : "py-12 lg:py-16")}>
        <Skeleton className="mb-5 h-7 w-56 rounded-full" />
        <Skeleton className="h-12 w-full max-w-xl" />
        <Skeleton className="mt-3 h-12 w-full max-w-md" />
        <Skeleton className="mt-6 h-5 w-full max-w-lg" />
        <Skeleton className="mt-8 h-12 w-48 rounded-full" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6, className, tall = true }: { count?: number; className?: string; tall?: boolean }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="hf-card overflow-hidden">
          <Skeleton className={cn("w-full rounded-none", tall ? "aspect-[4/3]" : "aspect-[16/10]")} />
          <div className="space-y-2 p-3.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-9 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export async function SectionSkeleton({ rows = 1, children }: { rows?: number; children?: React.ReactNode }) {
  const t = await getT();
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8" role="status" aria-label={t("Yükleniyor")}>
      <span className="sr-only">{t("Yükleniyor…")}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="mb-10">
          <Skeleton className="mb-4 h-7 w-64" />
          {children ?? <CardGridSkeleton />}
        </div>
      ))}
    </div>
  );
}
