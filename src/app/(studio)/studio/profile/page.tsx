import type { Metadata } from "next";
import { ProfileEditor } from "@/features/studio/profile-editor";
import { getT } from "@/i18n/server";
import { requireCreator } from "@/lib/auth/session";
import { listCategories } from "@/services/creators/public";
import { studioCreator } from "@/services/studio/context";
import { getTwinContext } from "@/services/studio/twin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Profil Düzenleyici") };
}

export default async function ProfilePage() {
  const t = await getT();
  const { user } = await requireCreator();
  const [c, cats, ctx] = await Promise.all([studioCreator(user.id), listCategories(), getTwinContext(user.id)]);
  return (
    <ProfileEditor
      categories={cats.filter((x) => !x.parentSlug).map((x) => ({ slug: x.slug, name: t(x.name) }))}
      initial={{
        username: c.username,
        displayName: c.displayName,
        headline: c.headline ?? "",
        bio: c.bio ?? "",
        categories: c.categories,
        tags: c.tags,
        location: c.location ?? "",
        languages: c.languages.length ? c.languages : ["tr"],
        socialLinks: c.socialLinks.map((l) => ({ platform: l.platform, handle: l.handle, url: l.url ?? "", verified: l.verified })),
        avatarUrl: c.avatarUrl ?? null,
        coverUrl: c.coverUrl ?? null,
        verified: c.verification.identity === "verified",
        twinLive: ctx.twin.status === "live",
      }}
    />
  );
}
