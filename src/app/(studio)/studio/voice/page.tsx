import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { VoiceStudio } from "@/features/studio/voice-studio";
import { requireCreator } from "@/lib/auth/session";
import { rtcStatus } from "@/lib/rtc";
import { CONSENT_TEXTS } from "@/services/ai-twins/lifecycle";
import { getTwinContext, getVoiceSamples } from "@/services/studio/twin";

export const metadata: Metadata = { title: "Ses ve Görünüm" };

export default async function VoicePage() {
  const { user } = await requireCreator();
  const { twin, creator, consents, consentRows, identityVerified } = await getTwinContext(user.id);
  const v = twin.draft.voice;
  const samples = await getVoiceSamples(creator.userId, v.voiceSampleAssetIds);
  const consentAt = Object.fromEntries(consentRows.map((r) => [r.kind, r.grantedAt.toISOString()]));
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader eyebrow={STUDIO_EYEBROW} title="Ses ve Görünüm" description="AI ikizinin onaylı sesini, görsel kimliğini ve kullanım izinlerini düzenle." />
      <VoiceStudio
        identityVerified={identityVerified}
        consents={consents}
        consentAt={consentAt}
        texts={{ voice_likeness: CONSENT_TEXTS.voice_likeness.text, image_likeness: CONSENT_TEXTS.image_likeness.text, video_likeness: CONSENT_TEXTS.video_likeness.text }}
        voice={{ voiceEnabled: v.voiceEnabled, videoEnabled: v.videoEnabled, imageLikenessEnabled: v.imageLikenessEnabled, voiceProfileStatus: v.voiceProfileStatus, pitch: v.pitch, speed: v.speed, tone: v.tone }}
        samples={samples}
        rtcConfigured={rtcStatus().configured}
        avatarUrl={creator.avatarUrl ?? null}
        creatorName={creator.displayName}
        locked={twin.status === "revoked"}
      />
    </div>
  );
}
