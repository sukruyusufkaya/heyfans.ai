import type { Metadata } from "next";
import { AuthShell, AuthVisual } from "@/components/auth/auth-shell";
import { FanOnboarding } from "@/features/auth/fan-onboarding";
import { firstParam, safeNext } from "@/features/auth/next-url";
import { requireUser } from "@/lib/auth/session";
import { getFanOnboarding } from "@/services/auth/onboarding";
import { listCategories } from "@/services/creators/public";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Hayran Karşılama") };
}

export default async function FanOnboardingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const sp = await searchParams;
  const next = safeNext(firstParam(sp.next));
  const { user } = await requireUser("/onboarding/fan");
  const [state, categories] = await Promise.all([getFanOnboarding(user.id), listCategories()]);

  return (
    <AuthShell
      mode="merged"
      ratio="fan"
      align="start"
      visual={
        <AuthVisual
          art="portrait"
          eyebrow={t("Sana özel")}
          lines={[{ text: t("Kendine uygun") }, { text: t("insanları bul."), accent: true }]}
          body={t("Sevdiğin şeylerden daha fazla, ilgilenmediklerinden daha az. Deneyimin sana göre şekillensin.")}
          footer={<p className="border-t border-white/20 pt-4 text-xs text-white/70">{t("✦ Bu deneyim tamamen sana özel.")}</p>}
        />
      }
    >
      <FanOnboarding
        categories={categories.map((c) => ({ slug: c.slug, name: t(c.name), icon: c.icon }))}
        initial={{
          step: state.step,
          completed: state.completed,
          interests: state.interests,
          vibes: state.vibes,
          recommendationsEnabled: state.recommendationsEnabled,
          personalizationConsent: state.personalizationConsent,
          aiMemoryEnabled: state.aiMemoryEnabled,
        }}
        next={next}
        firstName={user.name.split(" ")[0] ?? ""}
      />
    </AuthShell>
  );
}
