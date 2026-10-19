import "server-only";
import { z } from "zod";
import { connectDb, withTransaction } from "@/lib/db/mongo";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/security/audit";
import { encryptField } from "@/lib/security/crypto";
import { AUDIENCE_KEYS, CONTACT_PREFERENCES, maskPhone, normalizePhone, normalizeSocial, PHONE_COUNTRY_CODES, SOCIAL_PLATFORMS, socialMeta, type SocialPlatform } from "@/lib/creator-contact";
import { oid, usernameSchema } from "@/lib/validation/common";
import { AiTwin } from "@/models/ai";
import { CreatorApplication, CreatorProfile, CreatorVerificationRequest, type ICreatorProfile } from "@/models/creator";
import { User } from "@/models/identity";
import { activeConsents } from "@/services/ai-twins/lifecycle";
import { notify } from "@/services/notifications/notifications";
import { getPlatformSettings } from "@/services/platform/settings";

/** Creator karşılama sihirbazının adımları (UI 7 grupta, ilk üçü soru soru gösterir). */
export const ONBOARDING_STEPS = [
  { key: "account", label: "Temel hesap bilgileri" },
  { key: "contact", label: "İletişim bilgileri" },
  { key: "verify", label: "Kimlik ve creator doğrulaması" },
  { key: "social", label: "Sosyal medya hesapları" },
  { key: "twin", label: "AI ikizi oluşturma" },
  { key: "persona", label: "Kişilik ve konuşma tercihleri" },
  { key: "knowledge", label: "Bilgi ve içerik kaynakları" },
  { key: "likeness", label: "Ses/görünüm yetkilendirmesi" },
  { key: "boundaries", label: "Güvenlik sınırları" },
  { key: "preview", label: "Önizleme" },
  { key: "submit", label: "İnceleme ve yayınlama" },
] as const;
export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

export const accountStepSchema = z.object({
  displayName: z.string().trim().min(2, "Görünen ad en az 2 karakter").max(80),
  username: usernameSchema,
  headline: z.string().trim().max(140).optional().default(""),
  bio: z.string().trim().max(1500).optional().default(""),
  categories: z.array(z.string().max(60)).min(1, "En az bir kategori seçin").max(5),
  location: z.string().trim().max(80).optional().default(""),
});

export const contactStepSchema = z.object({
  country: z.enum(PHONE_COUNTRY_CODES),
  national: z.string().trim().min(4, "Telefon numaranı yaz.").max(24),
  preference: z.enum(CONTACT_PREFERENCES.map((c) => c.key) as ["phone", "whatsapp", "email"]),
  consent: z.literal(true, { error: "İletişim bilgilerinin başvuru için işlenmesini onaylamalısın." }),
});

export const socialStepSchema = z.object({
  links: z
    .array(z.object({ platform: z.enum(SOCIAL_PLATFORMS), handle: z.string().trim().min(1).max(220), audience: z.enum(AUDIENCE_KEYS).nullable().optional() }))
    .max(SOCIAL_PLATFORMS.length)
    .refine((ls) => new Set(ls.map((l) => l.platform)).size === ls.length, "Her platform bir kez eklenebilir."),
  primary: z.enum(SOCIAL_PLATFORMS).nullable().optional(),
});

