import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AuthShell, AuthVisual, VisualNote } from "@/components/auth/auth-shell";
import { TwoFactorForm } from "@/features/auth/two-factor-form";
import { getSession } from "@/lib/auth/session";
import { resolvePostLoginDestination } from "@/services/auth/post-login";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("İki Adımlı Doğrulama") };
}

export default async function TwoFactorPage() {
  const t = await getT();
  const session = await getSession();
  if (session) redirect(await resolvePostLoginDestination(session.user, null));
  // İkinci adım çerezi yoksa (süresi dolmuş / doğrudan açılmış) girişe dön.
  const jar = await cookies();
  if (!jar.has("hf.two_factor") && !jar.has("__Secure-hf.two_factor")) redirect("/login");

  return (
    <AuthShell
      mode="merged"
      ratio="verify"
      inner
      visual={
        <AuthVisual
          art="portrait-left"
          eyebrow={t("Son bir adım")}
          lines={[{ text: t("Hesabın") }, { text: t("güvende."), accent: true }]}
          body={t("İkinci doğrulama adımı hesabını yetkisiz erişime karşı korur.")}
          footer={<VisualNote icon={<ShieldCheck />}>{t("Özel. Güvenli. Tam sana göre.")}</VisualNote>}
        />
      }
    >
      <TwoFactorForm />
    </AuthShell>
  );
}
