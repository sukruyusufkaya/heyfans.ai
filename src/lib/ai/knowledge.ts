import "server-only";
import type { Types } from "mongoose";
import { env } from "@/config/env";
import { connectDb } from "@/lib/db/mongo";
import { AiUsageRecord, KnowledgeChunk, KnowledgeSource, type IKnowledgeChunk } from "@/models/ai";
import { costMicroUsd, getAiProvider, type AiProvider } from "./provider";

/** Metni ~800 karakterlik, 120 karakter örtüşmeli parçalara böler (paragraf/cümle sınırlarını korur). */
export function chunkText(text: string, size = 800, overlap = 120): string[] {
  const clean = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(clean.length, start + size);
    if (end < clean.length) {
      const window = clean.slice(start, end);
      const br = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "));
      if (br > size * 0.5) end = start + br + 1;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter((c) => c.length > 20);
}

export function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/**
 * Knowledge Engine — yalnız ilgili creator'ın, onaylı ve etkin parçalarından bağlam getirir.
 * creatorId filtresi her iki modda da zorunludur (creator'lar arası izolasyon).
 */
export async function retrieveKnowledge(
  creatorId: Types.ObjectId,
  query: string,
  opts: { k?: number; provider?: AiProvider } = {},
): Promise<{ sourceId: Types.ObjectId; title: string; text: string; score: number }[]> {
  await connectDb();
  const k = opts.k ?? 4;
  const hasChunks = await KnowledgeChunk.exists({ creatorId, active: true });
  if (!hasChunks || !query.trim()) return [];
  const provider = opts.provider ?? getAiProvider();
  const { vectors } = await provider.embed([query.slice(0, 2000)]);
  const qv = vectors[0]!;
  let hits: { chunk: Pick<IKnowledgeChunk, "sourceId" | "text">; score: number }[];

  if (env().VECTOR_SEARCH_MODE === "atlas") {
    const rows = await KnowledgeChunk.aggregate<{ sourceId: Types.ObjectId; text: string; score: number }>([
      {
        $vectorSearch: {
          index: "knowledge_vector",
          path: "embedding",
          queryVector: qv,
          numCandidates: 100,
          limit: k,
          filter: { creatorId, active: true },
        },
      } as never,
      { $project: { sourceId: 1, text: 1, score: { $meta: "vectorSearchScore" } } },
    ]);
    hits = rows.map((r) => ({ chunk: r, score: r.score }));
  } else {
    const chunks = await KnowledgeChunk.find({ creatorId, active: true, embeddingModel: provider.embeddingModel }, { sourceId: 1, text: 1, embedding: 1 }).limit(3000).lean<IKnowledgeChunk[]>();
    hits = chunks
      .map((c) => ({ chunk: c, score: cosine(qv, c.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
  const minScore = provider.isMock ? 0.05 : 0.25;
  hits = hits.filter((h) => h.score >= minScore);
  if (!hits.length) return [];
  const sources = await KnowledgeSource.find({ _id: { $in: hits.map((h) => h.chunk.sourceId) }, creatorId, approved: true, status: "indexed" }, { title: 1 }).lean();
  const titles = new Map(sources.map((s) => [s._id.toString(), s.title]));
  return hits.filter((h) => titles.has(h.chunk.sourceId.toString())).map((h) => ({ sourceId: h.chunk.sourceId, title: titles.get(h.chunk.sourceId.toString())!, text: h.chunk.text, score: h.score }));
}

/** Kaynağın metnini parçalar, gömer ve indeksler. Yeniden çalıştırılabilir (önce eski parçaları siler). */
export async function indexKnowledgeSource(sourceId: Types.ObjectId, text: string) {
  await connectDb();
  const source = await KnowledgeSource.findById(sourceId);
  if (!source) throw new Error("Kaynak bulunamadı");
  const provider = getAiProvider();
  source.status = "chunking";
  await source.save();
  const pieces = chunkText(text);
  if (!pieces.length) {
    source.status = "failed";
    source.error = "Kaynakta işlenebilir metin bulunamadı.";
    await source.save();
    return;
  }
  source.status = "embedding";
  await source.save();
  const vectors: number[][] = [];
  let inputTokens = 0;
  for (let i = 0; i < pieces.length; i += 64) {
    const batch = pieces.slice(i, i + 64);
    const res = await provider.embed(batch);
    vectors.push(...res.vectors);
    inputTokens += res.usage.inputTokens;
  }
  await KnowledgeChunk.deleteMany({ sourceId });
  await KnowledgeChunk.insertMany(
    pieces.map((t, idx) => ({
      creatorId: source.creatorId,
      twinId: source.twinId,
      sourceId,
      idx,
      text: t,
      tokenCount: Math.ceil(t.length / 3.6),
      embedding: vectors[idx],
      embeddingModel: provider.embeddingModel,
      active: source.approved,
    })),
  );
  await AiUsageRecord.create({
    kind: "embedding",
    provider: provider.name,
    model: provider.embeddingModel,
    creatorId: source.creatorId,
    twinId: source.twinId,
    inputTokens,
    outputTokens: 0,
    costMicroUsd: costMicroUsd({ inputTokens, outputTokens: 0 }),
    isMock: provider.isMock,
  });
  source.status = "indexed";
  source.chunkCount = pieces.length;
  source.tokenCount = Math.ceil(text.length / 3.6);
  source.indexedAt = new Date();
  source.error = null;
  await source.save();
}
