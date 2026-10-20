import { z } from "zod";
import { m } from "@/i18n/m";
import { FAN_VIBE_KEYS } from "./constants";

/**
 * Kimlik doğrulama ve karşılama formlarının Zod şemaları.
 * Hem istemcide (React Hook Form) hem sunucuda (Server Action) kullanılır; sunucuya özel bağımlılık yoktur.
 */
export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, m("E-posta adresini gir."))
  .max(200, m("E-posta adresi çok uzun."))
  .email(m("Geçerli bir e-posta adresi gir."));

export const newPasswordField = z
  .string()
  .min(8, m("Şifre en az 8 karakter olmalı."))
  .max(128, m("Şifre en fazla 128 karakter olabilir."))
  .refine((v) => /\p{L}/u.test(v) && /\d/.test(v), m("Şifre en az bir harf ve bir rakam içermeli."));

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, m("Şifreni gir.")).max(128),
  rememberMe: z.boolean(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  intent: z.enum(["fan", "creator"]),
  name: z.string().trim().min(2, m("Adın ve soyadın en az 2 karakter olmalı.")).max(80, m("Ad en fazla 80 karakter olabilir.")),
  email: emailField,
  password: newPasswordField,
  terms: z.boolean().refine((v) => v === true, m("Devam etmek için koşulları kabul etmelisin.")),
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({ email: emailField });
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({ password: newPasswordField, confirm: z.string().min(1, m("Şifreni tekrar gir.")) })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: m("Şifreler eşleşmiyor.") });
export type ResetValues = z.infer<typeof resetSchema>;

export const totpSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, m("6 haneli kodu gir.")) });
export const backupCodeSchema = z.object({ code: z.string().trim().min(6, m("Yedek kodunu gir.")).max(32) });
export const passwordConfirmSchema = z.object({ password: z.string().min(1, m("Şifreni gir.")).max(128) });

export function passwordStrength(value: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!value) return { score: 0, label: m("Şifre güvenliği") };
  let points = 0;
  if (value.length >= 8) points++;
  if (value.length >= 12) points++;
  if (/\p{Ll}/u.test(value) && /\p{Lu}/u.test(value)) points++;
  if (/\d/.test(value)) points++;
  if (/[^\p{L}\d]/u.test(value)) points++;
  // 8 karakterden kısa şifre her zaman "zayıf"; ek çeşitlilik ve uzunluk puanı artırır.
  const score = (value.length < 8 ? 1 : Math.max(1, Math.min(4, points - 1))) as 0 | 1 | 2 | 3 | 4;
  const labels = [m("Şifre güvenliği"), m("Zayıf"), m("Orta"), m("Güçlü"), m("Çok güçlü")];
  return { score, label: labels[score]! };
}

/* ─── Yaş doğrulama ─────────────────────────────────────── */
export const birthDateSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, m("Doğum tarihini seç.")),
  declared: z.boolean().refine((v) => v === true, m("Beyanı onaylamalısın.")),
});
export type BirthDateValues = z.infer<typeof birthDateSchema>;

/* ─── Hayran karşılama ──────────────────────────────────── */
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,60}$/);

export const fanInterestsSchema = z.object({ interests: z.array(slug).max(20) });
export const fanVibesSchema = z.object({ vibes: z.array(z.enum(FAN_VIBE_KEYS)).max(8) });
export const fanPersonalizeSchema = z.object({
  recommendationsEnabled: z.boolean(),
  personalizationConsent: z.boolean(),
  aiMemoryEnabled: z.boolean(),
});
export const fanCompleteSchema = fanPersonalizeSchema.extend({
  interests: z.array(slug).max(20),
  vibes: z.array(z.enum(FAN_VIBE_KEYS)).max(8),
});
export type FanPersonalizeValues = z.infer<typeof fanPersonalizeSchema>;

/* ─── Creator karşılama ─────────────────────────────────── */
export const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,30}$/, m("Kullanıcı adı 3-30 karakter olmalı; harf, rakam, _ ve . kullanılabilir."));

/** Profil (soru soru): görünen ad + kullanıcı adı, kategoriler, tanıtım. */
export const creatorProfileSchema = z.object({
  displayName: z.string().trim().min(2, m("Görünen ad en az 2 karakter olmalı.")).max(80),
  username: usernameField,
  categories: z.array(slug).min(1, m("En az bir kategori seç.")).max(5, m("En fazla 5 kategori seçebilirsin.")),
  headline: z.string().trim().max(140, m("En fazla 140 karakter.")).default(""),
  bio: z.string().trim().max(1500, m("En fazla 1500 karakter.")).default(""),
  location: z.string().trim().max(80, m("En fazla 80 karakter.")).default(""),
});
export type CreatorProfileInput = z.input<typeof creatorProfileSchema>;

export const creatorVerifySchema = z.object({
  legalName: z.string().trim().min(3, m("Yasal adını ve soyadını yaz.")).max(120),
  birthYear: z.coerce
    .number({ error: m("Doğum yılını yaz.") })
    .int(m("Doğum yılını yaz."))
    .min(1920, m("Geçerli bir doğum yılı yaz."))
    .max(new Date().getFullYear() - 18, m("İçerik üreticisi olmak için 18 yaşını doldurmuş olmalısın.")),
  declared: z.boolean().refine((v) => v === true, m("Bilgilerin doğruluğunu onaylamalısın.")),
});
export type CreatorVerifyInput = z.input<typeof creatorVerifySchema>;

export const creatorTwinSchema = z.object({
  displayName: z.string().trim().min(2, m("AI ikizi adı en az 2 karakter olmalı.")).max(80),
  shortBio: z.string().trim().max(500, m("En fazla 500 karakter.")).default(""),
  greeting: z.string().trim().min(5, m("Karşılama mesajı en az 5 karakter olmalı.")).max(500, m("En fazla 500 karakter.")),
  consentPersona: z.boolean().refine((v) => v === true, m("AI ikizi için açık rıza vermelisin.")),
});
export type CreatorTwinInput = z.input<typeof creatorTwinSchema>;

const topic = z.string().trim().min(2).max(40);
export const creatorCustomizeSchema = z.object({
  warmth: z.number().int().min(0).max(100),
  formality: z.number().int().min(0).max(100),
  humor: z.number().int().min(0).max(100),
  energy: z.number().int().min(0).max(100),
  emojiUsage: z.enum(["none", "low", "medium", "high"]),
  messageLength: z.enum(["short", "medium", "long"]),
  allowedTopics: z.array(topic).max(12, m("En fazla 12 konu.")),
  blockedTopics: z.array(topic).max(12, m("En fazla 12 konu.")),
  allowPersonalQuestions: z.boolean(),
  allowMediaRequests: z.boolean(),
  allowCustomRequests: z.boolean(),
  knowledgeConsent: z.boolean(),
  voiceConsent: z.boolean(),
});
export type CreatorCustomizeInput = z.input<typeof creatorCustomizeSchema>;
