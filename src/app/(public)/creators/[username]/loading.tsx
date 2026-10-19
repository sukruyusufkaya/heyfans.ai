import { CardGridSkeleton } from "@/components/public/skeletons";
import { Skeleton } from "@/components/ui/display";

export default function Loading() {
  return (
    <div role="status" aria-label="Profil yükleniyor">
      <span className="sr-only">Profil yükleniyor…</span>
      <Skeleton className="h-[170px] w-full rounded-none sm:h-[230px] lg:h-[290px]" />
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="-mt-14 flex flex-col gap-5 sm:-mt-20 lg:flex-row lg:items-end">
          <Skeleton className="size-[112px] shrink-0 rounded-full border-[5px] border-white sm:size-[150px]" />
          <div className="flex-1 space-y-3 lg:pb-3">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-12 w-72 rounded-full lg:mb-3" />
        </div>
        <Skeleton className="mt-6 h-16 w-full max-w-3xl" />
        <Skeleton className="mt-8 h-12 w-full" />
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <CardGridSkeleton className="mt-8" tall={false} />
      </div>
    </div>
  );
}
