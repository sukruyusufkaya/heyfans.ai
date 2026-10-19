import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { NotFoundError } from "@/lib/errors";
import { oid } from "@/lib/validation/common";
import { CreatorProfile, type ICreatorProfile } from "@/models/creator";

/** Oturumdaki kullanıcının creator profili (Studio servislerinin ortak giriş noktası). */
export async function studioCreator(userId: string) {
  await connectDb();
  const creator = await CreatorProfile.findOne({ userId: oid(userId) }).lean<ICreatorProfile>();
  if (!creator) throw new NotFoundError("Creator profili bulunamadı.");
  return creator;
}

export const DAY_MS = 86_400_000;
export const STUDIO_TZ = "Europe/Istanbul";

const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: STUDIO_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
/** Gün anahtarı (İstanbul saatiyle): "2026-10-19". Mongo `$dateToString` ile aynı saat dilimi kullanılmalı. */
export const dayKey = (d: Date) => ymd.format(d);

/** Son `days` günün (bugün dahil) gün anahtarları. */
export function dayKeys(days: number, now = new Date()) {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(dayKey(new Date(now.getTime() - i * DAY_MS)));
  return out;
}

/** Gün anahtarı listesinin başlangıç anı (İstanbul 00:00, UTC+3 sabit). */
export const rangeStart = (keys: string[]) => new Date(`${keys[0]}T00:00:00+03:00`);

const dayLabelFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: STUDIO_TZ });
export const dayLabel = (key: string) => dayLabelFmt.format(new Date(`${key}T12:00:00+03:00`));

/** `$dateToString` ifadesi (İstanbul saat dilimi). */
export const dayExpr = (field = "$createdAt") => ({ $dateToString: { format: "%Y-%m-%d", date: field, timezone: STUDIO_TZ } });

/** `[{_id: "2026-10-19", n: 3}]` → gün anahtarlarına göre doldurulmuş seri. */
export function fillSeries(keys: string[], rows: { _id: string; n: number }[]) {
  const map = new Map(rows.map((r) => [r._id, r.n]));
  return keys.map((k) => ({ label: dayLabel(k), value: map.get(k) ?? 0 }));
}

/** Hayran etiketi: kimlik sızdırmayan, kararlı kısa kod. */
export function anonymousFanLabel(id: string) {
  return `Hayran #${id.slice(-4).toUpperCase()}`;
}

/** "Deniz Kaya" → "Deniz K." (görünen ad; soyadı kısaltılır). */
export function shortName(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Hayran";
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]![0]!.toLocaleUpperCase("tr-TR")}.`;
}
