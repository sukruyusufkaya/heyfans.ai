import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { ConsoleShell } from "@/components/layouts/console-shell";
import { DemoDataNotice } from "@/components/ui/display";
import { isDemo } from "@/config/env";
import { ADMIN_NAV } from "@/config/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { can, ADMIN_ROLE_LABELS } from "@/lib/permissions";
import { getAdminShellData } from "@/services/shell";

export const metadata: Metadata = { title: { default: "Yönetim", template: "%s · Admin | HEYFANS" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin("admin.dashboard", "/admin");
  const counts = await getAdminShellData();
  const nav = ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || can(user, i.permission)) })).filter((g) => g.items.length);
  return (
    <ConsoleShell
      variant="admin"
      sectionLabel="ADMIN CONSOLE"
      rootCrumb="Platform Yönetimi"
      nav={nav}
      badges={counts}
      identity={{
        title: "HEYFANS PLATFORM",
        subtitle: "Yönetici Konsolu",
        mark: (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-[#9a3ce2] text-white">
            <ShieldCheck className="size-[18px]" />
          </span>
        ),
      }}
      user={{ name: user.name, image: user.image, subtitle: user.adminRole ? ADMIN_ROLE_LABELS[user.adminRole] : "Yönetici" }}
      headerStatus={isDemo() ? <DemoDataNotice className="hidden sm:inline-flex" /> : null}
      searchPlaceholder="Kullanıcı, içerik üreticisi veya işlem ara..."
      searchAction="/admin/users"
      notificationsHref="/admin/reports"
      unreadNotifications={counts.openReports}
      menuLinks={[{ href: "/security/mfa", label: "Güvenlik (2FA)" }, { href: "/app", label: "Hayran deneyimine geç" }]}
      sideCard={
        <div className="rounded-[13px] border border-[#3b2b40] bg-[#241b2a] p-3.5">
          <p className="text-[11px] font-bold text-white">🔐 Yönetim Oturumu</p>
          <p className="mt-1.5 text-[9.5px] leading-relaxed text-[#afa1b3]">Denetim günlüğü açık. Kritik işlemler gerekçe ister ve kaydedilir.</p>
        </div>
      }
      footerNote="HEYFANS Admin Console v1.0"
    >
      {children}
    </ConsoleShell>
  );
}
