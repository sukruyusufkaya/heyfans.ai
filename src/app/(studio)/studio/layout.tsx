import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StudioShell } from "@/components/studio/studio-shell";
import { MaintenanceScreen } from "@/components/layouts/maintenance-screen";
import { m } from "@/i18n/m";
import { getT } from "@/i18n/server";
import { requireCreator } from "@/lib/auth/session";
import { maintenanceState } from "@/services/platform/guards";
import { getStudioShellData } from "@/services/shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: { default: t("Creator Studio"), template: `%s · ${t("Creator Studio")} | HEYFANS` }, robots: { index: false, follow: false } };
}

const TWIN_STATUS: Record<string, { label: string; cls: string }> = {
  live: { label: m("AI İkizi Yayında"), cls: "bg-[#e8f9f0] text-[#09926b]" },
  paused: { label: m("AI İkizi Duraklatıldı"), cls: "bg-warning-soft text-warning" },
  pending_review: { label: m("AI İkizi İncelemede"), cls: "bg-violet-soft text-violet" },
  approved: { label: m("AI İkizi Onaylandı"), cls: "bg-teal-soft text-teal" },
  draft: { label: m("AI İkizi Taslak"), cls: "bg-soft text-muted-strong" },
  rejected: { label: m("AI İkizi Reddedildi"), cls: "bg-danger-soft text-danger" },
  revoked: { label: m("AI İkizi Geri Çekildi"), cls: "bg-danger-soft text-danger" },
};

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  const { user } = await requireCreator("/studio");
  const maintenance = await maintenanceState(user);
  if (maintenance.blocked) return <MaintenanceScreen message={maintenance.message} />;
  const shell = await getStudioShellData(user.id);
  if (!shell) redirect("/onboarding/creator");
  const status = TWIN_STATUS[shell.twinStatus ?? "draft"] ?? TWIN_STATUS.draft!;
  const live = shell.twinStatus === "live";
  return (
    <StudioShell
      variant="studio"
      sectionLabel={t("Creator Studio")}
      rootCrumb={t("Panel")}
      badges={{ pendingRequests: shell.pendingRequests }}
      identity={{ title: shell.displayName + (shell.verified ? " ✦" : ""), subtitle: shell.verified ? t("Doğrulanmış İçerik Üreticisi") : t("Doğrulama bekleniyor"), image: shell.avatarUrl }}
      user={{ name: shell.displayName, image: shell.avatarUrl ?? user.image, subtitle: "@" + shell.username }}
      headerStatus={
        <Link href="/studio/ai-twin" className={`hidden items-center gap-1.5 rounded-full px-2.5 py-2 text-[10px] font-extrabold sm:flex ${status.cls}`}>
          <span className="size-1.5 rounded-full bg-current" /> {t(status.label)}
        </Link>
      }
      searchPlaceholder={t("Stüdyoda ara, içeriğe git...")}
      searchAction="/studio/content"
      notificationsHref="/app/notifications"
      unreadNotifications={shell.unreadNotifications}
      menuLinks={[
        { href: `/creators/${shell.username}`, label: t("Herkese açık profilim") },
        { href: "/studio/profile", label: t("Profil düzenleyici") },
        { href: "/app", label: t("Hayran deneyimine geç") },
        { href: "/studio/settings", label: t("Stüdyo ayarları") },
      ]}
      sideCard={
        <div className="rounded-2xl border border-[#3f2b41] bg-gradient-to-br from-[#2a1f31] to-[#381b35] p-4 text-white">
          <p className="text-xs font-bold">{live ? t("AI İkizin Yayında") : t("AI İkizini Tamamla")}</p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-[#b7a1b6]">
            {live ? t("Yetkilendirilmiş dijital ikizin hayranlarınla 7/24 etkileşim kuruyor.") : t("Kişilik, bilgi tabanı ve sınırları tamamlayıp incelemeye gönder.")}
          </p>
          <Link href={live ? "/studio/analytics" : "/studio/ai-twin"} className="mt-3 block rounded-[9px] bg-brand-500 py-2.5 text-center text-[11px] font-extrabold hover:bg-brand-600">
            {live ? t("Performansı incele →") : t("AI İkizime git →")}
          </Link>
        </div>
      }
      footerNote={t("Gizlilik & güvenlik · Kontrol her zaman sende")}
    >
      {children}
    </StudioShell>
  );
}
