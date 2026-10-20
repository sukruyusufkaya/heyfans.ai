import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Caveat, Inter, Noto_Sans_Arabic, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { siteConfig } from "@/config/site";
import { I18nProvider } from "@/i18n/client";
import { LOCALE_META, LOCALE_PARAM, LOCALES, PATH_HEADER } from "@/i18n/config";
import { getClientMessages, getLocale, getT } from "@/i18n/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-jakarta", weight: ["600", "700", "800"], display: "swap" });
const caveat = Caveat({ subsets: ["latin", "latin-ext"], variable: "--font-caveat", weight: ["500", "700"], display: "swap" });
// Yalnız Arapça glif gerektiğinde indirilir (unicode-range); diğer dillerde yük getirmez.
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic", weight: ["400", "500", "600", "700", "800"], display: "swap", preload: false });

/** Uygulama içi, arama motoruna kapalı alanlar: hreflang alternatifi üretilmez. */
const PRIVATE_PREFIXES = ["/app", "/chat", "/studio", "/admin", "/onboarding", "/checkout", "/experiences", "/dev", "/consent", "/login/continue"];

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale, h] = await Promise.all([getT(), getLocale(), headers()]);
  const path = h.get(PATH_HEADER) ?? "/";
  const title = `${siteConfig.name} — ${t(siteConfig.tagline)}`;
  const description = t(siteConfig.description);
  const isPublic = !PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: title, template: `%s | ${siteConfig.name}` },
    description,
    applicationName: siteConfig.name,
    alternates: isPublic
      ? {
          canonical: locale === "tr" ? path : `${path}?${LOCALE_PARAM}=${locale}`,
          languages: {
            ...Object.fromEntries(LOCALES.map((l) => [l, `${path}?${LOCALE_PARAM}=${l}`])),
            "x-default": path,
          },
        }
      : undefined,
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: LOCALE_META[locale].og,
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => LOCALE_META[l].og),
      title,
      description,
    },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#ec0088",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, t] = await Promise.all([getLocale(), getT()]);
  const messages = await getClientMessages("root", locale);
  const { dir } = LOCALE_META[locale];
  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${jakarta.variable} ${caveat.variable} ${arabic.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-brand-600 focus:shadow-lg">
          {t("İçeriğe geç")}
        </a>
        <I18nProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
          <Toaster position="top-center" dir={dir} richColors closeButton toastOptions={{ style: { fontFamily: "var(--font-sans)" } }} />
        </I18nProvider>
      </body>
    </html>
  );
}
