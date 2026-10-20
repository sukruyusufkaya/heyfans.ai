import type { MetadataRoute } from "next";
import { LOCALE_META } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";

/** Web uygulaması bildirimi: ana ekrana ekleme simgesi ve tema rengi (logo: public/brand). Ad ve açıklama isteğin dilinde gelir. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return {
    name: t("Heyfans — AI İkizi Destekli Creator Platformu"),
    short_name: "Heyfans", // i18n-ignore (marka)
    description: t("İçerik üreticilerinin yetkilendirilmiş AI ikizleriyle sohbet et, özel içeriklere eriş."),
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ec0088",
    lang: locale,
    dir: LOCALE_META[locale].dir,
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
