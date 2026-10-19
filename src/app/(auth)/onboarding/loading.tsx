import { Skeleton } from "@/components/ui/display";

export default function AuthLoading() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-[42px] lg:py-8" aria-busy="true" aria-label="Sayfa yükleniyor">
      <div className="grid gap-7 lg:grid-cols-2">
        <Skeleton className="hidden h-[794px] rounded-[28px] lg:block" />
        <div className="rounded-[28px] border border-line bg-white p-8 sm:p-12">
          <div className="mx-auto max-w-[430px] space-y-5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-[52px] w-full" />
            <Skeleton className="h-[52px] w-full" />
            <Skeleton className="h-[54px] w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
