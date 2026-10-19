import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { connectDb } from "@/lib/db/mongo";
import { AppError, NotFoundError } from "@/lib/errors";
import { ForbiddenError } from "@/lib/permissions";
import { getStorage } from "@/lib/storage";
import { oid } from "@/lib/validation/common";
import { ContentItem, MediaAsset, type IMediaAsset } from "@/models/content";
import { CreatorProfile } from "@/models/creator";
import { CustomRequest } from "@/models/monetization";
import { decideContentAccess, type Viewer } from "@/services/content/access";

export type MediaPurpose = IMediaAsset["purpose"];

const RULES: Record<string, { mimes: string[]; maxBytes: number; kind: IMediaAsset["kind"] }> = {
  image: { mimes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 15 * 1024 * 1024, kind: "image" },
  video: { mimes: ["video/mp4", "video/webm", "video/quicktime"], maxBytes: 500 * 1024 * 1024, kind: "video" },
  audio: { mimes: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg"], maxBytes: 50 * 1024 * 1024, kind: "audio" },
  document: { mimes: ["application/pdf", "text/plain", "text/markdown", "text/csv"], maxBytes: 20 * 1024 * 1024, kind: "document" },
};

const PURPOSE_KINDS: Record<MediaPurpose, string[]> = {
  avatar: ["image"],
  cover: ["image"],
  cms: ["image"],
  content: ["image", "video", "audio"],
  content_preview: ["image"],
  knowledge: ["document"],
  voice_sample: ["audio"],
  deliverable: ["image", "video", "audio"],
};

const PUBLIC_PURPOSES: MediaPurpose[] = ["avatar", "cover", "cms", "content_preview"];

function ruleFor(mime: string) {
  return Object.values(RULES).find((r) => r.mimes.includes(mime));
}

/** Dosya imzası (magic bytes) — beyan edilen MIME ile içerik eşleşmeli. */
export function sniffMime(head: Buffer): string | null {
  const hex = head.subarray(0, 12).toString("hex");
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("89504e470d0a1a0a")) return "image/png";
  if (head.subarray(0, 4).toString() === "RIFF" && head.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (head.subarray(0, 4).toString() === "RIFF" && head.subarray(8, 12).toString() === "WAVE") return "audio/wav";
  if (head.subarray(4, 8).toString() === "ftyp") return "video/mp4"; // mp4/mov/m4a ailesi
  if (hex.startsWith("1a45dfa3")) return "video/webm";
  if (head.subarray(0, 3).toString() === "ID3" || hex.startsWith("fffb") || hex.startsWith("fff3")) return "audio/mpeg";
  if (head.subarray(0, 4).toString() === "OggS") return "audio/ogg";
  if (head.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  return null;
}

function compatible(declared: string, sniffed: string | null) {
  if (declared.startsWith("text/")) return sniffed === null; // metin dosyalarının imzası yok
  if (!sniffed) return false;
  if (sniffed === "video/mp4") return ["video/mp4", "video/quicktime", "audio/mp4"].includes(declared);
  if (sniffed === "video/webm") return ["video/webm", "audio/webm"].includes(declared);
  if (sniffed === "audio/wav") return ["audio/wav", "audio/x-wav"].includes(declared);
  return sniffed === declared;
}

/** Yükleme başlatma: MediaAsset (pending_upload) + istemcinin doğrudan yükleyeceği hedef. */
export async function createUpload(user: { id: string }, input: { purpose: MediaPurpose; mime: string; sizeBytes: number; fileName?: string }) {
  const rule = ruleFor(input.mime);
  if (!rule || !PURPOSE_KINDS[input.purpose].includes(rule.kind)) throw new AppError("Bu dosya türü bu alan için desteklenmiyor.", "unsupported_type");
  if (input.sizeBytes <= 0 || input.sizeBytes > rule.maxBytes) throw new AppError(`Dosya boyutu en fazla ${Math.round(rule.maxBytes / 1024 / 1024)} MB olabilir.`, "too_large");
  await connectDb();
  const creator = await CreatorProfile.findOne({ userId: oid(user.id) }, { _id: 1 }).lean();
  if (["content", "content_preview", "knowledge", "voice_sample", "deliverable"].includes(input.purpose) && !creator) {
    throw new AppError("Bu yükleme yalnız içerik üreticileri içindir.", "creator_only", 403);
  }
  const ext = input.mime.split("/")[1]?.replace("quicktime", "mov").replace("mpeg", "mp3").replace("x-wav", "wav") ?? "bin";
  const visibility = PUBLIC_PURPOSES.includes(input.purpose) ? "public" : "private";
  const storageKey = `${visibility}/${input.purpose}/${user.id}/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const asset = await MediaAsset.create({
    ownerId: oid(user.id),
    creatorId: creator?._id ?? null,
    kind: rule.kind,
    purpose: input.purpose,
    mime: input.mime,
    sizeBytes: input.sizeBytes,
    storageKey,
    visibility,
    status: "pending_upload",
    originalName: input.fileName?.slice(0, 255) ?? null,
  });
  const target = await getStorage().uploadTarget(storageKey, input.mime, asset._id.toString());
  return { assetId: asset._id.toString(), upload: target };
}

/** Yerel geliştirme yüklemesi (s3'te istemci doğrudan S3'e yükler). */
export async function receiveLocalUpload(user: { id: string }, assetId: string, body: Buffer) {
  await connectDb();
  const asset = await MediaAsset.findOne({ _id: oid(assetId), ownerId: oid(user.id), status: "pending_upload" });
  if (!asset) throw new NotFoundError("Yükleme bulunamadı.");
  if (body.length > asset.sizeBytes * 1.05 + 1024) throw new AppError("Dosya beyan edilen boyuttan büyük.", "size_mismatch");
  await getStorage().put(asset.storageKey, body, asset.mime);
}

/** Yükleme tamamlama: nesne var mı, boyut ve imza doğru mu? Ardından "ready". */
export async function completeUpload(user: { id: string }, assetId: string) {
  await connectDb();
  const asset = await MediaAsset.findOne({ _id: oid(assetId), ownerId: oid(user.id) });
  if (!asset) throw new NotFoundError("Yükleme bulunamadı.");
  if (asset.status === "ready") return asset.toObject();
  const storage = getStorage();
  const head = await storage.head(asset.storageKey);
  if (!head) throw new AppError("Dosya yüklenmemiş.", "missing_object");
  const rule = ruleFor(asset.mime)!;
  if (head.size > rule.maxBytes) {
    await storage.remove(asset.storageKey);
    asset.status = "rejected";
    await asset.save();
    throw new AppError("Dosya boyut sınırını aşıyor.", "too_large");
  }
  const first = await storage.readRange(asset.storageKey, 16);
  if (!compatible(asset.mime, sniffMime(first))) {
    await storage.remove(asset.storageKey);
    asset.status = "rejected";
    await asset.save();
    throw new AppError("Dosya içeriği beyan edilen türle uyuşmuyor.", "mime_mismatch");
  }
  asset.sizeBytes = head.size;
  asset.status = "ready";
  // Virüs/CSAM taraması için harici sağlayıcı yapılandırılmadı: "skipped" olarak işaretlenir ve
  // içerik moderasyon kuyruğuna (yayın öncesi) düşer. Bkz. docs/known-limitations.md
  asset.scan = { status: "skipped", provider: null, checkedAt: new Date() };
  if (head.size < 25 * 1024 * 1024) asset.checksumSha256 = createHash("sha256").update(await storage.read(asset.storageKey)).digest("hex");
  await asset.save();
  return asset.toObject();
}

/**
 * Medya erişim kararı: genel varlıklar herkese; özel varlıklar sahibine, içerik erişimi olana
 * (decideContentAccess), özel talep teslimatında ilgili hayrana ve yetkili admin'e.
 */
export async function authorizeMediaRead(viewer: (Viewer & { isAdmin?: boolean }) | null, assetId: string) {
  await connectDb();
  const asset = await MediaAsset.findOne({ _id: oid(assetId), status: "ready" }).lean<IMediaAsset>();
  if (!asset) throw new NotFoundError("Medya bulunamadı.");
  if (asset.visibility === "public") return asset;
  if (!viewer) throw new ForbiddenError("Bu medyaya erişim yetkin yok.");
  if (asset.ownerId.toString() === viewer.id || viewer.isAdmin) return asset;
  if (asset.purpose === "content") {
    const content = await ContentItem.findOne({ mediaAssetIds: asset._id }).lean();
    if (content) {
      const decision = await decideContentAccess(viewer, content);
      if (decision.allowed) return asset;
    }
  }
  if (asset.purpose === "deliverable") {
    const req = await CustomRequest.exists({ deliverableAssetIds: asset._id, fanId: oid(viewer.id), status: "completed" });
    if (req) return asset;
  }
  throw new ForbiddenError("Bu medyaya erişim yetkin yok.");
}

export async function mediaUrl(asset: Pick<IMediaAsset, "_id" | "storageKey" | "visibility">) {
  const storage = getStorage();
  if (asset.visibility === "public") return storage.publicUrl(asset.storageKey) ?? `/api/media/${asset._id.toString()}`;
  return `/api/media/${asset._id.toString()}`;
}
