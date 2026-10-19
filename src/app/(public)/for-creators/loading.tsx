import { HeroSkeleton, SectionSkeleton } from "@/components/public/skeletons";

export default function Loading() {
  return (
    <>
      <HeroSkeleton />
      <SectionSkeleton rows={2} />
    </>
  );
}
