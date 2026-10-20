import "server-only";
import { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { oid } from "@/lib/validation/common";
import { CONTENT_STATUSES, CONTENT_TYPES, ContentItem, MediaAsset, type IContentItem, type IMediaAsset } from "@/models/content";
import { listCreatorContent, setContentStatus } from "@/services/content/manage";
import { mediaUrl } from "@/services/media/media";
import { studioCreator } from "./context";
import { getT } from "@/i18n/server";

export const libraryQuerySchema = z.object({
  status: z.enum(["all", ...CONTENT_STATUSES]).catch("all"),
  type: z.enum(["all", ...CONTENT_TYPES]).catch("all"),
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});
export type LibraryQuery = z.infer<typeof libraryQuerySchema>;

export interface AssetView {
  assetId: string;
  url: string;
  kind: string;
  name: string;
  sizeBytes: number;
}

async function assetViews(ids: IMediaAsset["_id"][]) {
  if (!ids.length) return new Map<string, AssetView>();
  const t = await getT();
  const assets = await MediaAsset.find({ _id: { $in: ids }, status: "ready" }).lean<IMediaAsset[]>();
  const out = new Map<string, AssetView>();
  for (const a of assets) out.set(a._id.toString(), { assetId: a._id.toString(), url: await mediaUrl(a), kind: a.kind, name: a.originalName ?? t("Dosya"), sizeBytes: a.sizeBytes });
  return out;
}

export async function getContentLibrary(userId: string, query: LibraryQuery) {
  const creator = await studioCreator(userId);
  const [list, statusAgg, totals] = await Promise.all([
    listCreatorContent(userId, { status: query.status, type: query.type, q: query.q || undefined, page: query.page, pageSize: 12 }),
    ContentItem.aggregate<{ _id: string; n: number }>([{ $match: { creatorId: creator._id } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    ContentItem.aggregate<{ _id: null; views: number; revenue: number; purchases: number; premium: number }>([
      { $match: { creatorId: creator._id, status: { $ne: "removed" } } },
      { $group: { _id: null, views: { $sum: "$stats.views" }, revenue: { $sum: "$stats.revenueMinor" }, purchases: { $sum: "$stats.purchases" }, premium: { $sum: { $cond: [{ $in: ["$access", ["subscribers", "purchase"]] }, 1, 0] } } } },
    ]),
  ]);
  // Kapak: önizleme varlığı → ilk görsel medya
  const coverIds = list.items.map((i) => i.previewAssetId ?? i.mediaAssetIds[0]).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const views = await assetViews(coverIds);
  const cover = (i: IContentItem) => {
    const v = views.get((i.previewAssetId ?? i.mediaAssetIds[0])?.toString() ?? "");
    return v && v.kind === "image" ? v.url : i.coverUrl ?? null;
  };
  const counts: Record<string, number> = Object.fromEntries(statusAgg.map((s) => [s._id, s.n]));
  return {
    creator,
    items: list.items.map((i) => ({ item: i, cover: cover(i) })),
    total: list.total,
    page: list.page,
    pageCount: list.pageCount,
    counts: { ...counts, all: statusAgg.reduce((a, s) => a + s.n, 0) } as Record<string, number> & { all: number },
    totals: { views: totals[0]?.views ?? 0, revenueMinor: totals[0]?.revenue ?? 0, purchases: totals[0]?.purchases ?? 0, premium: totals[0]?.premium ?? 0 },
  };
}

/** Düzenleme formu için içerik + bağlı medya (kendi varlıkları). */
export async function getContentForEdit(userId: string, contentId: string) {
  const creator = await studioCreator(userId);
  const item = await ContentItem.findOne({ _id: oid(contentId), creatorId: creator._id }).lean<IContentItem>();
  if (!item) throw new NotFoundError("İçerik bulunamadı.");
  const views = await assetViews([...item.mediaAssetIds, ...(item.previewAssetId ? [item.previewAssetId] : [])]);
  return {
    creator,
    item,
    media: item.mediaAssetIds.map((i) => views.get(i.toString())).filter((v): v is AssetView => Boolean(v)),
    preview: item.previewAssetId ? views.get(item.previewAssetId.toString()) ?? null : null,
  };
}

/**
 * Zamanlanmış yayın: tarihi gelmiş TASLAK içerikleri yayına alır (onaysız creator için incelemeye düşer).
 * Arka plan zamanlayıcısı (cron) henüz bu işlevi çağırmadığından Studio içerik sayfaları açıldığında tetiklenir.
 */
export async function publishDueScheduled(userId: string, now = new Date()) {
  const creator = await studioCreator(userId);
  const due = await ContentItem.find({ creatorId: creator._id, status: "draft", scheduledAt: { $ne: null, $lte: now } }, { _id: 1 }).limit(20).lean();
  let published = 0;
  for (const d of due) {
    try {
      await setContentStatus(userId, d._id.toString(), "published"); // i18n-ignore (durum kodu)
      published++;
    } catch (e) {
      console.error("[studio:scheduled-publish]", d._id.toString(), e);
    }
  }
  return published;
}
