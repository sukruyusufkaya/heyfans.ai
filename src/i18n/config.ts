/**
 * Dil yapılandırması (sunucu + istemci ortak, bağımlılıksız).
 * Kaynak dil Türkçedir: koddaki metinler Türkçe yazılır ve çeviri kataloglarında anahtar olarak kullanılır (docs/i18n.md).
 */
export const LOCALES = ["tr", "en", "ar", "es", "fr", "pt", "de"] as const;
export type Locale = (typeof LOCALES)[number];

/** Kaynak dil; katalogda karşılığı olmayan metin bu dilde gösterilir. */
export const SOURCE_LOCALE: Locale = "tr";
/** Hiçbir ipucu yoksa (konum yok, tarayıcı dili desteklenmiyor) kullanılan dil. */
export const DEFAULT_LOCALE: Locale = "tr";

export const LOCALE_COOKIE = "hf_locale";
/** Proxy'nin çözdüğü dili sunucu bileşenlerine taşıyan istek başlığı. */
export const LOCALE_HEADER = "x-hf-locale";
/** Dilin nereden geldiği (param | cookie | country | browser | default). */
export const LOCALE_SOURCE_HEADER = "x-hf-locale-source";
/** Proxy'nin geçerli yolu taşıdığı başlık (hreflang alternatifleri için). */
export const PATH_HEADER = "x-hf-path";
/** Paylaşılabilir / arama motoru dostu dil parametresi: `?lang=en`. */
export const LOCALE_PARAM = "lang";

export interface LocaleMeta {
  /** Kendi dilinde adı (dil seçicide). */
  label: string;
  /** Türkçe adı (yönetim ekranları, kayıtlar). */
  trName: string;
  dir: "ltr" | "rtl";
  /** Intl biçimlendirme yereli. Arapçada Latin rakamları kullanılır (fiyat, kullanıcı adı, kod tutarlılığı). */
  intl: string;
  /** Open Graph yereli. */
  og: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  tr: { label: "Türkçe", trName: "Türkçe", dir: "ltr", intl: "tr-TR", og: "tr_TR" },
  en: { label: "English", trName: "İngilizce", dir: "ltr", intl: "en-US", og: "en_US" },
  ar: { label: "العربية", trName: "Arapça", dir: "rtl", intl: "ar-u-nu-latn", og: "ar_AR" },
  es: { label: "Español", trName: "İspanyolca", dir: "ltr", intl: "es-ES", og: "es_ES" },
  fr: { label: "Français", trName: "Fransızca", dir: "ltr", intl: "fr-FR", og: "fr_FR" },
  pt: { label: "Português", trName: "Portekizce", dir: "ltr", intl: "pt-BR", og: "pt_BR" },
  de: { label: "Deutsch", trName: "Almanca", dir: "ltr", intl: "de-DE", og: "de_DE" },
};

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);
