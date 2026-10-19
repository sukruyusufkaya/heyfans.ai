/**
 * Creator iletişim ve sosyal hesap kuralları — sunucu (model/servis) ve istemci (başvuru sihirbazı) ortak kullanır.
 * Saf modül: Mongo/Node bağımlılığı yoktur.
 */

/* ─── Sosyal hesaplar ─────────────────────────────────────── */
export const SOCIAL_PLATFORMS = ["instagram", "tiktok", "youtube", "x", "twitch", "kick", "website"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const AUDIENCE_RANGES = [
  { key: "lt1k", label: "1 binden az" },
  { key: "1k_10k", label: "1 bin – 10 bin" },
  { key: "10k_50k", label: "10 bin – 50 bin" },
  { key: "50k_100k", label: "50 bin – 100 bin" },
  { key: "100k_500k", label: "100 bin – 500 bin" },
  { key: "500k_1m", label: "500 bin – 1 milyon" },
  { key: "gt1m", label: "1 milyondan fazla" },
] as const;
export type AudienceRange = (typeof AUDIENCE_RANGES)[number]["key"];
export const AUDIENCE_KEYS = AUDIENCE_RANGES.map((a) => a.key) as unknown as readonly [AudienceRange, ...AudienceRange[]];
export const audienceLabel = (k: string | null | undefined) => AUDIENCE_RANGES.find((a) => a.key === k)?.label ?? null;

interface PlatformMeta {
  key: SocialPlatform;
  label: string;
  question: string;
  hint: string;
  placeholder: string;
  /** Kullanıcı adı kuralı (URL veya @ ile yazılsa da ayıklanır). */
  pattern: RegExp;
  patternError: string;
  /** Bağlantıdan kullanıcı adını çıkaran desenler. */
  hosts: RegExp[];
  url: (handle: string) => string;
  /** Kitle büyüklüğü sorulur mu (web sitesinde sorulmaz). */
  audience: boolean;
}

export const SOCIAL_META: readonly PlatformMeta[] = [
  {
    key: "instagram",
    label: "Instagram",
    question: "Instagram hesabın hangisi?",
    hint: "Kullanıcı adını ya da profil bağlantını yapıştırabilirsin.",
    placeholder: "kullaniciadi",
    pattern: /^(?!.*\.\.)(?!\.)(?!.*\.$)[a-z0-9._]{1,30}$/,
    patternError: "Instagram kullanıcı adı 1–30 karakter; harf, rakam, nokta ve alt çizgi içerebilir.",
    hosts: [/instagram\.com\/([^/?#]+)/i],
    url: (h) => `https://www.instagram.com/${h}/`,
    audience: true,
  },
  {
    key: "tiktok",
    label: "TikTok",
    question: "TikTok hesabın hangisi?",
    hint: "@ ile başlayan kullanıcı adın ya da profil bağlantın.",
    placeholder: "kullaniciadi",
    pattern: /^(?!.*\.$)[a-z0-9._]{2,24}$/,
    patternError: "TikTok kullanıcı adı 2–24 karakter; harf, rakam, nokta ve alt çizgi içerebilir.",
    hosts: [/tiktok\.com\/@([^/?#]+)/i],
    url: (h) => `https://www.tiktok.com/@${h}`,
    audience: true,
  },
  {
    key: "youtube",
    label: "YouTube",
    question: "YouTube kanalın hangisi?",
    hint: "Kanal adın (@kanal) ya da kanal bağlantın.",
    placeholder: "kanaladi",
    pattern: /^[a-z0-9._-]{3,30}$/,
    patternError: "YouTube kanal adı 3–30 karakter; harf, rakam, nokta, tire ve alt çizgi içerebilir.",
    hosts: [/youtube\.com\/@([^/?#]+)/i, /youtube\.com\/(?:c|user)\/([^/?#]+)/i],
    url: (h) => `https://www.youtube.com/@${h}`,
    audience: true,
  },
  {
    key: "x",
    label: "X (Twitter)",
    question: "X (Twitter) hesabın hangisi?",
    hint: "Kullanıcı adın ya da profil bağlantın.",
    placeholder: "kullaniciadi",
    pattern: /^[a-z0-9_]{1,15}$/,
    patternError: "X kullanıcı adı 1–15 karakter; harf, rakam ve alt çizgi içerebilir.",
    hosts: [/(?:x|twitter)\.com\/([^/?#]+)/i],
    url: (h) => `https://x.com/${h}`,
    audience: true,
  },
  {
    key: "twitch",
    label: "Twitch",
    question: "Twitch kanalın var mı?",
    hint: "Canlı yayın yapıyorsan kanal adını yaz.",
    placeholder: "kanaladi",
    pattern: /^[a-z0-9_]{4,25}$/,
    patternError: "Twitch kanal adı 4–25 karakter; harf, rakam ve alt çizgi içerebilir.",
    hosts: [/twitch\.tv\/([^/?#]+)/i],
    url: (h) => `https://www.twitch.tv/${h}`,
    audience: true,
  },
  {
    key: "kick",
    label: "Kick",
    question: "Kick kanalın var mı?",
    hint: "Kick'te yayın yapıyorsan kanal adını yaz.",
    placeholder: "kanaladi",
    pattern: /^[a-z0-9_-]{3,25}$/,
    patternError: "Kick kanal adı 3–25 karakter; harf, rakam, tire ve alt çizgi içerebilir.",
    hosts: [/kick\.com\/([^/?#]+)/i],
    url: (h) => `https://kick.com/${h}`,
    audience: true,
  },
  {
    key: "website",
    label: "Web sitesi",
    question: "Kişisel web siten ya da bağlantı sayfan var mı?",
    hint: "Örn. kendi alan adın veya bağlantı sayfan (https:// ile).",
    placeholder: "https://alanadin.com",
    pattern: /^https:\/\/[^\s/$.?#][^\s]{2,200}$/i,
    patternError: "https:// ile başlayan geçerli bir adres yaz.",
    hosts: [],
    url: (h) => h,
    audience: false,
  },
];
export const socialMeta = (key: string) => SOCIAL_META.find((p) => p.key === key);

/** Kullanıcının yazdığı değeri (bağlantı, @ad, boşluklu) temiz kullanıcı adına çevirir ve doğrular. */
export function normalizeSocial(platform: SocialPlatform, raw: string): { ok: true; handle: string; url: string } | { ok: false; error: string } {
  const meta = socialMeta(platform);
  if (!meta) return { ok: false, error: "Bilinmeyen platform." };
  let v = raw.trim();
  if (!v) return { ok: false, error: "Bu alanı doldur ya da “Bu platformu kullanmıyorum”u seç." };
  if (platform === "website") {
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    v = v.replace(/^http:\/\//i, "https://");
    try {
      const u = new URL(v);
      if (!u.hostname.includes(".")) return { ok: false, error: meta.patternError };
      const clean = u.toString().replace(/\/$/, "");
      return { ok: true, handle: clean, url: clean };
    } catch {
      return { ok: false, error: meta.patternError };
    }
  }
  for (const h of meta.hosts) {
    const m = v.match(h);
    if (m?.[1]) {
      v = m[1];
      break;
    }
  }
  v = v.replace(/^@+/, "").replace(/\/+$/, "").toLowerCase();
  if (!meta.pattern.test(v)) return { ok: false, error: meta.patternError };
  return { ok: true, handle: v, url: meta.url(v) };
}

/* ─── Telefon ─────────────────────────────────────────────── */
export const PHONE_COUNTRIES = [
  { code: "TR", dial: "90", label: "Türkiye", min: 10, max: 10, example: "532 123 45 67" },
  { code: "DE", dial: "49", label: "Almanya", min: 10, max: 11, example: "1512 3456789" },
  { code: "NL", dial: "31", label: "Hollanda", min: 9, max: 9, example: "6 12345678" },
  { code: "GB", dial: "44", label: "Birleşik Krallık", min: 10, max: 10, example: "7400 123456" },
  { code: "FR", dial: "33", label: "Fransa", min: 9, max: 9, example: "6 12 34 56 78" },
  { code: "AT", dial: "43", label: "Avusturya", min: 10, max: 13, example: "664 1234567" },
  { code: "BE", dial: "32", label: "Belçika", min: 9, max: 9, example: "470 12 34 56" },
  { code: "CH", dial: "41", label: "İsviçre", min: 9, max: 9, example: "78 123 45 67" },
  { code: "AZ", dial: "994", label: "Azerbaycan", min: 9, max: 9, example: "50 123 45 67" },
  { code: "US", dial: "1", label: "ABD / Kanada", min: 10, max: 10, example: "201 555 0123" },
] as const;
export type PhoneCountry = (typeof PHONE_COUNTRIES)[number]["code"];
export const PHONE_COUNTRY_CODES = PHONE_COUNTRIES.map((c) => c.code) as unknown as readonly [PhoneCountry, ...PhoneCountry[]];

/** Ulusal numarayı E.164 biçimine çevirir. Türkiye'de yalnız 5 ile başlayan cep numaraları kabul edilir. */
export function normalizePhone(country: string, national: string): { ok: true; e164: string; display: string } | { ok: false; error: string } {
  const c = PHONE_COUNTRIES.find((x) => x.code === country);
  if (!c) return { ok: false, error: "Ülke kodunu seç." };
  let digits = national.replace(/\D/g, "");
  if (digits.startsWith("00" + c.dial)) digits = digits.slice(2 + c.dial.length);
  else if (digits.startsWith(c.dial) && digits.length > c.max) digits = digits.slice(c.dial.length);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits) return { ok: false, error: "Telefon numaranı yaz." };
  if (digits.length < c.min || digits.length > c.max) return { ok: false, error: `${c.label} numarası ${c.min === c.max ? c.min : `${c.min}–${c.max}`} haneli olmalı (örn. ${c.example}).` };
  if (c.code === "TR" && !digits.startsWith("5")) return { ok: false, error: "Türkiye için 5 ile başlayan bir cep telefonu numarası yaz (örn. 532 123 45 67)." };
  return { ok: true, e164: `+${c.dial}${digits}`, display: formatNational(c.code, digits) };
}

/** Gruplar: TR 3-3-2-2, diğerleri 3'erli. Rakam veya maske (*) karakterleriyle çalışır. */
export function formatNational(country: string, digits: string) {
  const parts = country === "TR" ? [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8)] : (digits.match(/.{1,3}/g) ?? []);
  return parts.filter(Boolean).join(" ");
}

/** "+90 5** *** ** 67" — yalnız ülke kodu ilk hane ve son iki hane görünür. */
export function maskPhone(e164: string) {
  const c = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((x) => e164.startsWith(`+${x.dial}`));
  const dial = c?.dial ?? e164.slice(1, 3);
  const rest = e164.slice(1 + dial.length);
  const masked = rest.length > 3 ? `${rest[0]}${"*".repeat(rest.length - 3)}${rest.slice(-2)}` : rest;
  return `+${dial} ${formatNational(c?.code ?? "", masked)}`;
}

export const CONTACT_PREFERENCES = [
  { key: "phone", label: "Telefon araması" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Yalnız e-posta" },
] as const;
export type ContactPreference = (typeof CONTACT_PREFERENCES)[number]["key"];
