import { m } from "@/i18n/m";

/** `tagline` ve `description` kaynak (Türkçe) metindir; gösterirken `t()` ile çevrilir. */
export const siteConfig = {
  name: "HEYFANS",
  tagline: m("Gerçek İçerik Üreticileri. AI İkizler. Gerçek Bağlantılar."),
  description: m(
    "HEYFANS, içerik üreticilerinin yetkilendirilmiş AI ikizleriyle hayranlarına 7/24 ulaştığı, özel içerik ve üyeliklerle gelir elde ettiği yapay zekâ destekli hayran etkileşim platformudur.",
  ),
  url: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3070",
  supportEmail: "destek@heyfans.ai",
  safetyEmail: "guvenlik@heyfans.ai",
  social: {
    instagram: "https://instagram.com/heyfans",
    x: "https://x.com/heyfans",
    tiktok: "https://tiktok.com/@heyfans",
    youtube: "https://youtube.com/@heyfans",
  },
} as const;
