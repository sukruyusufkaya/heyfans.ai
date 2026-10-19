/**
 * Çerez rızası paylaşılan sabitleri/yardımcıları (sunucu + istemci). Bu dosya "server-only" DEĞİLDİR.
 * `hf_consent` çerezi: URL-kodlu JSON { v: politika sürümü, p, a, m: 0|1, id: anonim kimlik, t: zaman }.
 */
export const CONSENT_COOKIE = "hf_consent";
export const CONSENT_POLICY_VERSION = "2026.1-taslak";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // 180 gün

export interface ConsentChoices {
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface ConsentCookie extends ConsentChoices {
  version: string;
  anonId: string;
  at: number;
}

export function encodeConsent(c: ConsentCookie) {
  return encodeURIComponent(JSON.stringify({ v: c.version, p: +c.preferences, a: +c.analytics, m: +c.marketing, id: c.anonId, t: c.at }));
}

export function decodeConsent(raw: string | null | undefined): ConsentCookie | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(decodeURIComponent(raw)) as { v?: unknown; p?: unknown; a?: unknown; m?: unknown; id?: unknown; t?: unknown };
    if (typeof j.v !== "string" || typeof j.id !== "string") return null;
    return { version: j.v, preferences: j.p === 1, analytics: j.a === 1, marketing: j.m === 1, anonId: j.id.slice(0, 64), at: typeof j.t === "number" ? j.t : 0 };
  } catch {
    return null;
  }
}
