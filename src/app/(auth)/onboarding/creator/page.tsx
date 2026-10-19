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

export const metadata: Metadata = { title: "İçerik Üreticisi Karşılama" };

const PERKS = ["Tamamen senin kontrolün", "Yeni gelir olanakları", "Gerçek üreticiler için tasarlandı"];

export default async function CreatorOnboardingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
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
      startError = err instanceof AppError ? err.message : "Başvuru şu anda başlatılamadı. Lütfen tekrar dene.";
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
          topBadge={<VisualPill icon={<Crown />}>HEYFANS İÇERİK ÜRETİCİSİ STÜDYOSU</VisualPill>}
          eyebrow="Üretici yolculuğun"
          lines={[{ text: "Senin kimliğin." }, { text: "Senin AI ikizin.", accent: true }, { text: "Senin kuralların." }]}
          body="Sana özel, tamamen kontrol edebildiğin AI ikizinle takipçilerine daha yakın ol."
          footer={
            <ul className="space-y-1.5 text-xs font-bold text-white">
              {PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <Check className="size-3.5 text-brand-400" strokeWidth={3} aria-hidden />
                  {p}
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
          categories={categories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }))}
          consentTexts={{ persona: CONSENT_TEXTS.ai_twin_persona.text, knowledge: CONSENT_TEXTS.knowledge_use.text, voice: CONSENT_TEXTS.voice_likeness.text }}
        />
      ) : (
        <CreatorStartGate error={startError} />
      )}
    </AuthShell>
  );
}
