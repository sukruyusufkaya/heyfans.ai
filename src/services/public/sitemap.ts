import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { Category } from "@/models/content";
import { CreatorProfile } from "@/models/creator";
import { CmsPage } from "@/models/platform";

/** Site haritası için yalnız herkese açık kayıtlar: onaylı creator'lar, aktif kategoriler ve hukuken onaylı yasal sayfalar. */
export async function sitemapEntities() {
  await connectDb();
  const [creators, categories, legal] = await Promise.all([
    CreatorProfile.find({ status: "approved" }, { username: 1, updatedAt: 1 }).sort({ "stats.followers": -1 }).limit(5000).lean<{ username: string; updatedAt: Date }[]>(),
    Category.find({ isActive: true }, { slug: 1, updatedAt: 1 }).lean<{ slug: string; updatedAt: Date }[]>(),
    // Taslak (hukuk onayı bekleyen) sayfalar noindex olduğundan haritaya girmez
    CmsPage.find({ kind: "legal", status: "published", locale: "tr", legalReview: { $in: ["approved", "not_required"] } }, { slug: 1, updatedAt: 1 }).lean<{ slug: string; updatedAt: Date }[]>(),
  ]);
  return {
    creators: creators.map((c) => ({ username: c.username, updatedAt: c.updatedAt })),
    categories: categories.map((c) => ({ slug: c.slug, updatedAt: c.updatedAt })),
    legal: legal.map((l) => ({ slug: l.slug, updatedAt: l.updatedAt })),
  };
}
