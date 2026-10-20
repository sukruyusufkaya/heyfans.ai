import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { CmsPage, HomepageSection, type ICmsPage, type IHomepageSection } from "@/models/platform";
import type { Locale } from "@/i18n/config";

/** Sayfa bölümleri (ana sayfa vb.) — yayın penceresine göre filtrelenir. */
export async function getSections(page: IHomepageSection["page"]) {
  await connectDb();
  const now = new Date();
  const rows = await HomepageSection.find({
    page,
    isActive: true,
    $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: now } }] }, { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }],
  })
    .sort({ order: 1 })
    .lean<IHomepageSection[]>();
  return Object.fromEntries(rows.map((r) => [r.key, r])) as Record<string, IHomepageSection | undefined>;
}

export async function getCmsPage(slug: string, locale: Locale = "tr") {
  await connectDb();
  return CmsPage.findOne({ slug, locale, status: "published" }).lean<ICmsPage>();
}
