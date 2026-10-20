import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, Crown } from "lucide-react";
import { AuthShell, AuthVisual, VisualPill } from "@/components/auth/auth-shell";
import { CreatorOnboarding, CreatorStartGate } from "@/features/auth/creator-onboarding";
import { firstParam, withNext } from "@/features/auth/next-url";
import { requireUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { CONSENT_TEXTS } from "@/services/ai-twins/lifecycle";
import { getAgeStatus } from "@/services/auth/age";
import { getCreatorOnboardingView } from "@/services/auth/creator-onboarding";
import { listCategories } from "@/services/creators/public";
import { startCreatorOnboarding } from "@/services/creators/onboarding";
import { getT } from "@/i18n/server";
import { m } from "@/i18n/m";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("İçerik Üreticisi Karşılama") };
}

const PERKS = [m("Tamamen senin kontrolün"), m("Yeni gelir olanakları"), m("Gerçek üreticiler için tasarlandı")];

export default async function CreatorOnboardingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const sp = await searchParams;
  const { user } = await requireUser("/onboarding/creator");

  // İçerik üreticisi olmak 18+ gerektirir: yaş beyanı yoksa önce onu al.
  const age = await getAgeStatus(user.id);
  if (age.state !== "declared_adult") redirect(withNext("/age-verification", "/onboarding/creator"));

  let view = await getCreatorOnboardingView(user.id);
  let startError: string | null = null;
  // Kayıtta "İçerik Üreticisiyim" seçen (veya ?start=1 ile gelen) kullanıcı için profil otomatik açılır; diğerleri açık onay verir.
  if (!view && (user.signupIntent === "creator" || firstParam(sp.start) === "1")) {
    try {
      await startCreatorOnboarding(user.id);
      view = await getCreatorOnboardingView(user.id);
    } catch (err) {
      startError = err instanceof AppError ? t(err.template, err.params) : t("Başvuru şu anda başlatılamadı. Lütfen tekrar dene.");
    }
  }
  const categories = view ? await listCategories() : [];

  return (
    <AuthShell
      mode="merged"
      ratio="creator"
      align={view && view.status === "onboarding" ? "start" : "center"}
      visual={
        <AuthVisual
          art="portrait"
          topBadge={<VisualPill icon={<Crown />}>{t("HEYFANS İÇERİK ÜRETİCİSİ STÜDYOSU")}</VisualPill>}
          eyebrow={t("Üretici yolculuğun")}
          lines={[{ text: t("Senin kimliğin.") }, { text: t("Senin AI ikizin."), accent: true }, { text: t("Senin kuralların.") }]}
          body={t("Sana özel, tamamen kontrol edebildiğin AI ikizinle takipçilerine daha yakın ol.")}
          footer={
            <ul className="space-y-1.5 text-xs font-bold text-white">
              {PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <Check className="size-3.5 text-brand-400" strokeWidth={3} aria-hidden />
                  {t(p)}
                </li>
              ))}
            </ul>
          }
        />
      }
    >
      {view ? (
        <CreatorOnboarding
          view={view}
          categories={categories.map((c) => ({ slug: c.slug, name: t(c.name), icon: c.icon }))}
          consentTexts={{ persona: t(CONSENT_TEXTS.ai_twin_persona.text), knowledge: t(CONSENT_TEXTS.knowledge_use.text), voice: t(CONSENT_TEXTS.voice_likeness.text) }}
        />
      ) : (
        <CreatorStartGate error={startError} />
      )}
    </AuthShell>
  );
}
