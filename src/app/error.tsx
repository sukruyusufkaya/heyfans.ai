"use client";
import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

/** Kök hata sınırı: kök layout ayakta kalır (dil sağlayıcısı dahil); alan sınırlarının (fan/studio/admin/auth) yakalamadığı hatalar buraya düşer. */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error("[app:error]", error);
  }, [error]);
  return (
    <main id="main" className="hf-gradient-hero grid min-h-dvh place-items-center px-4">
      <div className="hf-card max-w-md p-8 text-center">
        <Wordmark />
        <span className="mx-auto mt-6 grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-500">
          <AlertTriangle className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-extrabold">{t("Bu sayfa yüklenirken bir sorun oluştu")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-strong">
          {error.digest
            ? t("Lütfen tekrar dene. Sorun devam ederse destek ekibimize ulaş. (Hata kodu: {code})", { code: error.digest })
            : t("Lütfen tekrar dene. Sorun devam ederse destek ekibimize ulaş.")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Button onClick={reset} shape="pill">
            {t("Tekrar dene")}
          </Button>
          <Button asChild variant="secondary" shape="pill">
            <Link href="/">{t("Ana sayfaya dön")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
