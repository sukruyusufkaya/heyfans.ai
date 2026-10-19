import type { CreatorOnboardingView } from "@/services/auth/creator-onboarding";
import { SOCIAL_PLATFORMS, type AudienceRange, type ContactPreference, type SocialPlatform } from "@/lib/creator-contact";

export type { CreatorOnboardingView };

export interface CreatorCategory {
  slug: string;
  name: string;
  icon: string;
}

export interface ConsentTexts {
  persona: string;
  knowledge: string;
  voice: string;
}

/** Sihirbazın tüm adımlarının taslak değerleri (adım adım sunucuya kaydedilir). */
export interface CreatorDraft {
  // 1 · Profil
  displayName: string;
  username: string;
  headline: string;
  bio: string;
  location: string;
  categories: string[];
  // 2 · İletişim
  phoneCountry: string;
  phoneNational: string;
  contactPreference: ContactPreference;
  contactConsent: boolean;
  // 3 · Sosyal medya (her platform tek soru; "kullanmıyorum" = skip)
  socials: Record<SocialPlatform, SocialAnswer>;
  primary: SocialPlatform | null;
  // 4 · Doğrula
  legalName: string;
  birthYear: string;
  declared: boolean;
  // 5 · AI İkizi
  twinName: string;
  shortBio: string;
  greeting: string;
  consentPersona: boolean;
  // 6 · Özelleştir
  warmth: number;
  formality: number;
  humor: number;
  energy: number;
  emojiUsage: "none" | "low" | "medium" | "high";
  messageLength: "short" | "medium" | "long";
  allowedTopics: string[];
  blockedTopics: string[];
  allowPersonalQuestions: boolean;
  allowMediaRequests: boolean;
  allowCustomRequests: boolean;
  knowledgeConsent: boolean;
  voiceConsent: boolean;
}

export interface SocialAnswer {
  handle: string;
  audience: AudienceRange | null;
  /** Kullanıcı "Bu platformu kullanmıyorum" dedi. */
  skip: boolean;
}

export type FieldErrors = Record<string, string>;

export interface StepProps {
  view: CreatorOnboardingView;
  draft: CreatorDraft;
  set: <K extends keyof CreatorDraft>(key: K, value: CreatorDraft[K]) => void;
  errors: FieldErrors;
}

export function initialDraft(view: CreatorOnboardingView): CreatorDraft {
  const socialDone = view.completedSteps.includes("social");
  const socials = Object.fromEntries(
    SOCIAL_PLATFORMS.map((p) => {
      const l = view.links.find((x) => x.platform === p);
      return [p, { handle: l?.handle ?? "", audience: (l?.audience as AudienceRange | null) ?? null, skip: socialDone && !l }];
    }),
  ) as Record<SocialPlatform, SocialAnswer>;
  return {
    displayName: view.displayName,
    username: view.username,
    headline: view.headline,
    bio: view.bio,
    location: view.location,
    categories: view.categories,
    phoneCountry: view.contact.country,
    phoneNational: view.contact.national,
    contactPreference: view.contact.preference,
    contactConsent: view.contact.consented,
    socials,
    primary: (view.links.find((l) => l.primary)?.platform as SocialPlatform | undefined) ?? null,
    legalName: view.verifyDraft.legalName,
    birthYear: view.verifyDraft.birthYear,
    declared: view.completedSteps.includes("verify"),
    twinName: view.twin.displayName,
    shortBio: view.twin.shortBio,
    greeting: view.twin.greeting,
    consentPersona: view.consents.includes("ai_twin_persona"),
    warmth: view.twin.warmth,
    formality: view.twin.formality,
    humor: view.twin.humor,
    energy: view.twin.energy,
    emojiUsage: view.twin.emojiUsage,
    messageLength: view.twin.messageLength,
    allowedTopics: view.twin.allowedTopics,
    blockedTopics: view.twin.blockedTopics,
    allowPersonalQuestions: view.twin.allowPersonalQuestions,
    allowMediaRequests: view.twin.allowMediaRequests,
    allowCustomRequests: view.twin.allowCustomRequests,
    knowledgeConsent: view.consents.includes("knowledge_use"),
    voiceConsent: view.consents.includes("voice_likeness"),
  };
}
