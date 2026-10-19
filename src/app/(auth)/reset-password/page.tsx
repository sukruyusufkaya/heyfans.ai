import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { AuthShell, AuthVisual, VisualNote } from "@/components/auth/auth-shell";
import { firstParam } from "@/features/auth/next-url";
import { linkErrorMessage } from "@/features/auth/messages";
import { ResetLinkInvalid, ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = { title: "Yeni Şifre Belirle" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const token = firstParam(sp.token);
  const error = firstParam(sp.error);
  const invalid = !token || !!error;
  const message = linkErrorMessage(error ?? "INVALID_TOKEN") ?? "Bağlantı geçersiz.";

  return (
    <AuthShell
      mode="merged"
      ratio="balanced"
      inner
      visual={
        <AuthVisual
          art="portrait-left"
          eyebrow="Hesap kurtarma"
          lines={[{ text: "Yeni bir" }, { text: "başlangıç.", accent: true }]}
          body="Yeni şifreni belirle ve kaldığın yerden devam et."
          footer={<VisualNote icon={<KeyRound />}>Şifren yalnızca sende kalır.</VisualNote>}
        />
      }
    >
      {invalid ? <ResetLinkInvalid message={message} /> : <ResetPasswordForm token={token} />}
    </AuthShell>
  );
}
