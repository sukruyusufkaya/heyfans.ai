import { m } from "@/i18n/m";

/** Giriş sırasında 2FA sayfasına geçerken `next` değerini taşıyan oturum deposu anahtarı. */
export const LOGIN_NEXT_KEY = "hf.login.next";

/** Hayran karşılama: "tercihler" adımındaki ruh halleri (slug → etiket). */
export const FAN_VIBES = [
  { key: "enerjik", label: m("Enerjik"), hint: m("Hareketli, motive eden") },
  { key: "rahatlatici", label: m("Rahatlatıcı"), hint: m("Sakin, huzur veren") },
  { key: "eglenceli", label: m("Eğlenceli"), hint: m("Neşeli, kahkaha dolu") },
  { key: "romantik", label: m("Romantik"), hint: m("Duygusal, sıcak") },
  { key: "motivasyon", label: m("Motivasyon"), hint: m("İlham veren, cesaretlendiren") },
  { key: "yaratici", label: m("Yaratıcı"), hint: m("Sanatsal, özgün") },
  { key: "macera", label: m("Macera"), hint: m("Keşfetmeyi seven") },
  { key: "samimi", label: m("Samimi"), hint: m("Yakın, içten sohbet") },
] as const;

export const FAN_VIBE_KEYS = FAN_VIBES.map((v) => v.key) as [string, ...string[]];

export const FAN_STEPS = [
  { key: "interests", label: m("İlgi Alanları") },
  { key: "vibes", label: m("Tercihler") },
  { key: "personalize", label: m("Kişiselleştir") },
  { key: "finish", label: m("Tamamla") },
] as const;

export const MIN_FAN_INTERESTS = 3;

/** Creator karşılama: ekranda 7 adım (ilk üçü soru soru), arka uçta adım anahtarlarına eşlenir. */
export const CREATOR_GROUPS = [
  { key: "profile", label: m("Profil"), backend: ["account"] },
  { key: "contact", label: m("İletişim"), backend: ["contact"] },
  { key: "social", label: m("Sosyal medya"), backend: ["social"] },
  { key: "verify", label: m("Doğrula"), backend: ["verify"] },
  { key: "twin", label: m("AI İkizi"), backend: ["twin"] },
  { key: "customize", label: m("Özelleştir"), backend: ["persona", "knowledge", "likeness", "boundaries"] },
  { key: "review", label: m("İncele"), backend: ["preview", "submit"] },
] as const;
export type CreatorGroupKey = (typeof CREATOR_GROUPS)[number]["key"];

/** Soru soru ilerleyen adımların soruları (her ekranda tek soru). */
export const CREATOR_QUESTIONS = {
  profile: ["identity", "categories", "about"],
  contact: ["phone", "preference"],
  social: ["instagram", "tiktok", "youtube", "x", "twitch", "kick", "website", "primary"],
} as const;
export type QuestionGroupKey = keyof typeof CREATOR_QUESTIONS;
export const isQuestionGroup = (k: string): k is QuestionGroupKey => k in CREATOR_QUESTIONS;

/** Ekrandaki bir adım, ilgili arka uç adımları kaydedildiğinde "tamamlandı" sayılır (sunucu ve istemci ortak kullanır). */
export function creatorGroupDone(key: CreatorGroupKey, completed: ReadonlySet<string>): boolean {
  switch (key) {
    case "profile":
      return completed.has("account");
    case "contact":
      return completed.has("contact");
    case "social":
      return completed.has("social");
    case "verify":
      return completed.has("verify");
    case "twin":
      return completed.has("twin");
    case "customize":
      return completed.has("persona") && completed.has("boundaries");
    case "review":
      return completed.has("submit");
  }
}

/** Başvuru gönderilmeden önce tamamlanmış olması gereken arka uç adımları (servis ile aynı). */
export const CREATOR_REQUIRED_STEPS = ["account", "contact", "social", "verify", "twin", "persona", "boundaries"] as const;


export const EMOJI_OPTIONS = [
  { value: "none", label: m("Hiç") },
  { value: "low", label: m("Az") },
  { value: "medium", label: m("Orta") },
  { value: "high", label: m("Çok") },
] as const;

export const MESSAGE_LENGTH_OPTIONS = [
  { value: "short", label: m("Kısa"), hint: m("1-2 cümle") },
  { value: "medium", label: m("Orta"), hint: m("3-4 cümle") },
  { value: "long", label: m("Uzun"), hint: m("Ayrıntılı") },
] as const;
