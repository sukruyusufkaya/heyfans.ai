import { m } from "@/i18n/m";
import { formatMessage, type MessageParams } from "@/i18n/translate";

/**
 * Kullanıcıya gösterilebilir hata. Mesaj kaynak dildeki (Türkçe) metindir ve istemciye dönerken
 * isteğin diline çevrilir (`toActionError`, `localizeError`). Değişkenli mesajda ICU kalıbı + `params`:
 *   throw new AppError("Yetersiz kredi. Gerekli: {required}.", "insufficient_credits", 402, { params: { required } });
 * `message` her zaman biçimlenmiş Türkçe metindir (günlükler); `template` çeviri anahtarıdır.
 */
export class AppError extends Error {
  readonly template: string;
  readonly params?: MessageParams;
  constructor(
    message: string,
    readonly code: string = "app_error",
    readonly status: number = 400,
    readonly details?: Record<string, unknown> & { params?: MessageParams; field?: string },
  ) {
    super(details?.params ? formatMessage("tr", message, details.params) : message);
    this.template = message;
    this.params = details?.params;
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = m("Kayıt bulunamadı.")) {
    super(message, "not_found", 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = m("Bu işlem şu anki durumla çakışıyor."), code = "conflict") {
    super(message, code, 409);
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(required: number, balance: number) {
    super(m("Yetersiz kredi. Gerekli: {required}, bakiye: {balance}."), "insufficient_credits", 402, { required, balance, params: { required, balance } });
  }
}

export class FeatureUnavailableError extends AppError {
  constructor(message: string, readonly missing: string[] = []) {
    super(message, "feature_unavailable", 503, { missing });
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSec: number) {
    super(m("Çok fazla istek. {retryAfterSec} sn sonra tekrar deneyin."), "rate_limited", 429, { retryAfterSec, params: { retryAfterSec } });
  }
}

/** Server Action dönüş tipi. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string[]> };

/** Hata → kullanıcıya gösterilecek mesaj (isteğin dilinde) + kod. API rotaları ve akışlar için. */
export async function localizeError(err: unknown): Promise<{ message: string; code: string; status: number }> {
  const r = await toActionError(err);
  return { message: r.error, code: r.code ?? "internal", status: httpStatusOf(err) };
}

/**
 * Server Action hata dönüşü. Mesajlar isteğin diline çevrilir; istek dışında (betik/test) Türkçe kalır.
 * Çağıranlar `return toActionError(err)` biçiminde kullanır (async fonksiyonda dönen söz otomatik çözülür).
 */
export async function toActionError(err: unknown): Promise<{ ok: false; error: string; code?: string; fieldErrors?: Record<string, string[]> }> {
  const { getT } = await import("@/i18n/server");
  const t = await getT();
  if (err instanceof AppError) {
    // `…Label` ile biten değişkenler kaynak dildeki etiketlerdir (durum adı vb.); onlar da çevrilir.
    const params = err.params && Object.fromEntries(Object.entries(err.params).map(([k, v]) => [k, /Label$/.test(k) && typeof v === "string" ? t(v) : v]));
    const message = t(err.template, params);
    // details.field verilmişse hata ilgili form alanının altında da gösterilir.
    const field = typeof err.details?.field === "string" ? err.details.field : null;
    return field ? { ok: false, error: message, code: err.code, fieldErrors: { [field]: [message] } } : { ok: false, error: message, code: err.code };
  }
  const e = err as { name?: string; message?: string; status?: number; issues?: { path: (string | number)[]; message: string }[] };
  if (e?.name === "ForbiddenError" || e?.name === "UnauthorizedError") return { ok: false, error: t(e.message ?? m("Yetkisiz işlem.")), code: e.name };
  if (e?.name === "ZodError" && Array.isArray(e.issues)) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of e.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(t(issue.message));
    }
    return { ok: false, error: t("Lütfen formdaki hataları düzeltin."), code: "validation", fieldErrors };
  }
  if (e?.name === "ValidationError") return { ok: false, error: t("Girilen bilgiler geçersiz."), code: "validation" };
  console.error("[action:error]", err);
  return { ok: false, error: t("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."), code: "internal" };
}

export function httpStatusOf(err: unknown): number {
  if (err instanceof AppError) return err.status;
  const s = (err as { status?: number })?.status;
  return typeof s === "number" ? s : 500;
}
