import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Heart, Sparkles } from "lucide-react";
import { AuthShell, AuthVisual, VisualNote, VisualPill } from "@/components/auth/auth-shell";
import { firstParam, safeNext } from "@/features/auth/next-url";
import { LoginForm } from "@/features/auth/login-form";
import { linkErrorMessage } from "@/features/auth/messages";
import { getSession } from "@/lib/auth/session";
import { resolvePostLoginDestination } from "@/services/auth/post-login";
import { socialProviderFlags } from "@/services/auth/providers";

export const metadata: Metadata = { title: "Giriş Yap" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(firstParam(sp.next));
  const session = await getSession();
  if (session) redirect(await resolvePostLoginDestination(session.user, next));

  const errorCode = firstParam(sp.error);
  return (
    <AuthShell
      mode="cards"
      ratio="login"
      visual={
        <AuthVisual
          art="portrait"
          topBadge={<VisualPill icon={<Sparkles />}>YAPAY ZEKÂ İKİZLERİ. GERÇEK BAĞLANTILAR.</VisualPill>}
          eyebrow="Yeni nesil içerik üreticisi deneyimi"
          lines={[{ text: "Gerçek üreticiler." }, { text: "AI ikizleri." }, { text: "Gerçek bağlantılar.", accent: true }]}
          body="İlham veren içerik üreticilerini keşfet, AI ikizleriyle dilediğin zaman sohbet et."
          footer={<VisualNote icon={<Heart />}>Kişisel sohbetler. Gerçek insanlar.</VisualNote>}
        />
      }
    >
      <LoginForm next={next} flags={socialProviderFlags()} notice={firstParam(sp.reset) === "1" ? "reset" : null} initialError={errorCode ? linkErrorMessage(errorCode) : null} />
    </AuthShell>
  );
}
