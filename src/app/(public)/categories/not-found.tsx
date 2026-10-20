import Link from "next/link";
import { SearchX } from "lucide-react";
import { Section } from "@/components/public/marketing";
import { EmptyState } from "@/components/ui/display";
import { getT } from "@/i18n/server";

export default async function CategoryNotFound() {
  const t = await getT();
  return (
    <Section className="py-16">
      <div className="hf-card mx-auto max-w-xl">
        <EmptyState
          icon={<SearchX />}
          title={t("Kategori bulunamadı")}
          description={t("Aradığın kategori kaldırılmış ya da adı değişmiş olabilir. Tüm kategorilere göz atabilirsin.")}
          action={
            <Link href="/categories" className="inline-flex h-11 items-center rounded-full bg-brand-500 px-6 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
              {t("Tüm Kategoriler")}
            </Link>
          }
        />
      </div>
    </Section>
  );
}
