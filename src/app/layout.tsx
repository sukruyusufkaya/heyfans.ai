import type { Metadata, Viewport } from "next";
import { Caveat, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { siteConfig } from "@/config/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-jakarta", weight: ["600", "700", "800"], display: "swap" });
const caveat = Caveat({ subsets: ["latin", "latin-ext"], variable: "--font-caveat", weight: ["500", "700"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — ${siteConfig.tagline}`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "tr_TR",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ec0088",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} ${jakarta.variable} ${caveat.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-brand-600 focus:shadow-lg">
          İçeriğe geç
        </a>
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: "var(--font-inter)" } }} />
      </body>
    </html>
  );
}
