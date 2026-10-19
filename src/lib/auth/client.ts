"use client";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";

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

/** Better Auth hata kodlarının Türkçe karşılıkları. */
export function authErrorMessage(code?: string, fallback?: string): string {
  const map: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: "E-posta veya şifre hatalı.",
    EMAIL_NOT_VERIFIED: "E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.",
    USER_ALREADY_EXISTS: "Bu e-posta adresiyle zaten bir hesap var.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Bu e-posta adresiyle zaten bir hesap var.",
    PASSWORD_TOO_SHORT: "Şifre en az 8 karakter olmalı.",
    PASSWORD_TOO_LONG: "Şifre çok uzun.",
    INVALID_TOKEN: "Bağlantının süresi dolmuş veya geçersiz.",
    TOKEN_EXPIRED: "Bağlantının süresi dolmuş. Yeni bir bağlantı iste.",
    INVALID_CODE: "Doğrulama kodu hatalı.",
    INVALID_TWO_FACTOR_CODE: "Doğrulama kodu hatalı.",
    TOO_MANY_REQUESTS: "Çok fazla deneme yaptın. Biraz sonra tekrar dene.",
    FAILED_TO_CREATE_SESSION: "Hesabın şu anda oturum açamıyor. Destek ile iletişime geç.",
    INVALID_PASSWORD: "Şifre hatalı.",
  };
  return (code && map[code]) || fallback || "İşlem tamamlanamadı. Lütfen tekrar dene.";
}
