import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Heart, Sparkles } from "lucide-react";
import { AuthShell, AuthVisual, VisualNote, VisualPill } from "@/components/auth/auth-shell";
import { firstParam, safeNext } from "@/features/auth/next-url";
import { LoginForm } from "@/features/auth/login-form";
import { linkErrorMessage, socialErrorMessage } from "@/features/auth/messages";
import { getSession } from "@/lib/auth/session";
import { resolvePostLoginDestination } from "@/services/auth/post-login";
import { socialProviderFlags } from "@/services/auth/providers";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Giriş Yap") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const sp = await searchParams;
  const next = safeNext(firstParam(sp.next));
  const session = await getSession();
  if (session) redirect(await resolvePostLoginDestination(session.user, next));

  const errorCode = firstParam(sp.error);
  const errorSource = firstParam(sp.social) === "1" ? socialErrorMessage(errorCode) : errorCode ? linkErrorMessage(errorCode) : null;
  const errorText = errorSource ? t(errorSource) : null;
  return (
    <AuthShell
      mode="cards"
      ratio="login"
      visual={
        <AuthVisual
          art="portrait"
          topBadge={<VisualPill icon={<Sparkles />}>{t("YAPAY ZEKÂ İKİZLERİ. GERÇEK BAĞLANTILAR.")}</VisualPill>}
          eyebrow={t("Yeni nesil içerik üreticisi deneyimi")}
          lines={[{ text: t("Gerçek üreticiler.") }, { text: t("AI ikizleri.") }, { text: t("Gerçek bağlantılar."), accent: true }]}
          body={t("İlham veren içerik üreticilerini keşfet, AI ikizleriyle dilediğin zaman sohbet et.")}
          footer={<VisualNote icon={<Heart />}>{t("Kişisel sohbetler. Gerçek insanlar.")}</VisualNote>}
        />
      }
    >
      <LoginForm next={next} flags={socialProviderFlags()} notice={firstParam(sp.reset) === "1" ? "reset" : null} initialError={errorText} />
    </AuthShell>
  );
}
