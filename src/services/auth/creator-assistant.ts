import "server-only";
import { z } from "zod";
import type { Types } from "mongoose";
import { connectDb } from "@/lib/db/mongo";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { decryptField } from "@/lib/security/crypto";
import { PHONE_COUNTRIES, type AudienceRange, type ContactPreference, type SocialPlatform } from "@/lib/creator-contact";
import { oid } from "@/lib/validation/common";
import { AiTwin, type ITwin } from "@/models/ai";
import { Category } from "@/models/content";
import { CreatorApplication, CreatorProfile, type ICreatorProfile } from "@/models/creator";
import { AgeVerificationRecord, User } from "@/models/identity";
import { activeConsents, grantConsent, revokeConsent, submitTwinForReview, updateTwinDraft } from "@/services/ai-twins/lifecycle";
import { saveOnboardingStep, submitCreatorApplication } from "@/services/creators/onboarding";
import { resolveImage } from "@/services/studio/profile";
import { usernameField } from "@/features/auth/schemas";
import { ASSISTANT_STEPS, EMOJI_KEYS, MAX_BLOCKED_TOPICS, TONE_KEYS, TONE_PRESETS, type AssistantStep, type EmojiUsage, type ToneKey } from "@/features/auth/constants";
import { m } from "@/i18n/m";

/** Karşılama asistanının tek okuması: hangi sorular yanıtlandı + sohbette gösterilecek mevcut yanıtlar. */
export interface CreatorAssistantView {
  status: ICreatorProfile["status"];
  application: { status: string; decisionNote: string | null } | null;
  submittedAt: string | null;
  /** Yanıtlanmış adımlar; asistan ilk yanıtlanmamış adımdan devam eder. */
  answered: AssistantStep[];
  /** Sosyal hesap sahipliği için ana platform biyografisine eklenecek kod (admin incelemesinde kontrol edilir). */
  socialCode: string;
  values: {
    displayName: string;
    username: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    categories: string[];
    links: { platform: SocialPlatform; handle: string; url: string; audience: AudienceRange | null; primary: boolean }[];
    bio: string;
    headline: string;
    location: string;
    tone: ToneKey | null;
    emoji: EmojiUsage;
    greeting: string;
    blockedTopics: string[];
    /** Numara yalnız sahibine (düzenleme için) çözülür; başka hiçbir görünümde düz metin yoktur. */
    contact: { country: string; national: string; masked: string | null; preference: ContactPreference };
    legalName: string;
    knowledgeConsent: boolean;
  };
}

/** Önceki adım adım sihirbazda tamamlanmış adımlar → asistanda yanıtlanmış sayılan sorular (yarım başvurular kaldığı yerden sürer). */
const LEGACY_STEPS: Record<string, AssistantStep[]> = {
  account: ["displayName", "username", "categories", "bio", "location"],
  social: ["socials"],
  contact: ["contact"],
  verify: ["legalName"],
  persona: ["tone"],
  boundaries: ["topics"],
  twin: ["greeting", "consents"],
};

function assistantData(profile: ICreatorProfile) {
  const raw = (profile.onboarding?.data?.assistant ?? {}) as { answered?: unknown; tone?: unknown };
  const answered = Array.isArray(raw.answered) ? raw.answered.filter((s): s is AssistantStep => typeof s === "string" && (ASSISTANT_STEPS as readonly string[]).includes(s)) : [];
  const tone = typeof raw.tone === "string" && (TONE_KEYS as string[]).includes(raw.tone) ? (raw.tone as ToneKey) : null;
  return { answered, tone };
}

function ownContact(profile: ICreatorProfile): CreatorAssistantView["values"]["contact"] {
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
  return { country: c?.phoneCountry ?? "TR", national, masked: c?.phoneMasked ?? null, preference: c?.preference ?? "whatsapp" };
}

