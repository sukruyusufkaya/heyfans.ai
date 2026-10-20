import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { AuthShell, AuthVisual, VisualNote } from "@/components/auth/auth-shell";
import { firstParam } from "@/features/auth/next-url";
import { linkErrorMessage } from "@/features/auth/messages";
import { ResetLinkInvalid, ResetPasswordForm } from "@/features/auth/reset-password-form";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Yeni Şifre Belirle") };
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const sp = await searchParams;
  const token = firstParam(sp.token);
  const error = firstParam(sp.error);
  const invalid = !token || !!error;
  const messageSource = linkErrorMessage(error ?? "INVALID_TOKEN");
  const message = messageSource ? t(messageSource) : t("Bağlantı geçersiz.");

  return (
    <AuthShell
      mode="merged"
      ratio="balanced"
      inner
      visual={
        <AuthVisual
          art="portrait-left"
          eyebrow={t("Hesap kurtarma")}
          lines={[{ text: t("Yeni bir") }, { text: t("başlangıç."), accent: true }]}
          body={t("Yeni şifreni belirle ve kaldığın yerden devam et.")}
          footer={<VisualNote icon={<KeyRound />}>{t("Şifren yalnızca sende kalır.")}</VisualNote>}
        />
      }
    >
      {invalid ? <ResetLinkInvalid message={message} /> : <ResetPasswordForm token={token} />}
    </AuthShell>
  );
}
