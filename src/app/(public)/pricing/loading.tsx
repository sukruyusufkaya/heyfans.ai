import { HeroSkeleton, SectionSkeleton } from "@/components/public/skeletons";

export default function Loading() {
  return (
    <>
      <HeroSkeleton compact />
      <SectionSkeleton>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="hf-card h-96 animate-pulse bg-[#f7f3f8]" />
          ))}
        </div>
      </SectionSkeleton>
    </>
  );
}