/** Profil yoksa null (asistan henüz başlatılmamış). */
export async function getCreatorAssistantView(userId: string): Promise<CreatorAssistantView | null> {
  await connectDb();
  const uid = oid(userId);
  const profile = await CreatorProfile.findOne({ userId: uid }).lean<ICreatorProfile>();
  if (!profile) return null;
  const [adult, twin, consents, application] = await Promise.all([
    AgeVerificationRecord.exists({ userId: uid, over18: true }),
    AiTwin.findOne({ creatorId: profile._id }).lean<ITwin>(),
    activeConsents(profile._id),
    CreatorApplication.findOne({ creatorId: profile._id }).sort({ createdAt: -1 }).lean(),
  ]);
  const data = assistantData(profile);
  const answered = new Set<AssistantStep>(data.answered);
  for (const step of profile.onboarding?.completedSteps ?? []) for (const s of LEGACY_STEPS[step] ?? []) answered.add(s);
  // Yaş beyanı kendi kaydından okunur: 18+ kaydı yoksa soru yeniden sorulur.
  if (adult) answered.add("birthDate");
  else answered.delete("birthDate");

  const persona = twin?.draft?.persona;
  const verifyData = (profile.onboarding?.data?.verify ?? {}) as { legalName?: unknown };
  return {
    status: profile.status,
    application: application ? { status: application.status, decisionNote: application.decisionNote ?? null } : null,
    submittedAt: profile.onboarding?.submittedAt ? new Date(profile.onboarding.submittedAt).toISOString() : null,
    answered: ASSISTANT_STEPS.filter((s) => answered.has(s)),
    socialCode: `HEYFANS-${profile._id.toString().slice(-6).toUpperCase()}`,
    values: {
      displayName: profile.displayName,
      username: profile.username,
      avatarUrl: profile.avatarUrl ?? null,
      coverUrl: profile.coverUrl ?? null,
      categories: profile.categories ?? [],
      links: (profile.socialLinks ?? []).map((l) => ({ platform: l.platform, handle: l.handle, url: l.url ?? "", audience: l.audience ?? null, primary: Boolean(l.primary) })),
      bio: profile.bio ?? "",
      headline: profile.headline ?? "",
      location: profile.location ?? "",
      tone: data.tone,
      emoji: persona?.emojiUsage ?? "low",
      greeting: persona?.greeting ?? "",
      blockedTopics: twin?.draft?.boundaries?.blockedTopics ?? [],
      contact: ownContact(profile),
      legalName: typeof verifyData.legalName === "string" ? verifyData.legalName : "",
      knowledgeConsent: consents.has("knowledge_use"),
    },
  };
}

const assetIdField = z.string().regex(/^[a-f0-9]{24}$/i, m("Geçersiz dosya"));
const topicField = z.string().trim().min(2, m("Konu en az 2 karakter olmalı.")).max(40, m("Her konu en fazla 40 karakter olabilir."));

const ANSWERS = {
  displayName: z.object({ displayName: z.string().trim().min(2, m("Görünen ad en az 2 karakter olmalı.")).max(80, m("En fazla 80 karakter.")) }),
  username: z.object({ username: usernameField }),
  avatar: z.object({ assetId: assetIdField }),
  /** null = kapak görseli istemiyorum */
  cover: z.object({ assetId: assetIdField.nullable() }),
  categories: z.object({ categories: z.array(z.string().regex(/^[a-z0-9-]{2,60}$/)).min(1, m("En az bir kategori seç.")).max(5, m("En fazla 5 kategori seçebilirsin.")) }),
  bio: z.object({
    bio: z.string().trim().min(20, m("Biraz daha anlatır mısın? En az 20 karakter yaz.")).max(1500, m("En fazla 1500 karakter.")),
    headline: z.string().trim().min(2, m("Kısa tanıtım en az 2 karakter olmalı.")).max(140, m("En fazla 140 karakter.")),
  }),
  /** Boş = geç */
  location: z.object({ location: z.string().trim().max(80, m("En fazla 80 karakter.")) }),
  tone: z.object({ tone: z.enum(TONE_KEYS), emoji: z.enum(EMOJI_KEYS) }),
  greeting: z.object({ greeting: z.string().trim().min(5, m("Karşılama mesajı en az 5 karakter olmalı.")).max(500, m("En fazla 500 karakter.")) }),
  topics: z.object({ blockedTopics: z.array(topicField).max(MAX_BLOCKED_TOPICS, m("En fazla 12 konu.")) }),
  legalName: z.object({ legalName: z.string().trim().min(3, m("Yasal adını ve soyadını yaz.")).max(120, m("En fazla 120 karakter.")) }),
  consents: z.object({ persona: z.literal(true, { error: m("AI ikizi için açık rıza vermelisin.") }), knowledge: z.boolean() }),
};

