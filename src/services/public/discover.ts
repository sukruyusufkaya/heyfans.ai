import "server-only";
import { cache } from "react";
import type { Types } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { AiTwin, AiTwinVersion } from "@/models/ai";
import { CreatorProfile, type ICreatorProfile } from "@/models/creator";
import { AnalyticsEvent } from "@/models/platform";
import { getCategory } from "@/services/creators/public";

/** Kategori / keşif sayfalarında "AI ikizi" kartı (yalnız yayındaki ikizler, yalnız onaylı creator'lar). */
export interface TwinCreatorCard {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  categories: string[];
  followers: number;
  isOnline: boolean;
  verified: boolean;
  twinName: string;
  greeting: string | null;
}

export async function listTwinCreators(categories: string[] | null, limit = 6): Promise<TwinCreatorCard[]> {
  await connectDb();
  const twins = await AiTwin.find({ status: "live" }, { creatorId: 1, liveVersionId: 1 }).lean();
  if (!twins.length) return [];
  const creators = await CreatorProfile.find(
    { status: "approved", _id: { $in: twins.map((t) => t.creatorId) }, ...(categories?.length ? { categories: { $in: categories } } : {}) },
    { username: 1, displayName: 1, avatarUrl: 1, coverUrl: 1, categories: 1, stats: 1, isOnline: 1, verification: 1 },
  )
    .sort({ "stats.followers": -1 })
    .limit(limit)
    .lean<Pick<ICreatorProfile, "_id" | "username" | "displayName" | "avatarUrl" | "coverUrl" | "categories" | "stats" | "isOnline" | "verification">[]>();
  const twinByCreator = new Map(twins.map((t) => [t.creatorId.toString(), t]));
  const versionIds = creators.map((c) => twinByCreator.get(c._id.toString())?.liveVersionId).filter((v): v is Types.ObjectId => Boolean(v));
  const versions = versionIds.length
    ? await AiTwinVersion.find({ _id: { $in: versionIds } }, { "snapshot.persona.displayName": 1, "snapshot.persona.greeting": 1 }).lean<{ _id: Types.ObjectId; snapshot?: { persona?: { displayName?: string; greeting?: string } } }[]>()
    : [];
  const versionMap = new Map(versions.map((v) => [v._id.toString(), v.snapshot?.persona]));
  return creators.map((c) => {
    const persona = versionMap.get(twinByCreator.get(c._id.toString())?.liveVersionId?.toString() ?? "");
    return {
      id: c._id.toString(),
      username: c.username,
      displayName: c.displayName,
      avatarUrl: c.avatarUrl ?? null,
      coverUrl: c.coverUrl ?? null,
      categories: c.categories ?? [],
      followers: c.stats?.followers ?? 0,
      isOnline: Boolean(c.isOnline),
      verified: c.verification?.identity === "verified",
      twinName: persona?.displayName || c.displayName,
      greeting: persona?.greeting || null,
    };
  });
}

/** Kategorideki (ya da tüm) creator'ların en sık kullanılan etiketleri — gerçek veriden; arama bağlantısı olarak sunulur. */
export async function categoryTopTags(categories: string[] | null, limit = 12) {
  await connectDb();
  const rows = await CreatorProfile.aggregate<{ _id: string; n: number }>([
    { $match: { status: "approved", ...(categories?.length ? { categories: { $in: categories } } : {}) } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", n: { $sum: 1 } } },
    { $sort: { n: -1, _id: 1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => ({ tag: r._id, count: r.n }));
}

const DAY = 86400_000;
const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Creator başına son N günün günlük etkileşim serisi (takip + sohbet + profil görüntüleme), eksik günler 0. */
export async function creatorActivitySeries(creatorIds: string[], days = 7): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>();
  if (!creatorIds.length) return out;
  await connectDb();
  const now = Date.now();
  const keys = Array.from({ length: days }, (_, i) => dayKey(now - (days - 1 - i) * DAY));
  const since = new Date(`${keys[0]}T00:00:00.000Z`);
  const rows = await AnalyticsEvent.aggregate<{ _id: { c: Types.ObjectId; d: string }; n: number }>([
    { $match: { creatorId: { $in: creatorIds.map((i) => oid(i)) }, createdAt: { $gte: since }, type: { $in: ["follow", "chat_started", "chat_message", "profile_view"] } } },
    { $group: { _id: { c: "$creatorId", d: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } }, n: { $sum: 1 } } },
  ]);
  const byCreator = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const id = r._id.c.toString();
    if (!byCreator.has(id)) byCreator.set(id, new Map());
    byCreator.get(id)!.set(r._id.d, r.n);
  }
  for (const id of creatorIds) out.set(id, keys.map((k) => byCreator.get(id)?.get(k) ?? 0));
  return out;
}

/** Platform geneli günlük sohbet mesajı serisi (grafik için, eksik günler 0). */
export function fillDailySeries(daily: { _id: string; chats: number }[], days = 30) {
  const map = new Map(daily.map((d) => [d._id, d.chats]));
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => {
    const t = now - (days - 1 - i) * DAY;
    const key = dayKey(t);
    const d = new Date(t);
    return { label: `${d.getUTCDate()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`, value: map.get(key) ?? 0 };
  });
}

/** İstek başına önbellekli kategori okuması (layout varlık denetimi + sayfa aynı sorguyu paylaşır). */
export const getCategoryCached = cache((slug: string) => getCategory(slug));
