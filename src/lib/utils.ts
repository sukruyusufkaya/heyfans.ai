import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { createFormatters } from "@/i18n/formatters";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


/**
 * Türkçe (kaynak dil) biçimlendiriciler — betikler, testler ve dil bağlamı olmayan yerler için.
 * Arayüzde dile göre biçim için sunucuda `await getFormatters()` (@/i18n/server), istemcide `useFormatters()` (@/i18n/client) kullanın.
 */
const sourceFormatters = createFormatters("tr");
export const formatNumber = sourceFormatters.formatNumber;
export const formatCompact = sourceFormatters.formatCompact;
export const formatMoney = sourceFormatters.formatMoney;
export const formatPercent = sourceFormatters.formatPercent;
export const formatDate = sourceFormatters.formatDate;
export const formatDateShort = sourceFormatters.formatDateShort;
export const formatDateTime = sourceFormatters.formatDateTime;
export const formatTime = sourceFormatters.formatTime;
export const formatRelative = sourceFormatters.formatRelative;

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase("tr-TR"))
    .join("");
}

export function slugify(input: string) {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u" };
  return input
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Serileştirme: Mongo belgelerini (ObjectId, Date) istemci bileşenlerine güvenle aktarmak için. */
export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
