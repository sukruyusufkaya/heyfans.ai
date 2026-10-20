import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { isLocale, LOCALE_COOKIE, LOCALE_HEADER, LOCALE_META, LOCALE_PARAM, LOCALE_SOURCE_HEADER, LOCALES, SOURCE_LOCALE, type Locale } from "./config";
import { COUNTRY_HEADER, resolveLocale, type LocaleSource } from "./resolve";
import { createTranslator, type Catalog, type Translator } from "./translate";
import { createFormatters, type Formatters } from "./formatters";
import { CATALOG_LOADERS } from "./generated/loaders";
import AREAS from "./generated/areas.json";

export type ClientArea = keyof typeof AREAS;
const SESSION_COOKIES = ["hf.session_token", "__Secure-hf.session_token"];

const catalogs = new Map<Locale, Promise<Catalog>>();

/** Dilin tam kataloğu (tüm parçalar birleşik). Türkçe kaynak dil olduğu için boştur. */
export function getCatalog(locale: Locale): Promise<Catalog> {
  if (locale === SOURCE_LOCALE) return Promise.resolve({});
  let p = catalogs.get(locale);
  if (!p) {
    const load = CATALOG_LOADERS[locale as Exclude<Locale, "tr">];
    p = (load ? load() : Promise.resolve([])).then((parts) => Object.freeze(Object.assign({}, ...parts)) as Catalog);
    p.catch(() => catalogs.delete(locale));
    catalogs.set(locale, p);
  }
  return p;
}

const warned = new Set<string>();
/** Yalnız katalogda olup çevirisi boş anahtarlar uyarılır; katalogda hiç olmayan metin dinamik içeriktir (kullanıcı/DB metni). */
const missingIn = (catalog: Catalog) =>
  process.env.NODE_ENV === "development"
    ? (source: string) => {
        if (!Object.prototype.hasOwnProperty.call(catalog, source)) return;
        if (warned.has(source) || warned.size > 500) return;
        warned.add(source);
        console.warn(`[i18n] çeviri eksik: ${JSON.stringify(source.slice(0, 80))}`);
      }
    : undefined;

async function sessionLocale(): Promise<Locale | null> {
  const jar = await cookies();
  if (!SESSION_COOKIES.some((c) => jar.has(c))) return null;
  // Döngüsel bağımlılığı önlemek için geç yüklenir (session → auth → e-posta → i18n).
  const { getSession } = await import("@/lib/auth/session");
  const s = await getSession().catch(() => null);
  return s?.user.locale ?? null;
}

/**
 * İsteğin dili. Proxy açık seçimi (?lang, çerez) ve konum/tarayıcı tahminini başlıkla taşır;
 * açık seçim yoksa oturum açmış kullanıcının hesap dili tahminin önüne geçer.
 * İstek dışında (betik, test) kaynak dil döner.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const h = await headers();
    const fromProxy = h.get(LOCALE_HEADER);
    const source = h.get(LOCALE_SOURCE_HEADER) as LocaleSource | null;
    if (isLocale(fromProxy) && (source === "param" || source === "cookie")) return fromProxy;
    const user = await sessionLocale();
    if (user) return user;
    if (isLocale(fromProxy)) return fromProxy;
    const jar = await cookies();
    return resolveLocale({ cookie: jar.get(LOCALE_COOKIE)?.value, country: h.get(COUNTRY_HEADER), acceptLanguage: h.get("accept-language") }).locale;
  } catch (err) {
    // Next'in dinamik oluşturma sinyallerini yutma (yutulursa sayfa derleme anında Türkçe olarak sabitlenir).
    unstable_rethrow(err);
    return SOURCE_LOCALE;
  }
});

/** İsteğin dilinde çevirmen. Sunucu bileşenleri, server action'lar ve servisler için. */
export const getT = cache(async (): Promise<Translator> => {
  const locale = await getLocale();
  const catalog = await getCatalog(locale);
  return createTranslator(locale, catalog, missingIn(catalog));
});

/** Belirli bir dilde çevirmen (başka kullanıcıya giden e-posta/bildirim, AI istemi vb.). */
export async function getTranslatorFor(locale: Locale | null | undefined): Promise<Translator> {
  const l = isLocale(locale) ? locale : SOURCE_LOCALE;
  const catalog = await getCatalog(l);
  return createTranslator(l, catalog, missingIn(catalog));
}

/** İsteğin dilinde sayı/para/tarih biçimlendiricileri. */
export const getFormatters = cache(async (): Promise<Formatters> => createFormatters(await getLocale()));

export async function getDirection() {
  return LOCALE_META[await getLocale()].dir;
}

const picked = new Map<string, Catalog>();

/** İstemci bileşenlerine gidecek alt katalog: yalnız o bölgenin istemci kodunda geçen metinler (npm run i18n:extract üretir). */
export async function getClientMessages(area: ClientArea, locale?: Locale): Promise<Catalog> {
  const l = locale ?? (await getLocale());
  if (l === SOURCE_LOCALE) return {};
  const key = `${l}:${area}`;
  const hit = picked.get(key);
  if (hit) return hit;
  const full = await getCatalog(l);
  const out: Record<string, string> = {};
  for (const s of (AREAS as Record<string, string[]>)[area] ?? []) {
    const v = full[s];
    if (v) out[s] = v;
  }
  picked.set(key, out);
  return out;
}

/**
 * Arama motorları için dil alternatifleri (metadata `alternates`): bu dilin canonical adresi + her dilin `?lang=` adresi.
 * Türkçe (kaynak) adres parametresizdir ve `x-default` olarak işaretlenir.
 */
export async function localeAlternates(path: string) {
  const locale = await getLocale();
  const withLang = (l: Locale) => (l === SOURCE_LOCALE ? path : `${path}${path.includes("?") ? "&" : "?"}${LOCALE_PARAM}=${l}`);
  return {
    canonical: withLang(locale),
    languages: { ...Object.fromEntries(LOCALES.map((l) => [l, withLang(l)])), "x-default": path },
  };
}