/** Creator yolculuğunu başlatır: profil (onboarding) + "creator" rolü. Fan erişimi korunur. */
export async function startCreatorOnboarding(userId: string) {
  await connectDb();
  const settings = await getPlatformSettings();
  if (!settings.features.creatorSignup) throw new AppError("Yeni creator başvuruları geçici olarak kapalı.", "creator_signup_closed", 403);
  const uid = oid(userId);
  const existing = await CreatorProfile.findOne({ userId: uid }).lean<ICreatorProfile>();
  if (existing) return existing;
  const user = await User.findById(uid).lean();
  if (!user) throw new NotFoundError("Kullanıcı bulunamadı.");
  const base = (user.username ?? user.email.split("@")[0] ?? "creator").toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20) || "creator";
  let username = base.length >= 3 ? base : `${base}_hf`;
  for (let i = 1; await CreatorProfile.exists({ username }); i++) username = `${base}${i}`.slice(0, 30);
  const profile = await withTransaction(async (session) => {
    const [p] = await CreatorProfile.create([{ userId: uid, username, displayName: user.name, status: "onboarding", statusHistory: [{ from: null, to: "onboarding", by: uid, at: new Date() }] }], { session });
    await User.updateOne({ _id: uid }, { $addToSet: { roles: "creator" } }, { session });
    await AiTwin.create([{ creatorId: p!._id, userId: uid, draft: { persona: { displayName: user.name } } }], { session });
    return p!;
  });
  return profile.toObject();
}

/** Adım verisini kaydeder (yarıda bırakılırsa ilerleme korunur). */
export async function saveOnboardingStep(userId: string, step: OnboardingStepKey, data: Record<string, unknown>) {
  await connectDb();
  const profile = await CreatorProfile.findOne({ userId: oid(userId) });
  if (!profile) throw new NotFoundError("Önce creator yolculuğunu başlat.");
  if (profile.status === "approved" && step !== "preview") throw new ConflictError("Profilin zaten onaylı; değişiklikleri Creator Studio'dan yapabilirsin.");
  if (step === "account") {
    const input = accountStepSchema.parse(data);
    if (input.username !== profile.username && (await CreatorProfile.exists({ username: input.username }))) throw new AppError("Bu kullanıcı adı alınmış.", "username_taken");
    profile.set({ displayName: input.displayName, username: input.username, headline: input.headline, bio: input.bio, categories: input.categories, location: input.location });
    await User.updateOne({ _id: profile.userId }, { $set: { username: input.username } });
  }
  let stored: Record<string, unknown> | null = null;
  if (step === "contact") {
    const input = contactStepSchema.parse(data);
    const phone = normalizePhone(input.country, input.national);
    if (!phone.ok) throw new AppError(phone.error, "invalid_phone", 400, { field: "national" });
    // Telefon düz metin olarak hiçbir yere yazılmaz: şifreli değer + maskeli gösterim.
    profile.contact = { phoneEncrypted: encryptField(phone.e164), phoneMasked: maskPhone(phone.e164), phoneCountry: input.country, preference: input.preference, consentAt: new Date(), phoneVerifiedAt: null };
    profile.markModified("contact");
    stored = { country: input.country, phone: maskPhone(phone.e164), preference: input.preference };
  }
  if (step === "social") {
    const input = socialStepSchema.parse(data);
    const links: { platform: SocialPlatform; handle: string; url: string; verified: boolean; audience: (typeof AUDIENCE_KEYS)[number] | null; primary: boolean }[] = [];
    for (const l of input.links) {
      const n = normalizeSocial(l.platform, l.handle);
      if (!n.ok) throw new AppError(`${socialMeta(l.platform)?.label ?? l.platform}: ${n.error}`, "invalid_social", 400, { field: `link.${l.platform}` });
      const prev = profile.socialLinks.find((p) => p.platform === l.platform && p.handle === n.handle);
      links.push({ platform: l.platform, handle: n.handle, url: n.url, verified: Boolean(prev?.verified), audience: socialMeta(l.platform)?.audience ? (l.audience ?? null) : null, primary: false });
    }
    if (!links.some((l) => l.platform !== "website")) throw new AppError("En az bir sosyal medya hesabı eklemelisin (web sitesi tek başına yeterli değil).", "social_required", 400, { field: "links" });
    const primary = input.primary && links.some((l) => l.platform === input.primary) ? input.primary : links.find((l) => l.platform !== "website")!.platform;
    for (const l of links) l.primary = l.platform === primary;
    profile.socialLinks = links;
    stored = { platforms: links.map((l) => l.platform), primary };
    if (links.length) {
      // Sahiplik doğrulaması: profiline eklemesi gereken kod (OAuth bağlantısı yapılandırıldığında otomatikleşir)
      const codeValue = `HEYFANS-${profile._id.toString().slice(-6).toUpperCase()}`;
      await CreatorVerificationRequest.updateOne(
        { creatorId: profile._id, type: "social", status: { $in: ["pending", "in_review"] } },
        { $set: { userId: profile.userId, evidence: [...links.map((l) => ({ kind: l.platform, value: l.url })), { kind: "bio_code", value: codeValue }] }, $setOnInsert: { creatorId: profile._id, type: "social", provider: "manual" } },
        { upsert: true },
      );
      if (profile.verification.social === "none") profile.verification.social = "pending";
    }
  }
  if (step === "verify") {
    // Harici kimlik doğrulama sağlayıcısı yapılandırılana kadar admin incelemesine düşer; belge saklanmaz.
    await CreatorVerificationRequest.updateOne(
      { creatorId: profile._id, type: "identity", status: { $in: ["pending", "in_review"] } },
      { $set: { userId: profile.userId, evidence: [{ kind: "legal_name", value: String(data.legalName ?? "").slice(0, 120) }, { kind: "birth_year", value: String(data.birthYear ?? "").slice(0, 4) }] }, $setOnInsert: { creatorId: profile._id, type: "identity", provider: "manual" } },
      { upsert: true },
    );
    if (profile.verification.identity === "none") profile.verification.identity = "pending";
  }
  const done = new Set(profile.onboarding.completedSteps);
  done.add(step);
  profile.onboarding.completedSteps = [...done];
  profile.onboarding.step = Math.max(profile.onboarding.step, ONBOARDING_STEPS.findIndex((s) => s.key === step) + 2);
  profile.onboarding.data = { ...(profile.onboarding.data ?? {}), [step]: stored ?? sanitizeStepData(data) };
  profile.markModified("onboarding");
  await profile.save();
  return profile.toObject();
}

