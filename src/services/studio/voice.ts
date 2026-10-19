import "server-only";
import { AppError, NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { getStorage } from "@/lib/storage";
import { oid } from "@/lib/validation/common";
import { MediaAsset } from "@/models/content";
import { activeConsents, getOrCreateTwin } from "@/services/ai-twins/lifecycle";

const MAX_SAMPLES = 10;

/**
 * Ses örneği ekler. Açık "voice_likeness" rızası şarttır; yükleme sağlayıcısı henüz ses profili
 * üretmediği için durum "none" kalır (örnekler yalnız saklanır).
 */
export async function addVoiceSample(userId: string, assetId: string) {
  const { creator, twin } = await getOrCreateTwin(userId);
  const consents = await activeConsents(creator._id);
  if (!consents.has("voice_likeness")) throw new AppError("Ses örneği eklemek için önce ses benzerliği iznini vermelisin.", "consent_required", 403);
  const asset = await MediaAsset.findOne({ _id: oid(assetId), ownerId: creator.userId, purpose: "voice_sample", status: "ready" }).lean();
  if (!asset) throw new AppError("Ses dosyası bulunamadı veya henüz hazır değil.", "asset_invalid");
  const ids = twin.draft.voice.voiceSampleAssetIds;
  if (ids.length >= MAX_SAMPLES) throw new AppError(`En fazla ${MAX_SAMPLES} ses örneği eklenebilir.`, "limit");
  if (!ids.some((i) => i.equals(asset._id))) ids.push(asset._id);
  twin.markModified("draft");
  await twin.save();
  await audit({ actorId: userId, action: "twin.voice_sample_add", targetType: "AiTwin", targetId: twin._id.toString() });
}

export async function removeVoiceSample(userId: string, assetId: string) {
  const { creator, twin } = await getOrCreateTwin(userId);
  const id = oid(assetId);
  const before = twin.draft.voice.voiceSampleAssetIds.length;
  twin.draft.voice.voiceSampleAssetIds = twin.draft.voice.voiceSampleAssetIds.filter((i) => !i.equals(id));
  if (twin.draft.voice.voiceSampleAssetIds.length === before) throw new NotFoundError("Ses örneği bulunamadı.");
  twin.markModified("draft");
  await twin.save();
  const asset = await MediaAsset.findOneAndUpdate({ _id: id, ownerId: creator.userId, purpose: "voice_sample" }, { $set: { status: "deleted" } }, { returnDocument: "after" });
  if (asset) await getStorage().remove(asset.storageKey).catch(() => undefined);
  await audit({ actorId: userId, action: "twin.voice_sample_remove", targetType: "AiTwin", targetId: twin._id.toString() });
}
