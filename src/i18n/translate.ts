import { IntlMessageFormat } from "intl-messageformat";
import { LOCALE_META, SOURCE_LOCALE, type Locale } from "./config";

/** Kaynak (Türkçe) metin → hedef dildeki karşılığı. */
export type Catalog = Readonly<Record<string, string>>;
export type MessageParams = Record<string, string | number | Date | boolean | null | undefined>;
export type RichValues<R> = Record<string, string | number | Date | boolean | null | undefined | ((chunks: R[]) => R)>;

const compiled = new Map<string, IntlMessageFormat | null>();

/**
 * ICU biçimi: `{name}`, `{count, plural, one {# kredi} other {# kredi}}`, `<b>kalın</b>`.
 * Kesme işaretleri her zaman düz karakterdir (Türkçe "Selin'in", Fransızca "l'{x}") — ICU'nun tırnak kaçışı kullanılmaz.
 */
function compile(locale: Locale, message: string): IntlMessageFormat | null {
  const key = `${locale}\u0000${message}`;
  let f = compiled.get(key);
  if (f === undefined) {
    try {
      f = new IntlMessageFormat(message.replace(/'/g, "''"), LOCALE_META[locale].intl, undefined, { ignoreTag: false });
    } catch {
      f = null;
    }
    if (compiled.size > 20_000) compiled.clear();
    compiled.set(key, f);
  }
  return f;
}

const needsFormat = (s: string) => s.includes("{") || s.includes("<");

/** Tek bir mesajı biçimler; ayrıştırılamayan mesaj olduğu gibi döner (asla patlamaz). */
export function formatMessage(locale: Locale, message: string, params?: MessageParams): string {
  if (!needsFormat(message)) return message;
  const f = compile(locale, message);
  if (!f) return message;
  try {
    const out = f.format(params as Record<string, string>);
    return Array.isArray(out) ? out.join("") : String(out);
  } catch {
    return message;
  }
}

export interface Translator {
  (source: string, params?: MessageParams): string;
  /** JSX etiketli metin: `t.rich("<b>{n}</b> içerik", { n, b: (c) => <b>{c}</b> })`. */
  rich<R>(source: string, values: RichValues<R>): (string | R)[];
  /** Kaynak metnin bu dilde karşılığı var mı (yönetim ekranı uyarıları vb. için). */
  has(source: string): boolean;
  readonly locale: Locale;
}

/**
 * Çevirmen: `t("Kaydet")`, `t("{n} yeni mesaj", { n })`.
 * Katalogda karşılığı yoksa kaynak (Türkçe) metin Türkçe kurallarla biçimlenir — eksik çeviri sayfayı bozmaz.
 */
export function createTranslator(locale: Locale, catalog: Catalog, onMissing?: (source: string) => void): Translator {
  const lookup = (source: string): { message: string; locale: Locale } => {
    if (locale === SOURCE_LOCALE || !source) return { message: source, locale: SOURCE_LOCALE };
    const hit = catalog[source];
    if (hit) return { message: hit, locale };
    onMissing?.(source);
    return { message: source, locale: SOURCE_LOCALE };
  };
  const t = ((source: string, params?: MessageParams) => {
    if (typeof source !== "string") return source as unknown as string;
    const { message, locale: l } = lookup(source);
    return formatMessage(l, message, params);
  }) as Translator;
  t.rich = <R,>(source: string, values: RichValues<R>) => {
    const { message, locale: l } = lookup(source);
    const f = compile(l, message);
    if (!f) return [message];
    try {
      const out = f.format<R>(values as Record<string, R>);
      return Array.isArray(out) ? (out as (string | R)[]) : [out as string | R];
    } catch {
      return [message];
    }
  };
  t.has = (source: string) => locale === SOURCE_LOCALE || Boolean(catalog[source]);
  Object.defineProperty(t, "locale", { value: locale });
  return t;
}
