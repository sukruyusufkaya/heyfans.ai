import "server-only";
import { z } from "zod";
import { AppError, NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { oid } from "@/lib/validation/common";
import { Category, MediaAsset } from "@/models/content";
import { CreatorProfile, SOCIAL_PLATFORMS } from "@/models/creator";
import { mediaUrl } from "@/services/media/media";
import { studioCreator } from "./context";
import { m } from "@/i18n/m";
import { getLocale } from "@/i18n/server";

const assetId = z.string().regex(/^[a-f0-9]{24}$/i, m("Geçersiz dosya"));

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, m("Görünen ad en az 2 karakter")).max(80),
  headline: z.string().trim().max(140, m("En fazla 140 karakter")).optional().default(""),
  bio: z.string().trim().max(1500, m("En fazla 1500 karakter")).optional().default(""),
  categories: z.array(z.string().regex(/^[a-z0-9-]{2,60}$/)).max(5, m("En fazla 5 kategori")),
  tags: z.array(z.string().trim().min(1).max(30)).max(12, m("En fazla 12 etiket")),
  location: z.string().trim().max(80).optional().default(""),
  languages: z.array(z.string().regex(/^[a-z]{2}$/)).min(1, m("En az bir dil seçin")).max(5),
  socialLinks: z
    .array(
      z.object({
        platform: z.enum(SOCIAL_PLATFORMS),
        handle: z.string().trim().min(1, m("Hesap adı gerekli")).max(120),
        url: z.union([z.literal(""), z.string().trim().url(m("Geçerli bir bağlantı girin")).max(500).refine((u) => /^https?:\/\//.test(u), m("Yalnız http(s) bağlantıları"))]).optional(),
      }),
    )
    .max(7),
  /** undefined = değişmez, null = kaldır */
  avatarAssetId: assetId.nullable().optional(),
  coverAssetId: assetId.nullable().optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

async function resolveImage(ownerId: ReturnType<typeof oid>, id: string, purpose: "avatar" | "cover") {
  const asset = await MediaAsset.findOne({ _id: oid(id), ownerId, purpose, status: "ready" }).lean();
  if (!asset) throw new AppError("Görsel bulunamadı veya henüz hazır değil.", "asset_invalid");
  return { asset, url: await mediaUrl(asset) };
}

export async function updateCreatorProfile(userId: string, raw: unknown) {
  const locale = await getLocale();
  const input = profileSchema.parse(raw);
  const creator = await studioCreator(userId);
  if (input.categories.length) {
    const valid = await Category.countDocuments({ slug: { $in: input.categories }, isActive: true });
    if (valid !== new Set(input.categories).size) throw new AppError("Seçilen kategorilerden biri geçerli değil.", "invalid_category");
  }
  const set: Record<string, unknown> = {
    displayName: input.displayName,
    headline: input.headline,
    bio: input.bio,
    categories: input.categories,
    tags: [...new Set(input.tags.map((tag) => tag.toLocaleLowerCase(locale)))],
    location: input.location,
    languages: input.languages,
    socialLinks: input.socialLinks.map((l) => {
      const prev = creator.socialLinks.find((p) => p.platform === l.platform && p.handle === l.handle);
      // Başvuruda alınan kitle büyüklüğü ve ana platform bilgisi korunur.
      return { platform: l.platform, handle: l.handle, url: l.url || undefined, verified: Boolean(prev?.verified), audience: prev?.audience ?? null, primary: Boolean(prev?.primary) };
    }),
  };
  const uid = creator.userId;
  if (input.avatarAssetId === null) Object.assign(set, { avatarAssetId: null, avatarUrl: null });
  else if (input.avatarAssetId) {
    const { asset, url } = await resolveImage(uid, input.avatarAssetId, "avatar");
    Object.assign(set, { avatarAssetId: asset._id, avatarUrl: url });
  }
  if (input.coverAssetId === null) Object.assign(set, { coverAssetId: null, coverUrl: null });
  else if (input.coverAssetId) {
    const { asset, url } = await resolveImage(uid, input.coverAssetId, "cover");
    Object.assign(set, { coverAssetId: asset._id, coverUrl: url });
  }
  const res = await CreatorProfile.updateOne({ _id: creator._id }, { $set: set });
  if (!res.matchedCount) throw new NotFoundError("Creator profili bulunamadı.");
  await audit({ actorId: userId, action: "creator.profile_update", targetType: "CreatorProfile", targetId: creator._id.toString() });
}
