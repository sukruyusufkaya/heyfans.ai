import "server-only";
import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { AppError, httpStatusOf, toActionError } from "@/lib/errors";
import { getT } from "@/i18n/server";

/**
 * Çerezle kimlik doğrulanan durum değiştiren Route Handler'lar için CSRF koruması:
 * Origin (yoksa Referer) uygulamanın kendi origin'i olmalı. (Server Actions bunu Next.js'te zaten yapar.)
 */
export function assertSameOrigin(request: Request) {
  const allowed = new URL(env().APP_URL).origin;
  const origin = request.headers.get("origin") ?? (request.headers.get("referer") ? new URL(request.headers.get("referer")!).origin : null);
  const host = request.headers.get("host");
  const sameHost = origin && host && new URL(origin).host === host;
  if (!origin || (origin !== allowed && !sameHost)) throw new AppError("Geçersiz istek kaynağı.", "bad_origin", 403);
}

/** API hata yanıtı. Güvenli (kullanıcıya gösterilebilir) hataların mesajı isteğin diline çevrilir. */
export async function jsonError(err: unknown) {
  const e = err as { code?: string; name?: string };
  const safe = err instanceof AppError || e?.name === "ForbiddenError" || e?.name === "UnauthorizedError";
  if (!safe) console.error("[api:error]", err);
  const t = await getT();
  const message = safe ? (await toActionError(err)).error : t("Beklenmeyen bir hata oluştu.");
  return NextResponse.json({ error: message, code: (err as AppError)?.code ?? e?.name ?? "internal" }, { status: safe ? httpStatusOf(err) : 500 });
}
