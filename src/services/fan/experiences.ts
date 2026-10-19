import "server-only";
import type { Types } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { AiTwin } from "@/models/ai";
import { CreatorProfile } from "@/models/creator";
import { Follow } from "@/models/social";
import { MediaAsset } from "@/models/content";
import { listFanRequests } from "@/services/experiences/custom-requests";
import { listGiftCatalog, listSentGifts } from "@/services/experiences/gifts";
import { ensureWallet } from "@/services/wallet/wallet";
import type { CustomRequestStatus } from "@/models/monetization";

export interface FollowedCreatorOption {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  acceptsRequests: boolean;
}

/** Hayranın takip ettiği (onaylı) creator'lar — özel talep ve hediye gönderiminde seçim listesi. */
export async function listFollowedCreatorOptions(userId: string): Promise<FollowedCreatorOption[]> {
  await connectDb();
  const follows = await Follow.find({ followerId: oid(userId) }).sort({ createdAt: -1 }).limit(300).lean();
  const ids = follows.map((f) => f.creatorId);
  const [creators, twins] = await Promise.all([
    CreatorProfile.find({ _id: { $in: ids }, status: "approved" }, { username: 1, displayName: 1, avatarUrl: 1 }).lean(),
    AiTwin.find({ creatorId: { $in: ids } }, { creatorId: 1, "draft.boundaries.allowCustomRequests": 1 }).lean<{ creatorId: Types.ObjectId; draft?: { boundaries?: { allowCustomRequests?: boolean } } }[]>(),
  ]);
  const closed = new Set(twins.filter((t) => t.draft?.boundaries?.allowCustomRequests === false).map((t) => t.creatorId.toString()));
  const byId = new Map(creators.map((c) => [c._id.toString(), c]));
  return ids
    .map((id) => byId.get(id.toString()))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({ username: c.username, displayName: c.displayName, avatarUrl: c.avatarUrl ?? null, acceptsRequests: !closed.has(c._id.toString()) }));
}

export interface RequestView {
  id: string;
  title: string;
  details: string;
  type: "photo" | "video" | "audio" | "message" | "other";
  status: CustomRequestStatus;
  priceCredits: number;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  creator: { username: string; displayName: string; avatarUrl: string | null } | null;
  creatorNote: string | null;
  refunded: boolean;
  history: { to: CustomRequestStatus; at: string; note: string | null }[];
  deliverables: { id: string; kind: string; name: string; url: string }[];
}

/** /app/experiences — talepler, durum geçmişi ve teslim dosyaları (yalnız tamamlanan talepte). */
export async function getFanRequestViews(userId: string, status?: CustomRequestStatus | "all") {
  const rows = await listFanRequests(userId, status);
  const completedAssetIds = rows.filter((r) => r.request.status === "completed").flatMap((r) => r.request.deliverableAssetIds);
  const assets = completedAssetIds.length ? await MediaAsset.find({ _id: { $in: completedAssetIds }, status: "ready" }, { kind: 1, originalName: 1 }).lean() : [];
  const assetMap = new Map(assets.map((a) => [a._id.toString(), a]));
  return rows.map(
    ({ request: r, creator }): RequestView => ({
      id: r._id.toString(),
      title: r.title,
      details: r.details,
      type: r.type,
      status: r.status,
      priceCredits: r.priceCredits,
      dueAt: r.dueAt ? new Date(r.dueAt).toISOString() : null,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
      creator: creator ? { username: creator.username, displayName: creator.displayName, avatarUrl: creator.avatarUrl ?? null } : null,
      creatorNote: r.creatorNote ?? null,
      refunded: Boolean(r.refundEntryId),
      history: (r.history ?? []).map((h) => ({ to: h.to as CustomRequestStatus, at: new Date(h.at).toISOString(), note: h.note ?? null })),
      deliverables:
        r.status === "completed"
          ? r.deliverableAssetIds.map((id) => ({ id: id.toString(), kind: assetMap.get(id.toString())?.kind ?? "document", name: assetMap.get(id.toString())?.originalName ?? "Teslim dosyası", url: `/api/media/${id.toString()}` }))
          : [],
    }),
  );
}

/** /app/gifts — katalog, geçmiş, bakiye ve gönderilebilir creator listesi. */
export async function getGiftsPage(userId: string, to?: string) {
  const [catalog, history, balance, creators] = await Promise.all([listGiftCatalog(), listSentGifts(userId, 30), ensureWallet(userId), listFollowedCreatorOptions(userId)]);
  // Takip edilmeyen bir creator'a (ör. sohbet ekranından) hediye gönderilebilir: seçim listesine eklenir.
  if (to && !creators.some((c) => c.username === to.toLowerCase())) {
    const extra = await CreatorProfile.findOne({ username: to.toLowerCase(), status: "approved" }, { username: 1, displayName: 1, avatarUrl: 1 }).lean();
    if (extra) creators.unshift({ username: extra.username, displayName: extra.displayName, avatarUrl: extra.avatarUrl ?? null, acceptsRequests: true });
  }
  return {
    catalog: catalog.map((g) => ({ key: g.key, name: g.name, icon: g.icon, credits: g.credits })),
    history: history.map((h) => ({
      id: h.gift._id.toString(),
      kind: h.gift.kind,
      giftKey: h.gift.giftKey ?? null,
      credits: h.gift.credits,
      message: h.gift.message ?? null,
      anonymous: h.gift.isAnonymous,
      createdAt: new Date(h.gift.createdAt).toISOString(),
      creator: h.creator ? { username: h.creator.username, displayName: h.creator.displayName, avatarUrl: h.creator.avatarUrl ?? null } : null,
    })),
    balance: balance.balance,
    creators,
  };
}
