import "server-only";
import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { AppError, httpStatusOf } from "@/lib/errors";

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

export function jsonError(err: unknown) {
  const status = httpStatusOf(err);
  const e = err as { message?: string; code?: string; name?: string };
  const safe = err instanceof AppError || e?.name === "ForbiddenError" || e?.name === "UnauthorizedError";
  if (!safe) console.error("[api:error]", err);
  return NextResponse.json(
    { error: safe ? e.message : "Beklenmeyen bir hata oluştu.", code: (err as AppError)?.code ?? e?.name ?? "internal" },
    { status: safe ? status : 500 },
  );
}
