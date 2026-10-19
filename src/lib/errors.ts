/** Kullanıcıya gösterilebilir (Türkçe) hata. Diğer hatalar genel mesajla maskelenir. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string = "app_error",
    readonly status: number = 400,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Kayıt bulunamadı.") {
    super(message, "not_found", 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Bu işlem şu anki durumla çakışıyor.", code = "conflict") {
    super(message, code, 409);
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(required: number, balance: number) {
    super(`Yetersiz kredi. Gerekli: ${required}, bakiye: ${balance}.`, "insufficient_credits", 402, { required, balance });
  }
}

export class FeatureUnavailableError extends AppError {
  constructor(message: string, readonly missing: string[] = []) {
    super(message, "feature_unavailable", 503, { missing });
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSec: number) {
    super(`Çok fazla istek. ${retryAfterSec} sn sonra tekrar deneyin.`, "rate_limited", 429, { retryAfterSec });
  }
}

/** Server Action dönüş tipi. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string[]> };

export function toActionError(err: unknown): { ok: false; error: string; code?: string; fieldErrors?: Record<string, string[]> } {
  if (err instanceof AppError) return { ok: false, error: err.message, code: err.code };
  const e = err as { name?: string; message?: string; status?: number; issues?: { path: (string | number)[]; message: string }[] };
  if (e?.name === "ForbiddenError" || e?.name === "UnauthorizedError") return { ok: false, error: e.message ?? "Yetkisiz işlem.", code: e.name };
  if (e?.name === "ZodError" && Array.isArray(e.issues)) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of e.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { ok: false, error: "Lütfen formdaki hataları düzeltin.", code: "validation", fieldErrors };
  }
  if (e?.name === "ValidationError") return { ok: false, error: "Girilen bilgiler geçersiz.", code: "validation" };
  console.error("[action:error]", err);
  return { ok: false, error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.", code: "internal" };
}

export function httpStatusOf(err: unknown): number {
  if (err instanceof AppError) return err.status;
  const s = (err as { status?: number })?.status;
  return typeof s === "number" ? s : 500;
}