function sanitizeStepData(data: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (["string", "number", "boolean"].includes(typeof v) || Array.isArray(v)) out[k] = typeof v === "string" ? v.slice(0, 2000) : v;
  return out;
}

/** Başvuruyu incelemeye gönderir. Zorunlu adımlar + persona rızası denetlenir. */
export async function submitCreatorApplication(userId: string) {
  await connectDb();
  const profile = await CreatorProfile.findOne({ userId: oid(userId) });
  if (!profile) throw new NotFoundError("Creator profili bulunamadı.");
  const required: OnboardingStepKey[] = ["account", "contact", "social", "verify", "twin", "persona", "boundaries"];
  const missing = required.filter((s) => !profile.onboarding.completedSteps.includes(s));
  if (missing.length) throw new AppError(`Eksik adımlar: ${missing.map((m) => ONBOARDING_STEPS.find((s) => s.key === m)!.label).join(", ")}`, "steps_missing");
  const consents = await activeConsents(profile._id);
  if (!consents.has("ai_twin_persona")) throw new AppError("AI ikizi için açık rıza vermelisin.", "consent_required", 403);
  if (await CreatorApplication.exists({ creatorId: profile._id, status: { $in: ["submitted", "in_review"] } })) throw new ConflictError("Başvurun zaten incelemede.");
  await CreatorApplication.create({
    userId: profile.userId,
    creatorId: profile._id,
    status: "submitted",
    snapshot: { displayName: profile.displayName, username: profile.username, categories: profile.categories, socialLinks: profile.socialLinks, contact: { phone: profile.contact?.phoneMasked ?? null, preference: profile.contact?.preference ?? null }, onboarding: profile.onboarding.data },
    checklist: [
      { key: "identity", label: "Kimlik doğrulama", passed: profile.verification.identity === "verified" ? true : null },
      { key: "social", label: "Sosyal hesap sahipliği", passed: profile.verification.social === "verified" ? true : null },
      { key: "consent", label: "AI ikizi açık rızası", passed: true },
      { key: "age", label: "18+ beyanı", passed: true },
    ],
    submittedAt: new Date(),
    history: [{ from: "draft", to: "submitted", by: profile.userId, at: new Date() }],
  });
  profile.statusHistory.push({ from: profile.status, to: "pending_review", by: profile.userId, at: new Date() });
  profile.status = "pending_review";
  profile.onboarding.submittedAt = new Date();
  profile.markModified("onboarding");
  await profile.save();
  return { status: profile.status };
}