async function editableProfile(userId: string) {
  await connectDb();
  const profile = await CreatorProfile.findOne({ userId: oid(userId) }).lean<ICreatorProfile>();
  if (!profile) throw new NotFoundError("Önce creator yolculuğunu başlat.");
  if (profile.status !== "onboarding") throw new ConflictError("Başvurun zaten gönderilmiş veya sonuçlanmış.");
  return profile;
}

/**
 * Soruyu yanıtlanmış işaretler; isteğe bağlı olarak profil alanlarını ve arka uç adımlarını (başvuru denetimi için) tek güncellemede yazar.
 * `steps`: tamamlandı sayılacak sihirbaz adımları → adım verisi (başvuru anlık görüntüsüne girer).
 */
async function markAnswered(profileId: Types.ObjectId, step: AssistantStep, opts: { set?: Record<string, unknown>; steps?: Record<string, Record<string, unknown>> } = {}) {
  const set: Record<string, unknown> = { ...opts.set };
  for (const [key, value] of Object.entries(opts.steps ?? {})) set[`onboarding.data.${key}`] = value;
  const addToSet: Record<string, unknown> = { "onboarding.data.assistant.answered": step };
  if (opts.steps) addToSet["onboarding.completedSteps"] = { $each: Object.keys(opts.steps) };
  await CreatorProfile.updateOne({ _id: profileId }, Object.keys(set).length ? { $set: set, $addToSet: addToSet } : { $addToSet: addToSet });
}

/**
 * Asistanın tek bir sorusunun yanıtı: doğrulanır, gerçek yerine (profil, AI ikizi taslağı, rıza, doğrulama talebi) yazılır.
 * Doğum tarihi burada değil, yaş beyanı akışında (`submitBirthDateAction`) kaydedilir: 18 altı hesap kapatılır.
 */
