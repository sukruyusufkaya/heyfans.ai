"use client";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";
import { m } from "@/i18n/m";

/** Tarayıcı tarafı auth istemcisi (aynı origin'deki /api/auth uçlarını çağırır). */
export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        username: { type: "string", required: false, input: false },
        roles: { type: "string[]", required: false, input: false },
        adminRole: { type: "string", required: false, input: false },
        status: { type: "string", required: false, input: false },
        signupIntent: { type: "string", required: false, input: true },
        acceptTerms: { type: "boolean", required: false, input: true },
        termsAcceptedAt: { type: "date", required: false, input: false },
        isDemo: { type: "boolean", required: false, input: false },
      },
    }),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = "/login/two-factor";
      },
    }),
  ],
});

/**
 * Better Auth hata kodlarının Türkçe (kaynak dil) karşılıkları.
 * Dönen metin çeviri anahtarıdır: gösterirken `t(authErrorMessage(code))` kullanın.
 */
export function authErrorMessage(code?: string, fallback?: string): string {
  const map: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: m("E-posta veya şifre hatalı."),
    EMAIL_NOT_VERIFIED: m("E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et."),
    USER_ALREADY_EXISTS: m("Bu e-posta adresiyle zaten bir hesap var."),
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: m("Bu e-posta adresiyle zaten bir hesap var."),
    PASSWORD_TOO_SHORT: m("Şifre en az 8 karakter olmalı."),
    PASSWORD_TOO_LONG: m("Şifre çok uzun."),
    INVALID_TOKEN: m("Bağlantının süresi dolmuş veya geçersiz."),
    TOKEN_EXPIRED: m("Bağlantının süresi dolmuş. Yeni bir bağlantı iste."),
    INVALID_CODE: m("Doğrulama kodu hatalı."),
    INVALID_TWO_FACTOR_CODE: m("Doğrulama kodu hatalı."),
    TOO_MANY_REQUESTS: m("Çok fazla deneme yaptın. Biraz sonra tekrar dene."),
    TERMS_REQUIRED: m("Devam etmek için Kullanım Şartları ve Gizlilik Politikası'nı onaylamalısın."),
    FAILED_TO_CREATE_SESSION: m("Hesabın şu anda oturum açamıyor. Destek ile iletişime geç."),
    INVALID_PASSWORD: m("Şifre hatalı."),
  };
  return (code && map[code]) || fallback || m("İşlem tamamlanamadı. Lütfen tekrar dene.");
}
