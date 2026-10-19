import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { AuthShell, AuthVisual, VisualNote } from "@/components/auth/auth-shell";
import { env } from "@/config/env";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export const metadata: Metadata = { title: "Şifremi Unuttum" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      mode="merged"
      ratio="balanced"
      inner
      visual={
        <AuthVisual
          art="portrait-left"
          eyebrow="Her zaman buradayız"
          lines={[{ text: "Kısa bir ara." }, { text: "Asla bir veda değil.", accent: true }]}
          body="Sevdiğin içerik üreticilerine ve sohbetlerine dönmen yalnızca bir dakika."
          footer={<VisualNote icon={<Clock />}>Bağlantı 30 dakika geçerlidir.</VisualNote>}
        />
      }
    >
      <ForgotPasswordForm showDevOutbox={env().APP_MODE !== "production"} />
    </AuthShell>
  );
}
