import type { Metadata } from "next";
import { PersonaEditor } from "@/features/studio/persona-editor";
import { requireCreator } from "@/lib/auth/session";
import { getTwinContext } from "@/services/studio/twin";

export const metadata: Metadata = { title: "Kişilik Stüdyosu" };

export default async function PersonalityPage() {
  const { user } = await requireCreator();
  const { twin, creator } = await getTwinContext(user.id);
  const p = twin.draft.persona;
  // Mongoose alt belgesi → düz nesne (istemciye yalnız JSON güvenli veri geçer)
  const initial = JSON.parse(JSON.stringify(p));
  return <PersonaEditor initial={initial} avatarUrl={creator.avatarUrl ?? null} creatorName={creator.displayName} personaScore={twin.quality.personaScore} locked={twin.status === "revoked"} />;
}
