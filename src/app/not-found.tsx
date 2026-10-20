import Link from "next/link";
import { SearchX } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { getT } from "@/i18n/server";

/** Kök 404: kapsam dışı (grup dışı) adresler için; isteğin dilinde gelir. */
export default async function NotFound() {
  const t = await getT();
  return (
    <main id="main" className="hf-gradient-hero grid min-h-dvh place-items-center px-4">
      <div className="hf-card max-w-md p-8 text-center">
        <Wordmark />
        <span className="mx-auto mt-6 grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-500">
          <SearchX className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-extrabold">{t("Aradığın sayfa bulunamadı")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-strong">{t("Bağlantı hatalı olabilir ya da içerik artık yayında değil.")}</p>
        <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
          {t("Ana sayfaya dön")}
        </Link>
      </div>
    </main>
  );
}
