import type { Metadata } from "next";
import { FanShell } from "@/components/layouts/fan-shell";
import { MaintenanceScreen } from "@/components/layouts/maintenance-screen";
import { requireUser } from "@/lib/auth/session";
import { maintenanceState } from "@/services/platform/guards";
import { getFanShellData } from "@/services/shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function FanLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser("/app");
  const maintenance = await maintenanceState(user);
  if (maintenance.blocked) return <MaintenanceScreen message={maintenance.message} />;
  const shell = await getFanShellData(user.id);
  return (
    <FanShell user={{ name: user.name, image: user.image, roles: user.roles }} {...shell}>
      {children}
    </FanShell>
  );
}
