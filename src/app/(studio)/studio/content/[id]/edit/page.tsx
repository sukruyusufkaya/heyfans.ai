import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentForm } from "@/features/studio/content-form";
import { toLocalInput } from "@/features/studio/format";
import { requireCreator } from "@/lib/auth/session";
import { objectIdSchema } from "@/lib/validation/common";
import { listCategories } from "@/services/creators/public";
import { getContentForEdit } from "@/services/studio/content";

export const metadata: Metadata = { title: "İçeriği Düzenle" };

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireCreator();
  const { id } = await params;
  if (!objectIdSchema.safeParse(id).success) notFound();
  const [data, cats] = await Promise.all([getContentForEdit(user.id, id).catch(() => null), listCategories()]);
  if (!data || data.item.status === "removed") notFound();
  const { item, media, preview, creator } = data;
  const strip = (a: { assetId: string; url: string; kind: string; name: string; sizeBytes: number }) => ({ assetId: a.assetId, url: a.url, kind: a.kind, name: a.name, sizeBytes: a.sizeBytes });
  return (
    <ContentForm
      creatorApproved={creator.status === "approved"}
      categories={cats.filter((c) => !c.parentSlug).map((c) => ({ slug: c.slug, name: c.name }))}
      initial={{
        id,
        status: item.status,
        type: item.type,
        title: item.title,
        caption: item.caption ?? "",
        access: item.access,
        minPlanTier: item.minPlanTier ?? null,
        priceMinor: item.price?.amountMinor ?? null,
        categories: item.categories,
        tags: item.tags,
        isAiGenerated: item.isAiGenerated,
        scheduledAt: item.scheduledAt ? toLocalInput(new Date(item.scheduledAt)) : null,
        media: media.map(strip),
        preview: preview ? strip(preview) : null,
      }}
    />
  );
}
