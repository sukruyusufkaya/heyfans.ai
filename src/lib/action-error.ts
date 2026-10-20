import "server-only";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";
import { AppError, httpStatusOf } from "./errors";

/*
 * Hataların kullanıcının dilinde döndürülmesi (yalnız sunucu).
 * Hata sınıfları `./errors` içinde ve istemciyle paylaşılabilir; bu modül sunucu çevirmenine bağlı olduğu için ayrıdır.
 */

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

