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

/**
 * Creator karşılama asistanı: sohbette sorulan adımlar (dizi sırası = soru sırası).
 * Hepsi yanıtlandığında (isteğe bağlılar "geç" ile yanıtlanmış sayılır) özet ve başvuru gönderimi gelir.
 */
export const ASSISTANT_STEPS = ["birthDate", "displayName", "username", "avatar", "cover", "categories", "socials", "bio", "location", "tone", "greeting", "topics", "contact", "legalName", "consents"] as const;
export type AssistantStep = (typeof ASSISTANT_STEPS)[number];
export const isAssistantStep = (s: string): s is AssistantStep => (ASSISTANT_STEPS as readonly string[]).includes(s);

/** Konuşma tonu → AI ikizinin kişilik ayarları (ince ayar sonradan Creator Studio'dan yapılır). */
export const TONE_PRESETS = {
  warm: { label: m("Samimi ve sıcak"), hint: m("Yakın, içten, destekleyici"), emoji: "😊", persona: { warmth: 85, formality: 20, humor: 45, energy: 55 } },
  fun: { label: m("Eğlenceli ve esprili"), hint: m("Şakacı, neşeli, rahat"), emoji: "🎉", persona: { warmth: 70, formality: 15, humor: 85, energy: 75 } },
  energetic: { label: m("Enerjik ve motive edici"), hint: m("Coşkulu, ilham veren"), emoji: "⚡", persona: { warmth: 70, formality: 25, humor: 55, energy: 90 } },
  calm: { label: m("Sakin ve bilgili"), hint: m("Dingin, açıklayıcı, net"), emoji: "🌿", persona: { warmth: 60, formality: 55, humor: 25, energy: 35 } },
} as const;
export type ToneKey = keyof typeof TONE_PRESETS;
export const TONE_KEYS = Object.keys(TONE_PRESETS) as [ToneKey, ...ToneKey[]];

/** Asistanın önerdiği ilk karşılama mesajı (creator düzenleyebilir). Ek üretmemek için ad cümleye eksiz yerleşir. */
export const GREETING_TEMPLATES: Record<ToneKey, string> = {
  warm: m("Selam, hoş geldin! Ben {name}, daha doğrusu AI ikizi. Seninle tanıştığıma çok sevindim; bugün neler konuşalım?"),
  fun: m("Heyy, selam! {name} burada, AI ikizi versiyonuyla. Eğlenceli bir sohbete hazır mısın?"),
  energetic: m("Selam! Ben {name}, AI ikizi olarak buradayım. Bugün seni ne heyecanlandırıyor? Hadi başlayalım!"),
  calm: m("Merhaba, hoş geldin. Ben {name}, AI ikizi olarak sorularını yanıtlamak için buradayım. Neyi merak ediyorsun?"),
};

export const EMOJI_OPTIONS = [
  { value: "none", label: m("Hiç") },
  { value: "low", label: m("Az") },
  { value: "medium", label: m("Orta") },
  { value: "high", label: m("Çok") },
] as const;
export type EmojiUsage = (typeof EMOJI_OPTIONS)[number]["value"];
export const EMOJI_KEYS = EMOJI_OPTIONS.map((o) => o.value) as [EmojiUsage, ...EmojiUsage[]];

/** AI ikizinin konuşmayacağı konular için hazır seçenekler (creator kendi konusunu da ekleyebilir). */
export const BLOCKED_TOPIC_OPTIONS = [m("Siyaset"), m("Din"), m("Özel hayatım ve ilişkilerim"), m("Ailem"), m("Sağlık ve tıbbi tavsiye"), m("Para ve yatırım tavsiyesi")];
export const MAX_BLOCKED_TOPICS = 12;
