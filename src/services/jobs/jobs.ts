import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { IngestionJob, KnowledgeSource, type IIngestionJob, type JobType } from "@/models/ai";
import { MediaAsset } from "@/models/content";
import { getStorage } from "@/lib/storage";
import { indexKnowledgeSource } from "@/lib/ai/knowledge";
import { expireSubscriptions } from "@/services/billing/checkout";
import { ContentItem } from "@/models/content";
import { CreatorProfile } from "@/models/creator";
import { setContentStatus } from "@/services/content/manage";

/** İş kuyruğu (MongoDB): kilitle → çalıştır → üstel geri çekilmeyle yeniden dene. */
export async function enqueueJob(type: JobType, payload: Record<string, unknown>, opts: { dedupeKey?: string; runAfter?: Date } = {}) {
  await connectDb();
  if (opts.dedupeKey) {
    const res = await IngestionJob.findOneAndUpdate(
      { dedupeKey: opts.dedupeKey },
      { $setOnInsert: { type, payload, dedupeKey: opts.dedupeKey, runAfter: opts.runAfter ?? new Date(), status: "queued" } },
      { upsert: true, returnDocument: "after" },
    );
    return res!.toObject();
  }
  return (await IngestionJob.create({ type, payload, runAfter: opts.runAfter ?? new Date() })).toObject();
}

async function extractText(sourceId: string): Promise<string> {
  const source = await KnowledgeSource.findById(sourceId);
  if (!source) throw new Error("Kaynak bulunamadı");
  if (source.type === "text" || source.type === "faq") return source.text ?? "";
  if (source.type === "url" && source.url) {
    const res = await fetch(source.url, { headers: { "User-Agent": "HEYFANS-KnowledgeBot/1.0" }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`URL okunamadı (${res.status})`);
    const html = (await res.text()).slice(0, 2_000_000);
    return html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200_000);
  }
  if (source.type === "file" && source.assetId) {
    const asset = await MediaAsset.findById(source.assetId).lean();
    if (!asset) throw new Error("Dosya bulunamadı");
    const buf = await getStorage().read(asset.storageKey);
    if (asset.mime === "application/pdf") {
      const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await pdfText(pdf, { mergePages: true });
      return String(text).slice(0, 200_000);
    }
    return buf.toString("utf8").slice(0, 200_000);
  }
  return "";
}

async function runJob(job: IIngestionJob) {
  switch (job.type) {
    case "knowledge.ingest": {
      const sourceId = String(job.payload.sourceId);
      await KnowledgeSource.updateOne({ _id: sourceId }, { $set: { status: "extracting", error: null } });
      const text = await extractText(sourceId);
      if (!text.trim()) throw new Error("Kaynakta metin bulunamadı");
      await KnowledgeSource.updateOne({ _id: sourceId }, { $set: { text: text.slice(0, 200_000) } });
      const { Types } = await import("mongoose");
      await indexKnowledgeSource(new Types.ObjectId(sourceId), text);
      return;
    }
    case "subscriptions.expire":
      await expireSubscriptions();
      return;
    default:
      return;
  }
}

/** Bekleyen işleri sırayla işler (cron veya after() tetikler). */
export async function processJobs(limit = 5, budgetMs = 50_000) {
  await connectDb();
  const started = Date.now();
  let processed = 0;
  while (processed < limit && Date.now() - started < budgetMs) {
    const now = new Date();
    const job = await IngestionJob.findOneAndUpdate(
      { status: { $in: ["queued", "running"] }, runAfter: { $lte: now }, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
      { $set: { status: "running", lockedUntil: new Date(Date.now() + 120_000) }, $inc: { attempts: 1 } },
      { sort: { runAfter: 1 }, returnDocument: "after" },
    ).lean<IIngestionJob>();
    if (!job) break;
    try {
      await runJob(job);
      await IngestionJob.updateOne({ _id: job._id }, { $set: { status: "succeeded", finishedAt: new Date(), lockedUntil: null, lastError: null } });
    } catch (err) {
      const msg = String((err as Error).message ?? err).slice(0, 1000);
      const final = job.attempts >= job.maxAttempts;
      await IngestionJob.updateOne(
        { _id: job._id },
        { $set: { status: final ? "failed" : "queued", lastError: msg, lockedUntil: null, runAfter: new Date(Date.now() + Math.min(3600_000, 2 ** job.attempts * 15_000)) } },
      );
      if (final && job.type === "knowledge.ingest") await KnowledgeSource.updateOne({ _id: String(job.payload.sourceId) }, { $set: { status: "failed", error: msg } });
    }
    processed++;
  }
  return { processed };
}

/** Zamanı gelen taslak içerikleri yayınlar (cron). Creator onaylı değilse içerik incelemeye düşer. */
export async function publishScheduledContent(limit = 100) {
  await connectDb();
  const due = await ContentItem.find({ status: "draft", scheduledAt: { $ne: null, $lte: new Date() } }, { _id: 1, creatorId: 1 }).limit(limit).lean();
  let published = 0;
  for (const d of due) {
    const creator = await CreatorProfile.findById(d.creatorId, { userId: 1 }).lean();
    if (!creator) continue;
    try {
      await setContentStatus(creator.userId.toString(), d._id.toString(), "published");
      published++;
    } catch (err) {
      console.error("[jobs:scheduled-publish]", d._id.toString(), (err as Error).message);
    }
  }
  return published;
}
