import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { StudioSettings } from "@/features/studio/studio-settings";
import { requireCreator } from "@/lib/auth/session";
import { CONSENT_TEXTS } from "@/services/ai-twins/lifecycle";
import { getPlatformSettings } from "@/services/platform/settings";
import { getNotificationPrefs } from "@/services/studio/settings";
import { getTwinContext } from "@/services/studio/twin";

export const metadata: Metadata = { title: "Stüdyo Ayarları" };

export default async function SettingsPage() {
  const { user } = await requireCreator();
  const [ctx, platform, prefs] = await Promise.all([getTwinContext(user.id), getPlatformSettings(), getNotificationPrefs(user.id)]);
  const { twin, creator } = ctx;
  const consentAt = ctx.consentRows.find((r) => r.kind === "ai_twin_persona")?.grantedAt;
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader eyebrow={STUDIO_EYEBROW} title="Stüdyo Ayarları" description="Creator hesabını, AI ikizi fiyatlarını ve bildirimlerini yönet." />
      <StudioSettings
        account={{ name: creator.displayName, username: creator.username, email: user.email, avatarUrl: creator.avatarUrl ?? null, verified: ctx.identityVerified }}
        twinStatus={twin.status}
        creatorApproved={creator.status === "approved"}
        hasPersonaConsent={ctx.consents.includes("ai_twin_persona")}
        personaConsentText={CONSENT_TEXTS.ai_twin_persona.text}
        personaConsentAt={consentAt ? consentAt.toISOString() : null}
        pricing={{ messageCredits: twin.pricing.messageCredits, freeMessagesPerDay: twin.pricing.freeMessagesPerDay, voicePerMinuteCredits: twin.pricing.voicePerMinuteCredits, videoPerMinuteCredits: twin.pricing.videoPerMinuteCredits }}
        maxMessageCredits={platform.chat.maxMessageCredits}
        allowCustomRequests={twin.draft.boundaries.allowCustomRequests}
        prefs={prefs}
      />
    </div>
  );
}
