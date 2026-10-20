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

export function httpStatusOf(err: unknown): number {
  if (err instanceof AppError) return err.status;
  const s = (err as { status?: number })?.status;
  return typeof s === "number" ? s : 500;
}
