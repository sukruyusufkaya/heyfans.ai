import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AuthShell, AuthVisual, VisualNote } from "@/components/auth/auth-shell";
import { env } from "@/config/env";
import { firstParam, safeNext } from "@/features/auth/next-url";
import { linkErrorMessage } from "@/features/auth/messages";
import { VerifyPending, VerifySuccess } from "@/features/auth/verify-panel";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Hesap Doğrulama" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(firstParam(sp.next));
  const errorCode = firstParam(sp.error);
  const email = (firstParam(sp.email) ?? "").trim().slice(0, 200);
  const verified = firstParam(sp.verified) === "1";
  const showDevOutbox = env().APP_MODE !== "production";

  let content: React.ReactNode;
  if (errorCode) {
    content = <VerifyPending email={email} next={next} showDevOutbox={showDevOutbox} errorMessage={linkErrorMessage(errorCode)} />;
  } else if (verified) {
    const session = await getSession();
    content = <VerifySuccess signedIn={!!session} next={next} />;
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
          eyebrow="Son bir adım"
          lines={[{ text: "Neredeyse" }, { text: "hazırsın.", accent: true }]}
          body="Kısa bir doğrulamanın ardından yeni bağlantılar ve deneyimler seni bekliyor."
          footer={<VisualNote icon={<ShieldCheck />}>Özel. Güvenli. Tam sana göre.</VisualNote>}
        />
      }
    >
      {content}
    </AuthShell>
  );
}
