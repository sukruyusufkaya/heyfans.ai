import Link from "next/link";
import { SearchX } from "lucide-react";
import { Section } from "@/components/public/marketing";
import { EmptyState } from "@/components/ui/display";

export default function CreatorNotFound() {
  return (
    <Section className="py-16">
      <div className="hf-card mx-auto max-w-xl">
        <EmptyState
          icon={<SearchX />}
          title="İçerik üreticisi bulunamadı"
          description="Aradığın profil yayında olmayabilir, taşınmış ya da kaldırılmış olabilir. Keşfet sayfasından yeni içerik üreticileri bulabilirsin."
          action={
            <Link href="/explore" className="inline-flex h-11 items-center rounded-full bg-brand-500 px-6 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
              İçerik Üreticilerini Keşfet
            </Link>
          }
        />
      </div>
    </Section>
  );
}
