import "server-only";
import { env } from "@/config/env";

/** Hangi sosyal giriş sağlayıcıları yapılandırılmış? (Sırlar asla istemciye gönderilmez; yalnız bayrak.) */
export function socialProviderFlags() {
  const e = env();
  return {
    google: !!(e.AUTH_GOOGLE_ID && e.AUTH_GOOGLE_SECRET),
    apple: !!(e.AUTH_APPLE_ID && e.AUTH_APPLE_SECRET),
  };
}
export type SocialProviderFlags = ReturnType<typeof socialProviderFlags>;
