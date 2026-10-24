import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AuthShell, AuthVisual, VisualNote } from "@/components/auth/auth-shell";
import { env } from "@/config/env";
import { firstParam, safeNext } from "@/features/auth/next-url";
import { linkErrorMessage } from "@/features/auth/messages";
import { VerifyPending, VerifySuccess } from "@/features/auth/verify-panel";
import { getSession } from "@/lib/auth/session";
import { resolvePostLoginDestination } from "@/services/auth/post-login";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Hesap Doğrulama") };
}

export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const sp = await searchParams;
  const next = safeNext(firstParam(sp.next));
  const errorCode = firstParam(sp.error);
  const email = (firstParam(sp.email) ?? "").trim().slice(0, 200);
  const verified = firstParam(sp.verified) === "1";
  const showDevOutbox = env().APP_MODE !== "production";

  let content: React.ReactNode;
  if (errorCode) {
    const errorSource = linkErrorMessage(errorCode);
    content = <VerifyPending email={email} next={next} showDevOutbox={showDevOutbox} errorMessage={errorSource ? t(errorSource) : null} />;
  } else if (verified) {
    const session = await getSession();
    // Doğrulama bağlantısı oturumu açar: ara ekran göstermeden yolculuğun sıradaki adımına geç.
    if (session) redirect(await resolvePostLoginDestination(session.user, next));
    content = <VerifySuccess signedIn={false} next={next} />;
  } else {
    content = <VerifyPending email={email} next={next} showDevOutbox={showDevOutbox} />;
  }

  return (
    <AuthShell
      mode="merged"
      ratio="verify"
      inner
      visual={
        <AuthVisual
          art="portrait-left"
          eyebrow={t("Son bir adım")}
          lines={[{ text: t("Neredeyse") }, { text: t("hazırsın."), accent: true }]}
          body={t("Kısa bir doğrulamanın ardından yeni bağlantılar ve deneyimler seni bekliyor.")}
          footer={<VisualNote icon={<ShieldCheck />}>{t("Özel. Güvenli. Tam sana göre.")}</VisualNote>}
        />
      }
    >
      {content}
    </AuthShell>
  );
}
