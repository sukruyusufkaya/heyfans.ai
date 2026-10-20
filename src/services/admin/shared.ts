import "server-only";
import { cache } from "react";
import type { Types } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import type { SessionUser } from "@/lib/auth/session";
import { CreatorProfile } from "@/models/creator";
import { User } from "@/models/identity";
import { LOCALE_META, type Locale } from "@/i18n/config";
import { createTranslator, type Translator } from "@/i18n/translate";

export type AdminActor = { id: string; adminRole: string | null };
export const actorOf = (u: Pick<SessionUser, "id" | "adminRole">): AdminActor => ({ id: u.id, adminRole: u.adminRole });

export type SearchParams = Record<string, string | string[] | undefined>;

export function pick(sp: SearchParams, key: string): string {
  const v = sp[key];
  return ((Array.isArray(v) ? v[0] : v) ?? "").trim().slice(0, 120);
}
export function pickEnum<T extends string>(sp: SearchParams, key: string, allowed: readonly T[], fallback: T): T {
  const v = pick(sp, key);
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}
export function pickPage(sp: SearchParams, key = "page") {
  const n = Number(pick(sp, key));
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 1;
}
export function pickId(sp: SearchParams, key: string): string | null {
  const v = pick(sp, key);
  return /^[a-f0-9]{24}$/i.test(v) ? v : null;
}

export const idOf = (v: { toString(): string } | null | undefined) => (v ? v.toString() : "");

export interface UserLite {
  id: string;
  name: string;
  email: string;
  image: string | null;
  username: string | null;
}
export async function loadUsers(ids: (Types.ObjectId | string | null | undefined)[]): Promise<Map<string, UserLite>> {
  const unique = [...new Set(ids.filter(Boolean).map((i) => String(i)))];
  const map = new Map<string, UserLite>();
  if (!unique.length) return map;
  await connectDb();
  const rows = await User.find({ _id: { $in: unique } }, { name: 1, email: 1, image: 1, username: 1 }).lean();
  for (const u of rows) map.set(u._id.toString(), { id: u._id.toString(), name: u.name, email: u.email, image: u.image ?? null, username: u.username ?? null });
  return map;
}

export interface CreatorLite {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}
export async function loadCreators(ids: (Types.ObjectId | string | null | undefined)[]): Promise<Map<string, CreatorLite>> {
  const unique = [...new Set(ids.filter(Boolean).map((i) => String(i)))];
  const map = new Map<string, CreatorLite>();
  if (!unique.length) return map;
  await connectDb();
  const rows = await CreatorProfile.find({ _id: { $in: unique } }, { displayName: 1, username: 1, avatarUrl: 1, userId: 1 }).lean();
  for (const c of rows) map.set(c._id.toString(), { id: c._id.toString(), userId: c.userId.toString(), displayName: c.displayName, username: c.username, avatarUrl: c.avatarUrl ?? null });
  return map;
}

export const TZ = "Europe/Istanbul";

/** Son n ayın anahtarları ("2026-10") ve etiketleri; eski → yeni. Europe/Istanbul takvimine göre. */
export function monthBuckets(n: number, now = new Date(), locale: Locale = "tr") {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const fmt = new Intl.DateTimeFormat(LOCALE_META[locale].intl, { month: "short", timeZone: "UTC" });
  const out: { key: string; label: string; start: Date; end: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const next = new Date(Date.UTC(y, m - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    // Istanbul = UTC+3 (DST yok): ay başlangıcı UTC'de 3 saat önce.
    out.push({ key, label: fmt.format(d), start: new Date(d.getTime() - 3 * 3600_000), end: new Date(next.getTime() - 3 * 3600_000) });
  }
  return out;
}

/** Aggregation için ay anahtarı ifadesi. */
export const monthKeyExpr = (field: string) => ({ $dateToString: { format: "%Y-%m", date: `$${field}`, timezone: TZ } });
export const dayKeyExpr = (field: string) => ({ $dateToString: { format: "%Y-%m-%d", date: `$${field}`, timezone: TZ } });

export const DAY_MS = 86_400_000;
export const daysAgo = (n: number, now = new Date()) => new Date(now.getTime() - n * DAY_MS);

/** Önceki dönemle yüzde fark rozeti (taban 0 ise gösterilmez — sahte yüzde yok). */
export function pctDelta(cur: number, prev: number, locale: Locale = "tr"): { value: string; direction: "up" | "down" | "flat" } | null {
  if (!prev) return null;
  const pct = ((cur - prev) / prev) * 100;
  // Türkçede yüzde işareti öne yazılır (%12,5); diğer dillerde sona (12.5%).
  const withPct = (n: string) => (locale === "tr" ? `%${n}` : `${n}%`);
  if (Math.abs(pct) < 0.05) return { value: withPct("0"), direction: "flat" };
  const n = Math.abs(pct).toLocaleString(LOCALE_META[locale].intl, { maximumFractionDigits: 1 });
  return { value: `${pct > 0 ? "+" : "-"}${withPct(n)}`, direction: pct > 0 ? "up" : "down" };
}

export function percentile(sorted: number[], p: number) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx]!;
}

const TR_TRANSLATOR = createTranslator("tr", {});

/** Süreyi okunur biçime çevirir. `t` verilmezse Türkçe; istek dilinde için `await getT()` çevirmenini geçin. */
export function msToHuman(ms: number | null, t: Translator = TR_TRANSLATOR) {
  if (ms === null || !Number.isFinite(ms)) return "—";
  const nf = new Intl.NumberFormat(LOCALE_META[t.locale].intl, { maximumFractionDigits: 1 });
  const min = ms / 60000;
  if (min < 1) return t("< 1 dk");
  if (min < 90) return t("{n} dk", { n: Math.round(min) });
  const h = min / 60;
  if (h < 48) return t("{n} sa", { n: nf.format(h) });
  return t("{n} gün", { n: nf.format(h / 24) });
}

export const REGEX_SAFE = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Veritabanında demo (tohum) kayıtları var mı? İstatistik kartlarının yanında uyarı göstermek için. */
export const hasDemoData = cache(async () => {
  await connectDb();
  return Boolean(await User.exists({ isDemo: true }));
});
