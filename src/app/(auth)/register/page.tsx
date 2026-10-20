import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AuthShell, AuthVisual, VisualPill } from "@/components/auth/auth-shell";
import { firstParam, safeNext } from "@/features/auth/next-url";
import { RegisterForm } from "@/features/auth/register-form";
import { getSession } from "@/lib/auth/session";
import { resolvePostLoginDestination } from "@/services/auth/post-login";
import { socialProviderFlags } from "@/services/auth/providers";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Hesap Oluştur") };
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const sp = await searchParams;
  const next = safeNext(firstParam(sp.next));
  const session = await getSession();
  if (session) redirect(await resolvePostLoginDestination(session.user, next));

  return (
    <AuthShell
      mode="cards"
      ratio="register"
      contentWidth="max-w-[680px]"
      visual={
        <AuthVisual
          art="phones"
          topBadge={<VisualPill icon={<Sparkles />}>{t("AI ikizi destekli platform")}</VisualPill>}
          eyebrow={t("HEYFANS'a hoş geldin")}
          lines={[{ text: t("Yeni bir yol,") }, { text: t("bağlan."), accent: true }]}
          body={t("İlgi alanlarını paylaşan insanlarla tanış, gerçek bağlar kur ve sana özel deneyimleri keşfet.")}
        />
      }
    >
      <RegisterForm flags={socialProviderFlags()} defaultIntent={firstParam(sp.intent) === "creator" ? "creator" : "fan"} next={next} />
    </AuthShell>
  );
}
