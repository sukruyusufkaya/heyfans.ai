/** Giriş sırasında 2FA sayfasına geçerken `next` değerini taşıyan oturum deposu anahtarı. */
export const LOGIN_NEXT_KEY = "hf.login.next";

/** Hayran karşılama: "tercihler" adımındaki ruh halleri (slug → etiket). */
export const FAN_VIBES = [
  { key: "enerjik", label: "Enerjik", hint: "Hareketli, motive eden" },
  { key: "rahatlatici", label: "Rahatlatıcı", hint: "Sakin, huzur veren" },
  { key: "eglenceli", label: "Eğlenceli", hint: "Neşeli, kahkaha dolu" },
  { key: "romantik", label: "Romantik", hint: "Duygusal, sıcak" },
  { key: "motivasyon", label: "Motivasyon", hint: "İlham veren, cesaretlendiren" },
  { key: "yaratici", label: "Yaratıcı", hint: "Sanatsal, özgün" },
  { key: "macera", label: "Macera", hint: "Keşfetmeyi seven" },
  { key: "samimi", label: "Samimi", hint: "Yakın, içten sohbet" },
] as const;

export const FAN_VIBE_KEYS = FAN_VIBES.map((v) => v.key) as [string, ...string[]];

export const FAN_STEPS = [
  { key: "interests", label: "İlgi Alanları" },
  { key: "vibes", label: "Tercihler" },
  { key: "personalize", label: "Kişiselleştir" },
  { key: "finish", label: "Tamamla" },
] as const;

export const MIN_FAN_INTERESTS = 3;

/** Creator karşılama: ekranda 7 adım (ilk üçü soru soru), arka uçta adım anahtarlarına eşlenir. */
export const CREATOR_GROUPS = [
  { key: "profile", label: "Profil", backend: ["account"] },
  { key: "contact", label: "İletişim", backend: ["contact"] },
  { key: "social", label: "Sosyal medya", backend: ["social"] },
  { key: "verify", label: "Doğrula", backend: ["verify"] },
  { key: "twin", label: "AI İkizi", backend: ["twin"] },
  { key: "customize", label: "Özelleştir", backend: ["persona", "knowledge", "likeness", "boundaries"] },
  { key: "review", label: "İncele", backend: ["preview", "submit"] },
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
  { value: "none", label: "Hiç" },
  { value: "low", label: "Az" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Çok" },
] as const;

export const MESSAGE_LENGTH_OPTIONS = [
  { value: "short", label: "Kısa", hint: "1-2 cümle" },
  { value: "medium", label: "Orta", hint: "3-4 cümle" },
  { value: "long", label: "Uzun", hint: "Ayrıntılı" },
] as const;
