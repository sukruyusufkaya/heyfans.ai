import type { MetadataRoute } from "next";

/** Web uygulaması bildirimi: ana ekrana ekleme simgesi ve tema rengi (logo: public/brand). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Heyfans — AI İkizi Destekli Creator Platformu",
    short_name: "Heyfans",
    description: "İçerik üreticilerinin yetkilendirilmiş AI ikizleriyle sohbet et, özel içeriklere eriş.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ec0088",
    lang: "tr",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
