import "server-only";
import { env } from "@/config/env";

/**
 * Yaş güvencesi sağlayıcı arayüzü. Sağlayıcı yokken yalnız "beyan" (düşük güvence) kaydı tutulur;
 * bu, güçlü yaş doğrulaması SAYILMAZ ve yetişkin özellikleri kapalı kalır.
 */
export interface AgeAssuranceProvider {
  readonly name: string;
  startVerification(input: { userId: string; returnUrl: string }): Promise<{ redirectUrl: string; providerRef: string }>;
}

export function ageProviderStatus() {
  const e = env();
  return { configured: false as boolean, provider: e.AGE_VERIFICATION_PROVIDER, missing: ["AGE_VERIFICATION_PROVIDER", "AGE_VERIFICATION_PROVIDER_KEY"] };
}

/** Yetkili bir yaş güvencesi sağlayıcısı seçildiğinde burada etkinleştirilir. */
export function getAgeProvider(): AgeAssuranceProvider | null {
  return null;
}

export function ageFromBirthDate(birth: Date, now = new Date()) {
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
