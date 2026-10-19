import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const trNumber = new Intl.NumberFormat("tr-TR");
const trCompact = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 });

export function formatNumber(n: number | null | undefined) {
  return trNumber.format(n ?? 0);
}

/** 248000 → "248B", 1_200_000 → "1,2 Mn" (Türkçe kısaltma). */
export function formatCompact(n: number | null | undefined) {
  return trCompact.format(n ?? 0);
}

/** Kuruş → "₺1.234,50" */
export function formatMoney(amountMinor: number | null | undefined, currency = "TRY", opts?: { decimals?: boolean }) {
  const value = (amountMinor ?? 0) / 100;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: opts?.decimals === false ? 0 : value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: opts?.decimals === false ? 0 : 2,
  }).format(value);
}

export function formatPercent(bps: number) {
  return `%${trNumber.format(bps / 100)}`;
}

const dateFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
const dateShort = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });
const dateTime = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

export const formatDate = (d: Date | string | null | undefined) => (d ? dateFmt.format(new Date(d)) : "—");
export const formatDateShort = (d: Date | string | null | undefined) => (d ? dateShort.format(new Date(d)) : "—");
export const formatDateTime = (d: Date | string | null | undefined) => (d ? dateTime.format(new Date(d)) : "—");
export const formatTime = (d: Date | string | null | undefined) => (d ? timeFmt.format(new Date(d)) : "—");

/** "3 dk önce", "Dün", "12 Eki" */
export function formatRelative(d: Date | string | null | undefined, now = new Date()) {
  if (!d) return "—";
  const date = new Date(d);
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return "Az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  if (diff < 172800) return "Dün";
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
  return dateShort.format(date);
}

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
