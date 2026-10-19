import { Skeleton } from "@/components/ui/display";

function Head({ actions }: { actions?: boolean }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4" aria-hidden>
      <div className="grid gap-2.5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      {actions && <Skeleton className="h-10 w-40 rounded-[10px]" />}
    </div>
  );
}

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto max-w-[1280px]" role="status" aria-busy="true" aria-label="Sayfa yükleniyor">
    {children}
    <span className="sr-only">Yükleniyor…</span>
  </div>
);

/** KPI satırı + iki içerik kartı (panel, gelirler, analitik, hayranlar). */
export function LoadingCards() {
  return (
    <Wrap>
      <Head actions />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-2xl" />
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.8fr_1fr]">
        <Skeleton className="h-[360px] rounded-2xl" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-60 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    </Wrap>
  );
}

/** Filtre çubuğu + tablo (kütüphane, talepler, sohbetler, ledger). */
export function LoadingTable() {
  return (
    <Wrap>
      <Head actions />
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-[10px]" />
        ))}
      </div>
      <Skeleton className="h-[420px] rounded-2xl" />
    </Wrap>
  );
}

/** Form + yan önizleme (kişilik, profil, içerik formu, ayarlar). */
export function LoadingForm() {
  return (
    <Wrap>
      <Head actions />
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-5">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    </Wrap>
  );
}

/** Üç sütunlu yönetim görünümü (AI ikizi, ses, sınırlar). */
export function LoadingColumns() {
  return (
    <Wrap>
      <Head actions />
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-[460px] rounded-2xl" />
        <Skeleton className="h-[460px] rounded-2xl" />
        <Skeleton className="h-[460px] rounded-2xl" />
      </div>
    </Wrap>
  );
}
