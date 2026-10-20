import "server-only";
import { z } from "zod";
import { connectDb } from "@/lib/db/mongo";
import { AppError, NotFoundError } from "@/lib/errors";
import { oid } from "@/lib/validation/common";
import { KnowledgeChunk, KnowledgeSource, type IKnowledgeSource } from "@/models/ai";
import { MediaAsset } from "@/models/content";
import { activeConsents, getOrCreateTwin } from "./lifecycle";
import { enqueueJob } from "@/services/jobs/jobs";
import { m } from "@/i18n/m";

export const knowledgeInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), title: z.string().trim().min(2).max(200), text: z.string().trim().min(20, m("Metin en az 20 karakter olmalı")).max(100_000) }),
  z.object({ type: z.literal("faq"), title: z.string().trim().min(2).max(200), text: z.string().trim().min(20).max(50_000) }),
  z.object({ type: z.literal("url"), title: z.string().trim().min(2).max(200), url: z.string().url().max(500).refine((u) => /^https:\/\//.test(u), m("Yalnız https bağlantıları")) }),
  z.object({ type: z.literal("file"), title: z.string().trim().min(2).max(200), assetId: z.string().regex(/^[a-f0-9]{24}$/i) }),
]);

/**
 * Yükleme → Doğrulama → Metin çıkarma → Parçalama → Gömme → İndeksleme → Kullanıma alma.
 * Kaynak eklemek "knowledge_use" rızası gerektirir; işleme kuyruktan asenkron yürür.
 */
export async function addKnowledgeSource(userId: string, raw: unknown) {
  const input = knowledgeInputSchema.parse(raw);
  const { creator, twin } = await getOrCreateTwin(userId);
  const consents = await activeConsents(creator._id);
  if (!consents.has("knowledge_use")) throw new AppError("Bilgi tabanı için önce kullanım iznini (rıza) vermelisin.", "consent_required", 403);
  const count = await KnowledgeSource.countDocuments({ creatorId: creator._id, status: { $ne: "disabled" } });
  if (count >= 200) throw new AppError("En fazla 200 bilgi kaynağı eklenebilir.", "limit");
  let sizeBytes = 0;
  let mime: string | null = null;
  if (input.type === "file") {
    const asset = await MediaAsset.findOne({ _id: oid(input.assetId), ownerId: oid(userId), purpose: "knowledge", status: "ready" }).lean();
    if (!asset) throw new AppError("Dosya bulunamadı veya henüz hazır değil.", "asset_invalid");
    sizeBytes = asset.sizeBytes;
    mime = asset.mime;
  }
  const source = await KnowledgeSource.create({
    creatorId: creator._id,
    twinId: twin._id,
    type: input.type,
    title: input.title,
    status: "validating",
    approved: true,
    text: input.type === "text" || input.type === "faq" ? input.text : null,
    url: input.type === "url" ? input.url : null,
    assetId: input.type === "file" ? oid(input.assetId) : null,
    mime,
    sizeBytes: input.type === "text" || input.type === "faq" ? input.text.length : sizeBytes,
  });
  await enqueueJob("knowledge.ingest", { sourceId: source._id.toString() }, { dedupeKey: `ingest:${source._id.toString()}:1` });
  return source.toObject();
}

export async function listKnowledgeSources(userId: string) {
  const { creator } = await getOrCreateTwin(userId);
  const sources = await KnowledgeSource.find({ creatorId: creator._id }).sort({ createdAt: -1 }).limit(300).lean<IKnowledgeSource[]>();
  return { creator, sources };
}

/** Onay kaldırılınca parçalar anında devre dışı (RAG artık kullanmaz). */
export async function setKnowledgeApproved(userId: string, sourceId: string, approved: boolean) {
  const { creator } = await getOrCreateTwin(userId);
  const res = await KnowledgeSource.updateOne({ _id: oid(sourceId), creatorId: creator._id }, { $set: { approved } });
  if (!res.matchedCount) throw new NotFoundError("Kaynak bulunamadı.");
  await KnowledgeChunk.updateMany({ sourceId: oid(sourceId), creatorId: creator._id }, { $set: { active: approved } });
}

export async function deleteKnowledgeSource(userId: string, sourceId: string) {
  await connectDb();
  const { creator } = await getOrCreateTwin(userId);
  const src = await KnowledgeSource.findOneAndDelete({ _id: oid(sourceId), creatorId: creator._id });
  if (!src) throw new NotFoundError("Kaynak bulunamadı.");
  await KnowledgeChunk.deleteMany({ sourceId: src._id });
}

export async function reindexKnowledgeSource(userId: string, sourceId: string) {
  const { creator } = await getOrCreateTwin(userId);
  const src = await KnowledgeSource.findOne({ _id: oid(sourceId), creatorId: creator._id });
  if (!src) throw new NotFoundError("Kaynak bulunamadı.");
  src.status = "validating";
  src.error = null;
  await src.save();
  await enqueueJob("knowledge.ingest", { sourceId }, { dedupeKey: `ingest:${sourceId}:${Date.now()}` });
}
