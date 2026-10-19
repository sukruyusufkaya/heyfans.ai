import "server-only";
import type { Types } from "mongoose";
import { AppError } from "@/lib/errors";
import { CreatorProfile } from "@/models/creator";

/**
 * Örnek profiller: platformun kurgusal tanıtım karakterleri (scripts/db/samples.ts ile canlıya aktarılır).
 * Herkese açık görünürler, takip edilebilir ve günlük ücretsiz mesaj hakkıyla sohbet edilebilirler;
 * abonelik, içerik satın alma, hediye/bahşiş, özel talep, ücretli görüşme ve kredili sohbet KAPALIDIR.
 */
export const SAMPLE_PROFILE_LABEL = "Örnek profil";
/** Örnek profil kullanıcılarının e-posta alanı: `.invalid` (RFC 2606) — hiçbir zaman teslim edilmez; parolasız, giriş yapılamaz. */
export const SAMPLE_EMAIL_DOMAIN = "ornek.heyfans.invalid";
export const SAMPLE_PURCHASE_MESSAGE = "Bu bir örnek profildir; abonelik, satın alma, hediye ve ücretli etkileşimler kapalıdır.";

export class SampleProfileError extends AppError {
  constructor(message = SAMPLE_PURCHASE_MESSAGE) {
    super(message, "sample_profile", 403);
  }
}

/** Elde yüklenmiş creator belgesi için (isSample alanı projeksiyonda olmalı). */
export function assertNotSample(creator: { isSample?: boolean | null } | null | undefined) {
  if (creator?.isSample) throw new SampleProfileError();
}

/** Örnek profile ait bir işlem için ödeme/kredi harcamasını sunucuda reddeder. */
export async function assertPurchasableCreator(creatorId: Types.ObjectId | string) {
  assertNotSample(await CreatorProfile.findById(creatorId, { isSample: 1 }).lean());
}

/** Örnek profillerin kimlikleri (sayaçlardan hariç tutmak için). */
export async function sampleCreatorIds() {
  const docs = await CreatorProfile.find({ isSample: true }, { _id: 1, userId: 1 }).lean();
  return { creatorIds: docs.map((d) => d._id), userIds: docs.map((d) => d.userId) };
}
