"use client";
import { useEffect } from "react";
import { LOCALE_META, SOURCE_LOCALE } from "@/i18n/config";
import { useT } from "@/i18n/client";
import "./globals.css";

/**
 * Kök layout'un kendisi çöktüğünde devreye girer ve kendi <html>/<body> öğesini çizer.
 * Dil bağlamı (I18nProvider) bu noktada yoktur: yön ve dil güvenli varsayılandır (kaynak dil), metinler `useT()` varsayılanıyla Türkçe gelir.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error("[global:error]", error);
  }, [error]);
  return (
    <html lang={SOURCE_LOCALE} dir={LOCALE_META[SOURCE_LOCALE].dir}>
      <body>
        <main id="main" className="hf-gradient-hero grid min-h-dvh place-items-center px-4">
          <div className="hf-card max-w-md p-8 text-center">
            {/* i18n-ignore (marka) */}
            <p className="text-lg font-black tracking-tight text-brand-500">HEYFANS</p>
            <h1 className="mt-4 text-xl font-extrabold">{t("Bu sayfa yüklenirken bir sorun oluştu")}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-strong">
              {error.digest
                ? t("Lütfen tekrar dene. Sorun devam ederse destek ekibimize ulaş. (Hata kodu: {code})", { code: error.digest })
                : t("Lütfen tekrar dene. Sorun devam ederse destek ekibimize ulaş.")}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600"
            >
              {t("Tekrar dene")}
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
