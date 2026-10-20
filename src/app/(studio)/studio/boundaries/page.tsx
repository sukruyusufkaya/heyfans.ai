import type { Metadata } from "next";
import { BoundariesEditor } from "@/features/studio/boundaries-editor";
import { getT } from "@/i18n/server";
import { requireCreator } from "@/lib/auth/session";
import { getPlatformSettings } from "@/services/platform/settings";
import { getTwinContext } from "@/services/studio/twin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Sınırlar ve İzinler") };
}

export default async function BoundariesPage() {
  const { user } = await requireCreator();
  const [{ twin }, settings] = await Promise.all([getTwinContext(user.id), getPlatformSettings()]);
  return <BoundariesEditor initial={JSON.parse(JSON.stringify(twin.draft.boundaries))} adultContent={settings.features.adultContent} locked={twin.status === "revoked"} />;
}
