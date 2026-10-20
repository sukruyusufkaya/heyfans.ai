import type { Metadata } from "next";
import { ContentForm } from "@/features/studio/content-form";
import { getT } from "@/i18n/server";
import { requireCreator } from "@/lib/auth/session";
import { listCategories } from "@/services/creators/public";
import { studioCreator } from "@/services/studio/context";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("İçerik Oluşturma") };
}

export default async function NewContentPage() {
  const t = await getT();
  const { user } = await requireCreator();
  const [creator, cats] = await Promise.all([studioCreator(user.id), listCategories()]);
  return (
    <ContentForm
      creatorApproved={creator.status === "approved"}
      categories={cats.filter((c) => !c.parentSlug).map((c) => ({ slug: c.slug, name: t(c.name) }))}
      initial={{ type: "photo", title: "", caption: "", access: "public", minPlanTier: null, priceMinor: null, categories: [], tags: [], isAiGenerated: false, scheduledAt: null, media: [], preview: null }}
    />
  );
}
