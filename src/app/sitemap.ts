import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { LOCALE_PARAM, LOCALES } from "@/i18n/config";
import { allHelpSlugs } from "@/services/support/help";
import { sitemapEntities } from "@/services/public/sitemap";

// Veritabanı çalışma zamanında okunur; derleme sırasında statik üretilmez.
export const dynamic = "force-dynamic";

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/explore", priority: 0.9, changeFrequency: "daily" },
  { path: "/trending", priority: 0.8, changeFrequency: "daily" },
  { path: "/categories", priority: 0.8, changeFrequency: "weekly" },
  { path: "/how-it-works", priority: 0.7, changeFrequency: "monthly" },
  { path: "/for-creators", priority: 0.8, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.8, changeFrequency: "weekly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/help", priority: 0.6, changeFrequency: "weekly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
];

type Entry = MetadataRoute.Sitemap[number];

/** Her dil için `?lang=<kod>` alternatifi; `x-default` düz (Türkçe) adrestir (layout.tsx ile aynı şema). */
function withAlternates(url: string, rest: Omit<Entry, "url" | "alternates">): Entry {
  const languages: Record<string, string> = Object.fromEntries(
    LOCALES.map((l) => {
      const u = new URL(url);
      u.searchParams.set(LOCALE_PARAM, l);
      return [l, u.toString()];
    }),
  );
  languages["x-default"] = url;
  return { url, ...rest, alternates: { languages } };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => withAlternates(`${base}${r.path}`, { lastModified: now, changeFrequency: r.changeFrequency, priority: r.priority }));
  try {
    const [{ creators, categories, legal }, help] = await Promise.all([sitemapEntities(), allHelpSlugs()]);
    for (const c of creators) entries.push(withAlternates(`${base}/creators/${c.username}`, { lastModified: c.updatedAt, changeFrequency: "weekly", priority: 0.7 }));
    for (const c of categories) entries.push(withAlternates(`${base}/categories/${c.slug}`, { lastModified: c.updatedAt, changeFrequency: "weekly", priority: 0.6 }));
    for (const h of help) entries.push(withAlternates(`${base}/help/${h.slug}`, { lastModified: h.updatedAt, changeFrequency: "monthly", priority: 0.5 }));
    for (const l of legal) entries.push(withAlternates(`${base}/${l.slug}`, { lastModified: l.updatedAt, changeFrequency: "yearly", priority: 0.4 }));
  } catch (err) {
    // Veritabanına ulaşılamazsa statik rotalar yine de yayınlanır
    console.error("[sitemap]", err);
  }
  return entries;
}
