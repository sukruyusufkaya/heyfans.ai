import "server-only";
import { connectDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { decryptField } from "@/lib/security/crypto";
import { PHONE_COUNTRIES } from "@/lib/creator-contact";
import { AiTwin, type ITwin } from "@/models/ai";
import { CreatorApplication, CreatorProfile, type ConsentKind, type ICreatorProfile } from "@/models/creator";
import { activeConsents } from "@/services/ai-twins/lifecycle";
import { CREATOR_GROUPS, CREATOR_REQUIRED_STEPS, creatorGroupDone, type CreatorGroupKey } from "@/features/auth/constants";

export interface CreatorOnboardingView {
  profileId: string;
  status: ICreatorProfile["status"];
  username: string;
  displayName: string;
  headline: string;
  bio: string;
  location: string;
  categories: string[];
  links: { platform: string; handle: string; verified: boolean; audience: string | null; primary: boolean }[];
  /** İletişim adımı: numara yalnız sahibine (düzenleme için) çözülür; başka hiçbir görünümde düz metin yoktur. */
  contact: { country: string; national: string; masked: string | null; preference: "phone" | "whatsapp" | "email"; consented: boolean };
  /** Sosyal hesap sahipliği için profil biyografisine eklenecek kod (admin incelemesinde kontrol edilir). */
  socialCode: string;
  verification: { identity: ICreatorProfile["verification"]["identity"]; social: ICreatorProfile["verification"]["social"] };
  completedSteps: string[];
  /** Kimlik adımında girilmiş (kendi) bilgiler — düzenlemek için ön doldurulur. */
  verifyDraft: { legalName: string; birthYear: string };
  twin: {
    displayName: string;
    shortBio: string;
    greeting: string;
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
  };
  consents: ConsentKind[];
  submittedAt: string | null;
  application: { status: string; decisionNote: string | null; decidedAt: string | null } | null;
  /** Ekrandaki 5 adımdan hangisinden devam edileceği (ilk tamamlanmamış adım). */
  resumeGroup: CreatorGroupKey;
  /** Hangi gruplar tamamlandı (adım göstergesindeki onay işareti için). */
  doneGroups: CreatorGroupKey[];
  missingRequired: string[];
}

function ownContact(profile: ICreatorProfile): CreatorOnboardingView["contact"] {
  const c = profile.contact;
  let national = "";
  if (c?.phoneEncrypted) {
    try {
      const e164 = decryptField(c.phoneEncrypted);
      const dial = PHONE_COUNTRIES.find((x) => x.code === c.phoneCountry)?.dial ?? "";
      national = e164.startsWith(`+${dial}`) ? e164.slice(dial.length + 1) : e164.replace(/^\+/, "");
    } catch {
      national = "";
    }
  }
  return { country: c?.phoneCountry ?? "TR", national, masked: c?.phoneMasked ?? null, preference: c?.preference ?? "whatsapp", consented: Boolean(c?.consentAt) };
}

/** Onboarding sihirbazı için tek okuma: profil + ikiz taslağı + rızalar + son başvuru. Profil yoksa null. */
export async function getCreatorOnboardingView(userId: string): Promise<CreatorOnboardingView | null> {
  await connectDb();
  const uid = oid(userId);
  const profile = await CreatorProfile.findOne({ userId: uid }).lean<ICreatorProfile>();
  if (!profile) return null;
  const [twin, consents, application] = await Promise.all([
    AiTwin.findOne({ creatorId: profile._id }).lean<ITwin>(),
    activeConsents(profile._id),
    CreatorApplication.findOne({ creatorId: profile._id }).sort({ createdAt: -1 }).lean(),
  ]);
  const completed = new Set(profile.onboarding?.completedSteps ?? []);
  const doneGroups = CREATOR_GROUPS.filter((g) => creatorGroupDone(g.key, completed)).map((g) => g.key);
  const resume = CREATOR_GROUPS.find((g) => !doneGroups.includes(g.key))?.key ?? "review";
  const persona = twin?.draft?.persona;
  const boundaries = twin?.draft?.boundaries;
  const verifyData = (profile.onboarding?.data?.verify ?? {}) as { legalName?: unknown; birthYear?: unknown };
  const missing = CREATOR_REQUIRED_STEPS.filter((s) => !completed.has(s));

  return {
    profileId: profile._id.toString(),
    status: profile.status,
    username: profile.username,
    displayName: profile.displayName,
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    categories: profile.categories ?? [],
    links: (profile.socialLinks ?? []).map((l) => ({ platform: l.platform, handle: l.handle, verified: l.verified, audience: l.audience ?? null, primary: Boolean(l.primary) })),
    contact: ownContact(profile),
    socialCode: `HEYFANS-${profile._id.toString().slice(-6).toUpperCase()}`,
    verification: { identity: profile.verification.identity, social: profile.verification.social },
    completedSteps: [...completed],
    verifyDraft: { legalName: typeof verifyData.legalName === "string" ? verifyData.legalName : "", birthYear: typeof verifyData.birthYear === "string" ? verifyData.birthYear : "" },
    twin: {
      displayName: persona?.displayName || profile.displayName,
      shortBio: persona?.shortBio ?? "",
      greeting: persona?.greeting ?? "",
      warmth: persona?.warmth ?? 70,
      formality: persona?.formality ?? 30,
      humor: persona?.humor ?? 50,
      energy: persona?.energy ?? 60,
      emojiUsage: persona?.emojiUsage ?? "low",
      messageLength: persona?.messageLength ?? "medium",
      allowedTopics: boundaries?.allowedTopics ?? [],
      blockedTopics: boundaries?.blockedTopics ?? [],
      allowPersonalQuestions: boundaries?.allowPersonalQuestions ?? true,
      allowMediaRequests: boundaries?.allowMediaRequests ?? false,
      allowCustomRequests: boundaries?.allowCustomRequests ?? true,
    },
    consents: [...consents],
    submittedAt: profile.onboarding?.submittedAt ? new Date(profile.onboarding.submittedAt).toISOString() : null,
    application: application
      ? { status: application.status, decisionNote: application.decisionNote ?? null, decidedAt: application.decidedAt ? application.decidedAt.toISOString() : null }
      : null,
    resumeGroup: resume,
    doneGroups,
    missingRequired: missing,
  };
}
