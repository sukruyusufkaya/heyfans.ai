import type { Metadata } from "next";
import { TestLab } from "@/features/studio/test-lab";
import { getT } from "@/i18n/server";
import { requireCreator } from "@/lib/auth/session";
import { aiStatus } from "@/lib/ai/provider";
import { TWIN_STATUS_LABELS } from "@/lib/state-machines";
import { getTestSession } from "@/services/studio/test-lab";
import { getTwinContext } from "@/services/studio/twin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("AI İkizi Testi") };
}

export default async function TestPage() {
  const t = await getT();
  const { user } = await requireCreator();
  const { creator, twin } = await getTwinContext(user.id);
  const session = await getTestSession(user.id);
  const ai = aiStatus();
  return (
    <TestLab
      conversationId={session.conversationId}
      initialMessages={session.messages}
      creatorName={creator.displayName}
      avatarUrl={creator.avatarUrl ?? null}
      aiAvailable={ai.available}
      twinStatus={t(TWIN_STATUS_LABELS[twin.status])}
      version={twin.currentVersion}
      quality={{ personaScore: twin.quality.personaScore, knowledgeScore: twin.quality.knowledgeScore, safetyScore: twin.quality.safetyScore, lastTestAt: twin.quality.lastTestAt ? new Date(twin.quality.lastTestAt).toISOString() : null }}
    />
  );
}
