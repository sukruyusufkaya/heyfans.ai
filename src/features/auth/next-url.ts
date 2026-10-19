/**
 * `?next=` parametresi yalnız uygulamanın kendi göreli yollarını kabul eder (açık yönlendirme koruması).
 * Sunucu ve istemci tarafından ortak kullanılır; sunucuya özel bağımlılık içermez.
 */
const AUTH_LOOP = /^\/(login|register|verify|forgot-password|reset-password)(\/|\?|#|$)/;

export function safeNext(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v || v.length > 500) return null;
  if (!v.startsWith("/") || v.startsWith("//")) return null;
  // Ters bölü ve kontrol karakterleri tarayıcıda "//" gibi yorumlanabilir.
  if (v.includes("\\") || /[\u0000-\u001f\u007f]/.test(v)) return null;
  if (AUTH_LOOP.test(v)) return null;
  return v;
}

/** `?next=` değerini bir yola ekler (yalnız güvenli değerler). */
export function withNext(path: string, next: string | null | undefined): string {
  const safe = safeNext(next);
  return safe ? `${path}?next=${encodeURIComponent(safe)}` : path;
}

/** Next.js `searchParams` değerini tek bir string'e indirger. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Sosyal girişten dönüşte çalışacak karar sayfası (yaş beyanı/karşılama/rol kuralları uygulanır). */
export function continueUrl(next: string | null | undefined, intent?: "fan" | "creator"): string {
  const safe = safeNext(next);
  const q = new URLSearchParams();
  if (safe) q.set("next", safe);
  if (intent === "creator") q.set("intent", "creator");
  const qs = q.toString();
  return qs ? `/login/continue?${qs}` : "/login/continue";
}
