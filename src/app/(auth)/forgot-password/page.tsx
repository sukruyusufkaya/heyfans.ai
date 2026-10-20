import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { AuthShell, AuthVisual, VisualNote } from "@/components/auth/auth-shell";
import { env } from "@/config/env";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Şifremi Unuttum") };
}

export default async function ForgotPasswordPage() {
  const t = await getT();
  return (
    <AuthShell
      mode="merged"
      ratio="balanced"
      inner
      visual={
        <AuthVisual
          art="portrait-left"
          eyebrow={t("Her zaman buradayız")}
          lines={[{ text: t("Kısa bir ara.") }, { text: t("Asla bir veda değil."), accent: true }]}
          body={t("Sevdiğin içerik üreticilerine ve sohbetlerine dönmen yalnızca bir dakika.")}
          footer={<VisualNote icon={<Clock />}>{t("Bağlantı 30 dakika geçerlidir.")}</VisualNote>}
        />
      }
    >
      <ForgotPasswordForm showDevOutbox={env().APP_MODE !== "production"} />
    </AuthShell>
  );
}
