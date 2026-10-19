"use client";
import { authErrorMessage } from "@/lib/auth/client";
import { EXTRA_AUTH_MESSAGES } from "./messages";

export interface AuthClientError {
  code?: string;
  message?: string;
  status?: number;
  statusText?: string;
}

/** Better Auth istemci hatasını kullanıcıya gösterilecek Türkçe metne çevirir. */
export function authErrorText(error: AuthClientError | null | undefined): string {
  if (!error) return authErrorMessage();
  if (error.status === 429) return authErrorMessage("TOO_MANY_REQUESTS");
  if (error.code && EXTRA_AUTH_MESSAGES[error.code]) return EXTRA_AUTH_MESSAGES[error.code]!;
  return authErrorMessage(error.code);
}

/** İstek hiç sunucuya ulaşamadığında (ağ hatası) gösterilecek metin. */
export const NETWORK_ERROR = "Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.";
