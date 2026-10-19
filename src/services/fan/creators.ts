import "server-only";
import type { Types } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { AiTwin } from "@/models/ai";
import { CreatorProfile } from "@/models/creator";
import { MembershipPlan } from "@/models/monetization";
import type { CreatorCard } from "@/services/creators/public";

/** Hayran sayfalarında satır/kart başlığı için küçük creator özeti. */
export interface CreatorBrief {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
  isOnline: boolean;
  /** Kurgusal örnek profil: satın alma/abonelik kapalı. */
  isSample: boolean;
}

export async function creatorBriefMap(ids: (string | Types.ObjectId)[]): Promise<Map<string, CreatorBrief>> {
  await connectDb();
  const unique = [...new Set(ids.map((i) => i.toString()))];
  if (!unique.length) return new Map();
  const rows = await CreatorProfile.find(
    { _id: { $in: unique.map((i) => oid(i)) }, status: "approved" },
    { username: 1, displayName: 1, avatarUrl: 1, verification: 1, isOnline: 1, isSample: 1 },
  ).lean();
  return new Map(
    rows.map((c) => [
      c._id.toString(),
      {
        id: c._id.toString(),
        username: c.username,
        displayName: c.displayName,
        avatarUrl: c.avatarUrl ?? null,
        verified: c.verification?.identity === "verified",
        isOnline: Boolean(c.isOnline),
        isSample: Boolean(c.isSample),
      },
    ]),
  );
}

/**
 * Verilen kimliklere göre (sıra korunur) herkese açık creator kartları.
 * Yalnız yayına alınmış (approved) profiller döner.
 */
export async function creatorCardsByIds(ids: string[]): Promise<CreatorCard[]> {
  await connectDb();
  if (!ids.length) return [];
  const objectIds = ids.map((i) => oid(i));
  const creators = await CreatorProfile.find({ _id: { $in: objectIds }, status: "approved" }).lean();
  const [twins, plans] = await Promise.all([
    AiTwin.find({ creatorId: { $in: objectIds } }, { creatorId: 1, status: 1 }).lean(),
    MembershipPlan.aggregate<{ _id: Types.ObjectId; min: number }>([
      { $match: { creatorId: { $in: objectIds }, scope: "creator", status: "active" } },
      { $group: { _id: "$creatorId", min: { $min: "$priceMonthly.amountMinor" } } },
    ]),
  ]);
  const twinMap = new Map(twins.map((t) => [t.creatorId.toString(), t.status]));
  const priceMap = new Map(plans.map((p) => [p._id.toString(), p.min]));
  const cards = new Map<string, CreatorCard>(
    creators.map((c) => [
      c._id.toString(),
      {
        id: c._id.toString(),
        username: c.username,
        displayName: c.displayName,
        headline: c.headline ?? null,
        avatarUrl: c.avatarUrl ?? null,
        coverUrl: c.coverUrl ?? null,
        categories: c.categories ?? [],
        followers: c.stats?.followers ?? 0,
        conversations: c.stats?.conversations ?? 0,
        isOnline: Boolean(c.isOnline),
        verified: c.verification?.identity === "verified",
        twinLive: twinMap.get(c._id.toString()) === "live",
        startingPriceMinor: priceMap.get(c._id.toString()) ?? null,
        createdAt: new Date(c.createdAt).toISOString(),
        isDemo: Boolean(c.isDemo),
        isSample: Boolean(c.isSample),
      },
    ]),
  );
  return ids.map((i) => cards.get(i)).filter((c): c is CreatorCard => Boolean(c));
}
