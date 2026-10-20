import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AuthShell, AuthVisual, VisualNote } from "@/components/auth/auth-shell";
import { AgeVerification } from "@/features/auth/age-form";
import { firstParam, safeNext } from "@/features/auth/next-url";
import { requireUser } from "@/lib/auth/session";
import { getAgeStatus } from "@/services/auth/age";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Yaş Doğrulama") };
}

export default async function AgeVerificationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const sp = await searchParams;
  const next = safeNext(firstParam(sp.next));
  const { user } = await requireUser("/age-verification");
  const status = await getAgeStatus(user.id);
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <AuthShell
      mode="merged"
      ratio="verify"
      inner
      visual={
        <AuthVisual
          art="portrait-left"
          eyebrow={t("Güvenli bir topluluk")}
          lines={[{ text: t("Yalnızca") }, { text: t("yetişkinler için."), accent: true }]}
          body={t("HEYFANS 18 yaşını doldurmuş kişilere hizmet verir. Bu adım, topluluğu ve seni korumamıza yardım eder.")}
          footer={<VisualNote icon={<ShieldCheck />}>{t("Özel. Güvenli. Tam sana göre.")}</VisualNote>}
        />
      }
    >
      <AgeVerification state={status.state} recordedAt={status.record?.at ?? null} next={next} todayIso={todayIso} />
    </AuthShell>
  );
}
