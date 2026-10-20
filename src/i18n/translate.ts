import { cloneElement, isValidElement } from "react";
import { IntlMessageFormat } from "intl-messageformat";
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { LOCALE_META, SOURCE_LOCALE, type Locale } from "./config";

/** Kaynak (Türkçe) metin → hedef dildeki karşılığı. */
export type Catalog = Readonly<Record<string, string>>;
export type MessageParams = Record<string, string | number | Date | boolean | null | undefined>;
export type RichValues<R> = Record<string, string | number | Date | boolean | null | undefined | ((chunks: R[]) => R)>;

interface Compiled {
  format: IntlMessageFormat;
  /** Çoğul argümanları: `#` yerine konan yardımcı değişkenin kaynağı. */
  pluralArgs: string[];
}

const compiled = new Map<string, Compiled | null>();
const POUND_SUFFIX = "__hfPound";

/**
 * Çoğul dallarındaki `#` işaretini yardımcı değişkene çevirir. Sebep: bazı ekranlar sayıyı önceden biçimleyip
 * metin olarak geçirir ("1.500"); ICU `#` bunu sayıya çeviremeyip "NaN" basar. Yardımcı değişken, değer sayıysa
 * dile göre biçimlenir, metinse olduğu gibi basılır.
 */
function rewritePound(els: MessageFormatElement[], arg: string | null, args: Set<string>): MessageFormatElement[] {
  return els.map((el) => {
    if (el.type === TYPE.pound && arg) return { type: TYPE.argument, value: `${arg}${POUND_SUFFIX}`, location: el.location } as MessageFormatElement;
    if (el.type === TYPE.plural) {
      args.add(el.value);
      for (const opt of Object.values(el.options)) opt.value = rewritePound(opt.value, el.value, args);
    } else if (el.type === TYPE.select) {
      for (const opt of Object.values(el.options)) opt.value = rewritePound(opt.value, arg, args);
    } else if (el.type === TYPE.tag) {
      el.children = rewritePound(el.children, arg, args);
    }
    return el;
  });
}

/**
 * ICU biçimi: `{name}`, `{count, plural, one {# kredi} other {# kredi}}`, `<b>kalın</b>`.
 * Kesme işaretleri her zaman düz karakterdir (Türkçe "Selin'in", Fransızca "l'{x}") — ICU'nun tırnak kaçışı kullanılmaz.
 */
function compile(locale: Locale, message: string): Compiled | null {
  const key = `${locale}\u0000${message}`;
  let c = compiled.get(key);
  if (c === undefined) {
    try {
      const args = new Set<string>();
      const ast = rewritePound(parse(message.replace(/'/g, "''"), { ignoreTag: false }), null, args);
      c = { format: new IntlMessageFormat(ast, LOCALE_META[locale].intl), pluralArgs: [...args] };
    } catch {
      c = null;
    }
    if (compiled.size > 20_000) compiled.clear();
    compiled.set(key, c);
  }
  return c;
}

const numberFormats = new Map<Locale, Intl.NumberFormat>();
function withPoundValues<V>(c: Compiled, locale: Locale, values: Record<string, V> | undefined): Record<string, V | string> | undefined {
  if (!c.pluralArgs.length) return values;
  let nf = numberFormats.get(locale);
  if (!nf) numberFormats.set(locale, (nf = new Intl.NumberFormat(LOCALE_META[locale].intl)));
  const out: Record<string, V | string> = { ...(values ?? {}) };
  for (const a of c.pluralArgs) {
    const v = values?.[a] as unknown;
    out[`${a}${POUND_SUFFIX}`] = typeof v === "number" ? nf.format(v) : String(v ?? "");
  }
  return out;
}

/** Dizideki React öğelerine sıra numarasıyla anahtar verir (öğe değilse olduğu gibi bırakır). */
function withKeys<T>(parts: T[]): T[] {
  return parts.map((p, i) => (isValidElement(p) && p.key == null ? (cloneElement(p, { key: `r${i}` }) as T) : p));
}

const needsFormat = (s: string) => s.includes("{") || s.includes("<");

/** Tek bir mesajı biçimler; ayrıştırılamayan mesaj olduğu gibi döner (asla patlamaz). */
export function formatMessage(locale: Locale, message: string, params?: MessageParams): string {
  if (!needsFormat(message)) return message;
  const c = compile(locale, message);
  if (!c) return message;
  try {
    const out = c.format.format(withPoundValues(c, locale, params) as Record<string, string>);
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
    const c = compile(l, message);
    if (!c) return [message];
    try {
      // Etiket fonksiyonlarına giden parçalar ve sonuç dizisi anahtarlanır (React "key" uyarısı çıkmasın).
      const wrapped = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, typeof v === "function" ? (chunks: R[]) => (v as (c: R[]) => R)(withKeys(chunks)) : v]),
      ) as RichValues<R>;
      const out = c.format.format<R>(withPoundValues(c, l, wrapped) as Record<string, R>);
      return Array.isArray(out) ? withKeys(out as (string | R)[]) : [out as string | R];
    } catch {
      return [message];
    }
  };
  t.has = (source: string) => locale === SOURCE_LOCALE || Boolean(catalog[source]);
  Object.defineProperty(t, "locale", { value: locale });
  return t;
}