export async function answerAssistantStep(userId: string, step: Exclude<AssistantStep, "birthDate">, raw: unknown, ip: string | null) {
  const profile = await editableProfile(userId);
  const id = profile._id;
  switch (step) {
    case "displayName": {
      const v = ANSWERS.displayName.parse(raw);
      await updateTwinDraft(userId, { persona: { displayName: v.displayName } });
      return markAnswered(id, step, { set: { displayName: v.displayName } });
    }
    case "username": {
      const v = ANSWERS.username.parse(raw);
      if (v.username !== profile.username && (await CreatorProfile.exists({ username: v.username }))) throw new AppError("Bu kullanıcı adı alınmış.", "username_taken", 400, { field: "username" });
      await User.updateOne({ _id: profile.userId }, { $set: { username: v.username } });
      return markAnswered(id, step, { set: { username: v.username } });
    }
    case "avatar": {
      const v = ANSWERS.avatar.parse(raw);
      const { asset, url } = await resolveImage(profile.userId, v.assetId, "avatar");
      // Hesap görseli boşsa creator fotoğrafı orada da kullanılır (üst menü, bildirimler).
      await User.updateOne({ _id: profile.userId, $or: [{ image: null }, { image: "" }, { image: { $exists: false } }] }, { $set: { image: url } });
      return markAnswered(id, step, { set: { avatarAssetId: asset._id, avatarUrl: url } });
    }
    case "cover": {
      const v = ANSWERS.cover.parse(raw);
      if (!v.assetId) return markAnswered(id, step, { set: { coverAssetId: null, coverUrl: null } });
      const { asset, url } = await resolveImage(profile.userId, v.assetId, "cover");
      return markAnswered(id, step, { set: { coverAssetId: asset._id, coverUrl: url } });
    }
    case "categories": {
      const v = ANSWERS.categories.parse(raw);
      const unique = [...new Set(v.categories)];
      const valid = await Category.countDocuments({ slug: { $in: unique }, isActive: true });
      if (valid !== unique.length) throw new AppError("Seçilen kategorilerden biri geçerli değil.", "invalid_category");
      return markAnswered(id, step, { set: { categories: unique } });
    }
    case "socials": {
      // Bağlantı biçimi, en az bir sosyal hesap ve sahiplik doğrulama talebi sihirbaz adımının kurallarıyla aynı.
      await saveOnboardingStep(userId, "social", (raw ?? {}) as Record<string, unknown>);
      return markAnswered(id, step);
    }
    case "bio": {
      const v = ANSWERS.bio.parse(raw);
      await updateTwinDraft(userId, { persona: { shortBio: v.headline } });
      return markAnswered(id, step, { set: { bio: v.bio, headline: v.headline } });
    }
    case "location": {
      const v = ANSWERS.location.parse(raw);
      return markAnswered(id, step, { set: { location: v.location } });
    }
    case "tone": {
      const v = ANSWERS.tone.parse(raw);
      await updateTwinDraft(userId, { persona: { ...TONE_PRESETS[v.tone].persona, emojiUsage: v.emoji, messageLength: "medium" } });
      return markAnswered(id, step, { set: { "onboarding.data.assistant.tone": v.tone }, steps: { persona: { tone: v.tone, emojiUsage: v.emoji } } });
    }
    case "greeting": {
      const v = ANSWERS.greeting.parse(raw);
      await updateTwinDraft(userId, { persona: { greeting: v.greeting } });
      return markAnswered(id, step);
    }
    case "topics": {
      const v = ANSWERS.topics.parse(raw);
      // Büyük/küçük harf farkıyla tekrarlanan konular tek kez (ilk yazıldığı biçimiyle) saklanır.
      const seen = new Set<string>();
      const blockedTopics = v.blockedTopics.filter((x) => !seen.has(x.toLocaleLowerCase()) && seen.add(x.toLocaleLowerCase()));
      // Güvenlik: zor durumda insan desteğine yönlendirme kapatılamaz.
      await updateTwinDraft(userId, { boundaries: { blockedTopics, escalateOnDistress: true } });
      return markAnswered(id, step, { steps: { boundaries: { blockedTopics } } });
    }
    case "contact": {
      // Numara doğrulaması, şifreli saklama ve maskeli gösterim sihirbaz adımıyla aynı.
      await saveOnboardingStep(userId, "contact", (raw ?? {}) as Record<string, unknown>);
      return markAnswered(id, step);
    }
    case "legalName": {
      const v = ANSWERS.legalName.parse(raw);
      const user = await User.findById(profile.userId, { birthDate: 1 }).lean<{ birthDate?: Date | null }>();
      if (!user?.birthDate) throw new AppError("Önce doğum tarihini paylaşmalısın.", "birth_date_required");
      await saveOnboardingStep(userId, "verify", { legalName: v.legalName, birthYear: String(new Date(user.birthDate).getUTCFullYear()) });
      return markAnswered(id, step);
    }
    case "consents": {
      const v = ANSWERS.consents.parse(raw);
      const has = await activeConsents(id);
      await grantConsent(userId, "ai_twin_persona", ip);
      if (v.knowledge && !has.has("knowledge_use")) await grantConsent(userId, "knowledge_use", ip);
      if (!v.knowledge && has.has("knowledge_use")) await revokeConsent(userId, "knowledge_use", "Karşılama sırasında kapatıldı"); // i18n-ignore (denetim kaydı notu)
      // Ses/görünüm izni yalnız kimliği doğrulanmış creator verebilir; başvuru onayından sonra Studio'dan açılır.
      return markAnswered(id, step, { steps: { twin: { consent: true }, knowledge: { consent: v.knowledge }, likeness: { voice: false } } });
    }
  }
}

/** Tüm sorular yanıtlandıysa başvuruyu (AI ikizi sürümüyle birlikte) incelemeye gönderir. */
export async function submitAssistantApplication(userId: string) {
  const view = await getCreatorAssistantView(userId);
  if (!view) throw new NotFoundError("Önce creator yolculuğunu başlat.");
  if (view.status !== "onboarding") throw new ConflictError("Başvurun zaten gönderilmiş veya sonuçlanmış.");
  if (ASSISTANT_STEPS.some((s) => !view.answered.includes(s))) throw new AppError("Başvuruyu göndermeden önce tüm soruları yanıtlamalısın.", "steps_missing");
  if (!view.values.avatarUrl) throw new AppError("Başvuru için bir profil fotoğrafı gerekli.", "avatar_required");
  const v = view.values;
  // Profil adımı başvuru anlık görüntüsü için bir kez bütün olarak kaydedilir (aynı doğrulama kurallarıyla).
  await saveOnboardingStep(userId, "account", { displayName: v.displayName, username: v.username, headline: v.headline, bio: v.bio, categories: v.categories, location: v.location });
  await saveOnboardingStep(userId, "preview", {});
  await submitTwinForReview(userId, "Creator başvurusuyla birlikte gönderildi"); // i18n-ignore (denetim kaydı notu)
  await submitCreatorApplication(userId);
  await saveOnboardingStep(userId, "submit", {});
}
