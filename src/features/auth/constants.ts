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

/** Creator karşılama: ekranda 5 adım, arka uçta 10 adımlık anahtarlara eşlenir. */
export const CREATOR_GROUPS = [
  { key: "connect", label: "Bağla", backend: ["account", "social"] },
  { key: "verify", label: "Doğrula", backend: ["verify"] },
  { key: "twin", label: "AI İkizi", backend: ["twin"] },
  { key: "customize", label: "Özelleştir", backend: ["persona", "knowledge", "likeness", "boundaries"] },
  { key: "review", label: "İncele", backend: ["preview", "submit"] },
] as const;
export type CreatorGroupKey = (typeof CREATOR_GROUPS)[number]["key"];

/** Ekrandaki bir adım, ilgili arka uç adımları kaydedildiğinde "tamamlandı" sayılır (sunucu ve istemci ortak kullanır). */
export function creatorGroupDone(key: CreatorGroupKey, completed: ReadonlySet<string>): boolean {
  switch (key) {
    case "connect":
      return completed.has("account");
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
export const CREATOR_REQUIRED_STEPS = ["account", "verify", "twin", "persona", "boundaries"] as const;

export const SOCIAL_PLATFORM_META = [
  { key: "instagram", label: "Instagram", placeholder: "@kullaniciadi" },
  { key: "tiktok", label: "TikTok", placeholder: "@kullaniciadi" },
  { key: "youtube", label: "YouTube", placeholder: "Kanal adı veya @kanal" },
  { key: "x", label: "X / Twitter", placeholder: "@kullaniciadi" },
] as const;

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
