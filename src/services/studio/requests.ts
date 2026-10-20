import "server-only";
import { z } from "zod";
import { MediaAsset, type IMediaAsset } from "@/models/content";
import { CUSTOM_REQUEST_STATUSES, CreatorEarning, CustomRequest } from "@/models/monetization";
import { listCreatorRequests } from "@/services/experiences/custom-requests";
import { mediaUrl } from "@/services/media/media";
import { shortName, studioCreator } from "./context";
import { getT } from "@/i18n/server";

export const requestsQuerySchema = z.object({ status: z.enum(["all", ...CUSTOM_REQUEST_STATUSES]).catch("all") });

export interface RequestView {
  id: string;
  title: string;
  details: string;
  type: string;
  status: string;
  priceCredits: number;
  dueAt: Date | null;
  createdAt: Date;
  creatorNote: string | null;
  fan: { name: string; image: string | null };
  deliverables: { assetId: string; name: string; kind: string; url: string }[];
  history: { to: string; at: Date; note?: string }[];
}

/** Özel talep kutusu: durum sekmeleri, sayaçlar ve detay paneli için teslim dosyaları. */
export async function getRequestsInbox(userId: string, status: string) {
  const t = await getT();
  const creator = await studioCreator(userId);
  const [rows, counts, earn] = await Promise.all([
    listCreatorRequests(userId, status as never),
    CustomRequest.aggregate<{ _id: string; n: number }>([{ $match: { creatorId: creator._id, status: { $ne: "draft" } } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    CreatorEarning.aggregate<{ _id: null; v: number }>([{ $match: { creatorId: creator._id, sourceType: "custom_request" } }, { $group: { _id: null, v: { $sum: "$creatorShareMinor" } } }]),
  ]);
  const assetIds = rows.flatMap((r) => r.request.deliverableAssetIds);
  const assets = assetIds.length ? await MediaAsset.find({ _id: { $in: assetIds } }).lean<IMediaAsset[]>() : [];
  const aMap = new Map(assets.map((a) => [a._id.toString(), a]));
  const items: RequestView[] = [];
  for (const { request: r, fan } of rows) {
    const deliverables = [];
    for (const id of r.deliverableAssetIds) {
      const a = aMap.get(id.toString());
      if (a) deliverables.push({ assetId: a._id.toString(), name: a.originalName ?? t("Dosya"), kind: a.kind, url: await mediaUrl(a) });
    }
    items.push({
      id: r._id.toString(),
      title: r.title,
      details: r.details,
      type: r.type,
      status: r.status,
      priceCredits: r.priceCredits,
      dueAt: r.dueAt ?? null,
      createdAt: r.createdAt,
      creatorNote: r.creatorNote ?? null,
      fan: { name: shortName(fan?.name, t), image: fan?.image ?? null },
      deliverables,
      history: r.history.map((h) => ({ to: h.to, at: h.at, note: h.note })),
    });
  }
  const map: Record<string, number> = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  return { creator, items, earningsMinor: earn[0]?.v ?? 0, counts: { ...map, all: counts.reduce((a, c) => a + c.n, 0) } as Record<string, number> & { all: number } };
}
