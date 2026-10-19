import { Skeleton } from "@/components/ui/display";

/** Admin sayfaları için ortak iskelet: başlık + KPI satırı + iki panel. */
export function AdminLoading({ kpis = 4, panels = 2 }: { kpis?: number; panels?: number }) {
  return (
    <div className="mx-auto w-full max-w-[1480px]" aria-busy="true" aria-label="Yükleniyor">
      <div className="mb-5 grid gap-2.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <div className="grid gap-5">
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: kpis }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] rounded-[var(--radius-card)]" />
          ))}
        </div>
        <div className={panels > 1 ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]" : "grid gap-5"}>
          {Array.from({ length: panels }).map((_, i) => (
            <Skeleton key={i} className="h-[380px] rounded-[var(--radius-card)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
