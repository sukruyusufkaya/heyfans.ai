import type { CreatorOnboardingView } from "@/services/auth/creator-onboarding";

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
  // 1 · Bağla
  displayName: string;
  username: string;
  headline: string;
  categories: string[];
  links: Record<"instagram" | "tiktok" | "youtube" | "x", string>;
  // 2 · Doğrula
  legalName: string;
  birthYear: string;
  declared: boolean;
  // 3 · AI İkizi
  twinName: string;
  shortBio: string;
  greeting: string;
  consentPersona: boolean;
  // 4 · Özelleştir
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

export type FieldErrors = Record<string, string>;

export interface StepProps {
  view: CreatorOnboardingView;
  draft: CreatorDraft;
  set: <K extends keyof CreatorDraft>(key: K, value: CreatorDraft[K]) => void;
  errors: FieldErrors;
}

export function initialDraft(view: CreatorOnboardingView): CreatorDraft {
  const link = (p: string) => view.links.find((l) => l.platform === p)?.handle ?? "";
  return {
    displayName: view.displayName,
    username: view.username,
    headline: view.headline,
    categories: view.categories,
    links: { instagram: link("instagram"), tiktok: link("tiktok"), youtube: link("youtube"), x: link("x") },
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