/** Admin: başvuru kararı. Onay → creator yayına uygun; kimlik doğrulaması da onaylanır. */
export async function decideCreatorApplication(actor: { id: string; adminRole: string | null }, applicationId: string, decision: "approve" | "reject" | "changes_requested", note: string) {
  await connectDb();
  const app = await CreatorApplication.findById(oid(applicationId));
  if (!app || !["submitted", "in_review"].includes(app.status)) throw new NotFoundError("Bekleyen başvuru bulunamadı.");
  const profile = await CreatorProfile.findById(app.creatorId);
  if (!profile) throw new NotFoundError("Creator profili bulunamadı.");
  const to = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "changes_requested";
  app.history.push({ from: app.status, to, by: oid(actor.id), note, at: new Date() });
  app.status = to;
  app.reviewerId = oid(actor.id);
  app.decisionNote = note;
  app.decidedAt = new Date();
  await app.save();
  const profileTo = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "onboarding";
  profile.statusHistory.push({ from: profile.status, to: profileTo, by: oid(actor.id), note, at: new Date() });
  profile.status = profileTo;
  if (decision === "approve") {
    profile.verification.identity = "verified";
    profile.verification.verifiedAt = new Date();
    if (profile.verification.social === "pending") profile.verification.social = "verified";
    await CreatorVerificationRequest.updateMany({ creatorId: profile._id, status: { $in: ["pending", "in_review"] } }, { $set: { status: "verified", reviewerId: oid(actor.id), decidedAt: new Date() } });
  }
  await profile.save();
  await notify(profile.userId.toString(), {
    type: "creator_review",
    title: decision === "approve" ? "Creator başvurun onaylandı 🎉" : decision === "reject" ? "Creator başvurun reddedildi" : "Başvurun için düzenleme gerekiyor",
    body: note,
    link: decision === "approve" ? "/studio" : "/onboarding/creator",
  });
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: `creator.${decision}`, targetType: "CreatorProfile", targetId: profile._id.toString(), reason: note, severity: "notice" });
}

/** Admin: creator hesabını askıya alma / geri açma (ikiz de duraklatılır). */
export async function setCreatorSuspended(actor: { id: string; adminRole: string | null }, creatorId: string, suspended: boolean, reason: string) {
  await connectDb();
  const profile = await CreatorProfile.findById(oid(creatorId));
  if (!profile) throw new NotFoundError("Creator bulunamadı.");
  const to = suspended ? "suspended" : "approved";
  profile.statusHistory.push({ from: profile.status, to, by: oid(actor.id), note: reason, at: new Date() });
  profile.status = to;
  await profile.save();
  if (suspended) await AiTwin.updateOne({ creatorId: profile._id, status: "live" }, { $set: { status: "paused" }, $push: { statusHistory: { from: "live", to: "paused", by: oid(actor.id), note: reason, at: new Date() } } });
  await notify(profile.userId.toString(), { type: "moderation", title: suspended ? "Creator hesabın askıya alındı" : "Creator hesabın yeniden etkin", body: reason, link: "/help" });
  await audit({ actorId: actor.id, actorRole: actor.adminRole, action: suspended ? "creator.suspend" : "creator.unsuspend", targetType: "CreatorProfile", targetId: creatorId, reason, severity: "critical" });
}
