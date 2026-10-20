"use client";
import { authErrorMessage } from "@/lib/auth/client";
import { useT } from "@/i18n/client";
import { m } from "@/i18n/m";
import { EXTRA_AUTH_MESSAGES } from "./messages";

export interface AuthClientError {
  code?: string;
  message?: string;
  status?: number;
  statusText?: string;
}

/** Better Auth istemci hatasını Türkçe kaynak metne çevirir; gösterirken `t(authErrorText(error))` çağrılır. */
export function authErrorText(error: AuthClientError | null | undefined): string {
  if (!error) return authErrorMessage();
  if (error.status === 429) return authErrorMessage("TOO_MANY_REQUESTS");
  if (error.code && EXTRA_AUTH_MESSAGES[error.code]) return EXTRA_AUTH_MESSAGES[error.code]!;
  return authErrorMessage(error.code);
}

/** İstek hiç sunucuya ulaşamadığında (ağ hatası) gösterilecek metin. */
export const NETWORK_ERROR = m("Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.");

/** Form alanı hata iletisini (zod `m()` metni) geçerli dile çevirir; ileti yoksa `undefined` döner. */
export function useFieldError(): (message: string | undefined) => string | undefined {
  const t = useT();
  return (message) => (message ? t(message) : undefined);
}
