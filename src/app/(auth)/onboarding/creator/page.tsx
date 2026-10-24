import type { Metadata } from "next";
import { Check, Crown } from "lucide-react";
import { AuthShell, AuthVisual, VisualPill } from "@/components/auth/auth-shell";
import { CreatorOnboarding, CreatorStartGate } from "@/features/auth/creator-onboarding";
import { firstParam } from "@/features/auth/next-url";
import { requireUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { CONSENT_TEXTS } from "@/services/ai-twins/lifecycle";
import { getCreatorAssistantView } from "@/services/auth/creator-assistant";
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

  // 18+ beyanı ayrı sayfada değil, asistanın ilk sorusunda alınır (beyan yoksa sohbet doğum tarihiyle başlar).
  let view = await getCreatorAssistantView(user.id);
  let startError: string | null = null;
  // Kayıtta "İçerik Üreticisiyim" seçen (veya ?start=1 ile gelen) kullanıcı için profil otomatik açılır; diğerleri açık onay verir.
  if (!view && (user.signupIntent === "creator" || firstParam(sp.start) === "1")) {
    try {
      await startCreatorOnboarding(user.id);
      view = await getCreatorAssistantView(user.id);
    } catch (err) {
      startError = err instanceof AppError ? t(err.template, err.params) : t("Başvuru şu anda başlatılamadı. Lütfen tekrar dene.");
    }
  }
  const categories = view ? await listCategories() : [];
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <AuthShell
      mode="merged"
      ratio="creator"
      align={view && view.status === "onboarding" ? "start" : "center"}
      fitViewport={view?.status === "onboarding"}
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
          firstName={user.name.trim().split(/\s+/)[0] ?? ""}
          categories={categories.map((c) => ({ slug: c.slug, name: t(c.name), icon: c.icon }))}
          personaConsentText={t(CONSENT_TEXTS.ai_twin_persona.text)}
          knowledgeConsentText={t(CONSENT_TEXTS.knowledge_use.text)}
          todayIso={todayIso}
        />
      ) : (
        <CreatorStartGate error={startError} />
      )}
    </AuthShell>
  );
}
