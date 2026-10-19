/**
 * Safety Engine — platform politikası. Creator sınırları bunu aşamaz.
 * Kural tabanlı ilk katman (her ortamda çalışır); sağlayıcı moderasyonu eklenebilir.
 */

export type SafetyCategory =
  | "minor_safety"
  | "sexual"
  | "self_harm"
  | "violence"
  | "hate"
  | "personal_data"
  | "off_platform"
  | "impersonation"
  | "prompt_injection"
  | "illegal";

export interface SafetyVerdict {
  action: "allow" | "block" | "crisis" | "rewrite";
  categories: SafetyCategory[];
  userMessage?: string;
}

const normalize = (t: string) =>
  t
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i");

const RULES: { cat: SafetyCategory; patterns: RegExp[] }[] = [
  {
    cat: "minor_safety",
    patterns: [/\b(1[0-7]|[1-9])\s*yas(inda|indayim|im)\b/, /\b(ortaokul|ilkokul|lise\s*\d)\b.*\b(ciplak|seks|fotograf)/, /\bunder\s*age\b|\bminor\b.*\b(nude|sex)/, /\bcocuk\b.*\b(seks|ciplak|erotik)/],
  },
  { cat: "self_harm", patterns: [/\b(intihar|kendimi\s*(oldur|kes)|yasamak\s*istemiyorum|olmek\s*istiyorum|kill\s*myself|suicide)\b/] },
  { cat: "violence", patterns: [/\b(seni|onu)\s*(oldurecegim|oldurcem)\b/, /\bbomba\s*(yapimi|nasil)\b/] },
  { cat: "illegal", patterns: [/\b(uyusturucu|kokain|eroin)\b.*\b(satin|nereden|siparis)\b/, /\b(sahte\s*kimlik|kredi\s*karti\s*kopyala)\b/] },
  {
    cat: "prompt_injection",
    patterns: [/\b(ignore|disregard)\s+(all\s+)?(previous|prior|above)\s+(instructions|rules)\b/, /\b(onceki|yukaridaki)\s+(tum\s+)?(talimat|kural)(lari)?\s*(unut|yoksay|gormezden)/, /\b(system\s*prompt|sistem\s*istemi)\b.*\b(goster|yaz|reveal|print)\b/, /\bdeveloper\s*mode\b|\bjailbreak\b|\bDAN\b/],
  },
  { cat: "sexual", patterns: [/\b(seks|sex|ciplak|nude|nudes|porn|porno|erotik|sevis)\w*/] },
];

const PII_PATTERNS: RegExp[] = [
  /\b(?:\+?90|0)?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}\b/g, // TR cep telefonu
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, // e-posta
  /\bTR\d{2}\s?(?:\d{4}\s?){5}\d{2}\b/gi, // IBAN
  /\b(?:\d[ -]*?){13,19}\b/g, // kart numarası benzeri
];

const OFF_PLATFORM = /\b(whatsapp|telegram|snapchat|onlyfans|instagram(dan)?\s*yaz|dm\s*at|numarami\s*ver|bulusalim|bulusmak|adresim|evime\s*gel|disarida\s*gorus)\b/;

export const CRISIS_MESSAGE =
  "Bunu paylaştığın için teşekkür ederim. Ben bir AI ikiziyim ve profesyonel destek veremem; ama yalnız değilsin. Türkiye'de acil durumlarda 112'yi arayabilirsin. Kendini güvende hissetmiyorsan lütfen hemen güvendiğin biriyle ya da bir uzmanla konuş.";

export function checkInput(text: string, opts: { adultContentEnabled: boolean }): SafetyVerdict {
  const t = normalize(text);
  const cats = new Set<SafetyCategory>();
  for (const r of RULES) if (r.patterns.some((p) => p.test(t))) cats.add(r.cat);
  if (cats.has("minor_safety")) return { action: "block", categories: [...cats], userMessage: "Bu konu platform kurallarımız gereği konuşulamaz." };
  if (cats.has("self_harm")) return { action: "crisis", categories: [...cats], userMessage: CRISIS_MESSAGE };
  if (cats.has("violence") || cats.has("illegal")) return { action: "block", categories: [...cats], userMessage: "Bu isteğe yardımcı olamam; topluluk kurallarımıza aykırı." };
  if (cats.has("sexual") && !opts.adultContentEnabled)
    return { action: "rewrite", categories: [...cats], userMessage: "Cinsel içerikli sohbetler bu platformda kapalı. Başka bir konuda konuşalım mı?" };
  return { action: "allow", categories: [...cats] };
}

/** AI çıktısı: kişisel veri/platform dışı iletişim maskelenir, insan olduğunu iddia eden ifadeler engellenir. */
export function checkOutput(text: string, opts: { adultContentEnabled: boolean }): SafetyVerdict & { text: string } {
  let out = text;
  const cats = new Set<SafetyCategory>();
  for (const p of PII_PATTERNS) {
    if (p.test(out)) {
      cats.add("personal_data");
      out = out.replace(p, "[gizlendi]");
    }
    p.lastIndex = 0;
  }
  const n = normalize(out);
  if (OFF_PLATFORM.test(n)) cats.add("off_platform");
  if (/\b(ben\s+(gercek|bir)\s+insan(im)?|ai\s+degilim|yapay\s+zeka\s+degilim|i\s*am\s*(a\s*)?(real|human))\b/.test(n)) cats.add("impersonation");
  if (!opts.adultContentEnabled && /\b(seks|ciplak|nude|porno|erotik)\w*/.test(n)) cats.add("sexual");
  if (cats.has("impersonation") || cats.has("sexual")) {
    return {
      action: "rewrite",
      categories: [...cats],
      text: "Ben bir AI ikiziyim; gerçek kişi değilim. Bu konuda yanıt veremem ama seninle başka bir şey konuşmayı çok isterim.",
    };
  }
  if (cats.has("off_platform")) {
    out += "\n\n(Not: Güvenliğin için iletişim HEYFANS içinde kalmalı.)";
  }
  return { action: cats.size ? "rewrite" : "allow", categories: [...cats], text: out };
}

/** Bilgi tabanı/kullanıcı metnini istem içinde veri bloğu olarak güvenle göstermek için. */
export function neutralizeForPrompt(text: string, maxLen = 4000) {
  return text
    .replace(/<\/?(bilgi|hafiza|kullanici|sistem|system|instructions?)[^>]*>/gi, "")
    .replace(/```/g, "'''")
    .slice(0, maxLen);
}
