import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from "./config";

/**
 * Ülke → o ülkede konuşulan desteklenen diller (öncelik sırasıyla).
 * Çok dilli ülkelerde tarayıcı dili listedeki dillerden biriyse o seçilir; değilse ilk dil.
 * Listede olmayan ülkeler İngilizce görür.
 */
const COUNTRY_LANGUAGES: Record<string, Locale[]> = {
  TR: ["tr"],
  // Almanca
  DE: ["de"], AT: ["de"], LI: ["de"], CH: ["de", "fr"], LU: ["fr", "de"],
  // Fransızca
  FR: ["fr"], MC: ["fr"], BE: ["fr", "en"], SN: ["fr"], CI: ["fr"], CM: ["fr", "en"], ML: ["fr"], BF: ["fr"], NE: ["fr"], TD: ["fr", "ar"], GN: ["fr"],
  BJ: ["fr"], TG: ["fr"], CD: ["fr"], CG: ["fr"], GA: ["fr"], MG: ["fr"], HT: ["fr"], BI: ["fr"], CF: ["fr"], RE: ["fr"], GP: ["fr"], MQ: ["fr"],
  GF: ["fr"], NC: ["fr"], PF: ["fr"], YT: ["fr"],
  // İspanyolca
  ES: ["es"], MX: ["es"], AR: ["es"], CO: ["es"], PE: ["es"], VE: ["es"], CL: ["es"], EC: ["es"], GT: ["es"], CU: ["es"], BO: ["es"], DO: ["es"],
  HN: ["es"], PY: ["es"], SV: ["es"], NI: ["es"], CR: ["es"], PA: ["es"], UY: ["es"], PR: ["es", "en"], GQ: ["es"],
  // Portekizce
  PT: ["pt"], BR: ["pt"], AO: ["pt"], MZ: ["pt"], CV: ["pt"], GW: ["pt"], ST: ["pt"], TL: ["pt"],
  // Arapça
  SA: ["ar"], AE: ["ar"], EG: ["ar"], IQ: ["ar"], JO: ["ar"], KW: ["ar"], LB: ["ar", "fr", "en"], LY: ["ar"], MA: ["ar", "fr"], OM: ["ar"], QA: ["ar"],
  SY: ["ar"], TN: ["ar", "fr"], YE: ["ar"], BH: ["ar"], DZ: ["ar", "fr"], SD: ["ar"], PS: ["ar"], MR: ["ar", "fr"], DJ: ["ar", "fr"], KM: ["ar", "fr"],
  SO: ["ar", "en"],
  // İngilizce ağırlıklı ama ikinci dili desteklenen
  US: ["en", "es"], CA: ["en", "fr"],
};

/** Ülke koduna göre dil; tarayıcı dili çok dilli ülkelerde seçimi belirler. */
export function localeForCountry(country: string | null | undefined, acceptLanguage?: string | null): Locale | null {
  const code = country?.trim().toUpperCase();
  if (!code || code === "XX" || code.length !== 2) return null;
  const candidates = COUNTRY_LANGUAGES[code] ?? ["en"];
  if (candidates.length > 1) {
    const preferred = negotiateAcceptLanguage(acceptLanguage, candidates);
    if (preferred) return preferred;
  }
  return candidates[0] ?? "en";
}

/** `Accept-Language` başlığından (q ağırlıklarıyla) desteklenen ilk dil. */
export function negotiateAcceptLanguage(header: string | null | undefined, allowed: readonly Locale[] = LOCALES): Locale | null {
  if (!header) return null;
  const ranges = header
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: (tag ?? "").trim().toLowerCase(), q: q ? Number(q.slice(2)) || 0 : 1, i };
    })
    .filter((r) => r.tag && r.tag !== "*" && r.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const r of ranges) {
    const base = r.tag.split("-")[0];
    if (isLocale(base) && allowed.includes(base)) return base;
  }
  return null;
}

export type LocaleSource = "param" | "cookie" | "user" | "country" | "browser" | "default";

/**
 * Dil seçim sırası: açık parametre (`?lang=`) → kullanıcının seçimi (çerez) → hesap dili → konum (IP ülkesi) → tarayıcı dili → varsayılan.
 * Kullanıcı dil seçiciyle değiştirdiğinde çerez + hesap dili güncellenir; konum yalnız seçim yokken belirleyicidir.
 */
export function resolveLocale(input: {
  param?: string | null;
  cookie?: string | null;
  user?: string | null;
  country?: string | null;
  acceptLanguage?: string | null;
}): { locale: Locale; source: LocaleSource } {
  if (isLocale(input.param)) return { locale: input.param, source: "param" };
  if (isLocale(input.cookie)) return { locale: input.cookie, source: "cookie" };
  if (isLocale(input.user)) return { locale: input.user, source: "user" };
  const byCountry = localeForCountry(input.country, input.acceptLanguage);
  if (byCountry) return { locale: byCountry, source: "country" };
  const byBrowser = negotiateAcceptLanguage(input.acceptLanguage);
  if (byBrowser) return { locale: byBrowser, source: "browser" };
  return { locale: DEFAULT_LOCALE, source: "default" };
}

/** Vercel'in IP'den çözdüğü ülke başlığı (yerelde yoktur). */
export const COUNTRY_HEADER = "x-vercel-ip-country";
