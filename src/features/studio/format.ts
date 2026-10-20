/** Dile göre ondalık ayırıcı ("," ya da "."); tutar girişlerinde ayrıştırma için. `tag` = `LOCALE_META[locale].intl`. */
export const decimalOf = (tag: string) => new Intl.NumberFormat(tag).formatToParts(1.1).find((p) => p.type === "decimal")?.value ?? ".";

/** Date → `datetime-local` değeri (yerel saat). */
export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
