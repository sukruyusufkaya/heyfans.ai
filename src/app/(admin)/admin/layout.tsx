import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/session";
import { permissionsFor, ADMIN_ROLE_LABELS } from "@/lib/permissions";
import { getAdminShellData } from "@/services/shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: { default: t("Yönetim"), template: "%s · Admin | HEYFANS" }, robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  const { user } = await requireAdmin("admin.dashboard", "/admin");
  const counts = await getAdminShellData();
  // Menü, ikon bileşenleri sunucudan istemciye geçirilemediği için AdminShell içinde izinlere göre süzülür.
  const allowed = [...permissionsFor(user)];
  return (
    <AdminShell
      variant="admin"
      sectionLabel={t("ADMIN CONSOLE")}
      rootCrumb={t("Platform Yönetimi")}
      allowed={allowed}
      badges={counts}
      identity={{
        title: "HEYFANS PLATFORM", // i18n-ignore
        subtitle: t("Yönetici Konsolu"),
        mark: (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-[#9a3ce2] text-white">
            <ShieldCheck className="size-[18px]" />
          </span>
        ),
      }}
      user={{ name: user.name, image: user.image, subtitle: user.adminRole ? t(ADMIN_ROLE_LABELS[user.adminRole]) : t("Yönetici") }}
      searchPlaceholder={t("Kullanıcı, içerik üreticisi veya işlem ara...")}
      searchAction="/admin/users"
      notificationsHref="/admin/reports"
      unreadNotifications={counts.openReports}
      menuLinks={[{ href: "/security/mfa", label: t("Güvenlik (2FA)") }, { href: "/app", label: t("Hayran deneyimine geç") }]}
      sideCard={
        <div className="rounded-[13px] border border-[#3b2b40] bg-[#241b2a] p-3.5">
          <p className="text-[11px] font-bold text-white">{t("🔐 Yönetim Oturumu")}</p>
          <p className="mt-1.5 text-[9.5px] leading-relaxed text-[#afa1b3]">{t("Denetim günlüğü açık. Kritik işlemler gerekçe ister ve kaydedilir.")}</p>
        </div>
      }
      footerNote={t("HEYFANS Admin Console v1.0")}
    >
      {children}
    </AdminShell>
  );
}
