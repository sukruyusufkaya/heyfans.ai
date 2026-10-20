import Link from "next/link";
import { Wrench } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { getT } from "@/i18n/server";

/** Bakım ekranı. `message` yönetici tarafından yazılır ve çevrilmez; varsayılan metin isteğin dilinde gelir. */
export async function MaintenanceScreen({ message }: { message: string | null }) {
  const t = await getT();
  return (
    <main id="main" className="hf-gradient-hero grid min-h-dvh place-items-center px-4">
      <div className="hf-card max-w-md p-8 text-center">
        <Wordmark />
        <span className="mx-auto mt-6 grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-500">
          <Wrench className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-extrabold">{t("Kısa bir bakım arası")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-strong">{message || t("HEYFANS şu anda planlı bakımda. Kısa süre içinde geri döneceğiz.")}</p>
        <div className="mt-6 flex justify-center gap-4 text-xs font-bold">
          <Link href="/help" className="text-brand-600 hover:underline">
            {t("Yardım Merkezi")}
          </Link>
          <Link href="/login" className="text-muted-strong hover:underline">
            {t("Yönetici girişi")}
          </Link>
        </div>
      </div>
    </main>
  );
}
