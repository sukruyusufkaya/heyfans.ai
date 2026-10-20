import type { Metadata } from "next";
import { Brain, Lock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/display";
import { MemoryManager, PrivacyToggles } from "@/features/fan/personalization-client";
import { InterestPicker } from "@/features/fan/profile-forms";
import { requireUser } from "@/lib/auth/session";
import { listCategories } from "@/services/creators/public";
import { getPreferences, listMemoryGroups } from "@/services/fan/account";
import { getPlatformSettings } from "@/services/platform/settings";
import { getT } from "@/i18n/server";
import { rich } from "@/components/fan/rich";
import { m } from "@/i18n/m";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Kişiselleştirme ve AI Hafızası") };
}
export const dynamic = "force-dynamic";

export default async function PersonalizationPage() {
  const { user } = await requireUser("/app/personalization");
  const t = await getT();
  const [prefs, memory, categories, settings] = await Promise.all([getPreferences(user.id), listMemoryGroups(user.id), listCategories({ parent: null }), getPlatformSettings()]);
  const memoryOn = prefs.aiMemoryEnabled && prefs.personalizationConsent;

  return (
    <div className="mx-auto max-w-[1320px]">
      <PageHeader eyebrow={t("HEYFANS / AI HAFIZASI")} title={t("Kişiselleştirme ve AI Hafızası")} description={t("AI sohbet deneyimini kişisel tercihlerinle yönet. Hangi verinin nasıl kullanıldığına sen karar verirsin.")} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-4">
          <Card>
            <CardHeader title={t("İlgi Alanların")} hint={t("Önerilerini senin zevkine göre şekillendir.")} />
            <InterestPicker categories={categories.map((c) => ({ slug: c.slug, name: t(c.name) }))} initial={prefs.interests} label={t("Tercihleri kaydet")} />
          </Card>

          <Card>
            <CardHeader
              title={t("AI Hafızam")}
              hint={t("Sohbetlerde tutulmasına izin verdiğin bilgiler.")}
              action={
                <Badge tone={memoryOn ? "green" : "gray"} size="md" dot>
                  {memoryOn ? t("Hafıza açık") : t("Hafıza kapalı")}
                </Badge>
              }
            />
            {!settings.features.aiMemory && (
              <p className="mb-4 rounded-xl bg-warning-soft px-3.5 py-2.5 text-[11px] font-semibold text-ink-soft">{t("AI hafızası platform genelinde geçici olarak kapatılmış olabilir.")}</p>
            )}
            {memory.total ? (
              <MemoryManager groups={memory.groups} total={memory.total} />
            ) : (
              <EmptyState
                compact
                icon={<Brain />}
                title={t("Henüz kayıtlı bir hafızan yok")}
                description={memoryOn ? t("AI ikizleriyle sohbet ettikçe paylaştığın bazı bilgiler burada listelenir. Her kaydı düzenleyebilir veya silebilirsin.") : t("AI hafızası kapalı olduğu için hiçbir şey kaydedilmiyor. İstersen sağdaki izinlerden açabilirsin.")}
              />
            )}
            {!memoryOn && memory.total > 0 && <p className="mt-4 rounded-xl bg-soft px-3.5 py-2.5 text-[11px] text-muted-strong">{t("Hafıza kapalıyken kayıtlı bilgiler sohbetlerde kullanılmaz; sen silene kadar saklanır.")}</p>}
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader title={t("Gizlilik Kontrolleri")} icon={<Lock />} />
            <PrivacyToggles initial={{ personalizationConsent: prefs.personalizationConsent, aiMemoryEnabled: prefs.aiMemoryEnabled, recommendationsEnabled: prefs.recommendationsEnabled }} />
          </Card>
          <Card className="hf-gradient-pink">
            <p className="flex items-center gap-2 text-sm font-extrabold">
              <ShieldCheck className="size-4 text-brand-500" aria-hidden /> {t("Verilerin nasıl kullanılır?")}
            </p>
            <ul className="mt-3 grid gap-2.5 text-xs leading-relaxed text-muted-strong">
              <li>• {t("AI hafızası açıkken sohbet mesajlarından bazı bilgiler (adın, sevdiğin şeyler, yaşadığın şehir gibi) otomatik çıkarılır ve yalnız ilgili içerik üreticisinin AI ikizi için saklanır.")}</li>
              <li>
                • {rich(t, m("<b>Hafıza hiçbir zaman içerik üreticileri arasında paylaşılmaz.</b> Bir AI ikizi, başka bir içerik üreticisiyle yaptığın sohbetlerden çıkarılan bilgileri göremez."), { b: (c) => <b>{c}</b> })}
              </li>
              <li>• {t("Hafızayı kapattığında yeni bilgi çıkarılmaz ve mevcut kayıtlar kullanılmaz. Kayıtları dilediğin an tek tek ya da toptan silebilirsin.")}</li>
              <li>• {t("Kişiselleştirme iznini geri çekersen hafıza da otomatik olarak kapanır.")}</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
