import { LOCALE_META, SOURCE_LOCALE, type Locale } from "./config";

type DateLike = Date | string | number | null | undefined;
const EMPTY = "—";

export interface Formatters {
  locale: Locale;
  formatNumber(n: number | null | undefined): string;
  /** 248000 → "248 B" / "248K" (dile göre kısaltma). */
  formatCompact(n: number | null | undefined): string;
  /** Kuruş → "₺1.234,50" / "TRY 1,234.50" (dile göre). */
  formatMoney(amountMinor: number | null | undefined, currency?: string, opts?: { decimals?: boolean }): string;
  /** Baz puan → "%12,5" / "12.5%". */
  formatPercent(bps: number): string;
  formatDate(d: DateLike): string;
  formatDateShort(d: DateLike): string;
  formatDateTime(d: DateLike): string;
  formatTime(d: DateLike): string;
  /** "az önce", "3 dk önce", "dün", "12 Eki" (dile göre). */
  formatRelative(d: DateLike, now?: Date): string;
  /** Dile göre alfabetik karşılaştırma (sıralama). */
  compare(a: string, b: string): number;
}

const cache = new Map<Locale, Formatters>();

/** Dile bağlı biçimlendiriciler. Sunucuda `getFormatters()`, istemcide `useFormatters()` ile alınır. */
export function createFormatters(locale: Locale = SOURCE_LOCALE): Formatters {
  const hit = cache.get(locale);
  if (hit) return hit;
  const tag = LOCALE_META[locale].intl;
  const number = new Intl.NumberFormat(tag);
  const compact = new Intl.NumberFormat(tag, { notation: "compact", maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", year: "numeric" });
  const dateShort = new Intl.DateTimeFormat(tag, { day: "2-digit", month: "short" });
  const dateTime = new Intl.DateTimeFormat(tag, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const time = new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit" });
  const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto", style: "short" });
  const collator = new Intl.Collator(tag, { sensitivity: "base", numeric: true });
  const money = new Map<string, Intl.NumberFormat>();
  const valid = (d: DateLike): Date | null => {
    if (d === null || d === undefined || d === "") return null;
    const v = d instanceof Date ? d : new Date(d);
    return Number.isNaN(v.getTime()) ? null : v;
  };

  const f: Formatters = {
    locale,
    formatNumber: (n) => number.format(n ?? 0),
    formatCompact: (n) => compact.format(n ?? 0),
    formatMoney: (amountMinor, currency = "TRY", opts) => {
      const value = (amountMinor ?? 0) / 100;
      const digits = opts?.decimals === false ? 0 : value % 1 === 0 ? 0 : 2;
      const key = `${currency}:${digits}:${opts?.decimals === false ? 0 : 2}`;
      let nf = money.get(key);
      if (!nf) {
        nf = new Intl.NumberFormat(tag, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: opts?.decimals === false ? 0 : 2 });
        money.set(key, nf);
      }
      return nf.format(value);
    },
    formatPercent: (bps) => percent.format(bps / 10000),
    formatDate: (d) => (valid(d) ? date.format(valid(d)!) : EMPTY),
    formatDateShort: (d) => (valid(d) ? dateShort.format(valid(d)!) : EMPTY),
    formatDateTime: (d) => (valid(d) ? dateTime.format(valid(d)!) : EMPTY),
    formatTime: (d) => (valid(d) ? time.format(valid(d)!) : EMPTY),
    formatRelative: (d, now = new Date()) => {
      const v = valid(d);
      if (!v) return EMPTY;
      const diff = (now.getTime() - v.getTime()) / 1000;
      if (diff < 60) return rtf.format(0, "second");
      if (diff < 3600) return rtf.format(-Math.floor(diff / 60), "minute");
      if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), "hour");
      if (diff < 604800) return rtf.format(-Math.floor(diff / 86400), "day");
      return dateShort.format(v);
    },
    compare: (a, b) => collator.compare(a, b),
  };
  cache.set(locale, f);
  return f;
}
