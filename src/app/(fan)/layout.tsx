import type { Metadata } from "next";
import { FanShell } from "@/components/layouts/fan-shell";
import { isDemo } from "@/config/env";
import { requireUser } from "@/lib/auth/session";
import { getFanShellData } from "@/services/shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function FanLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser("/app");
  const shell = await getFanShellData(user.id);
  return (
    <FanShell user={{ name: user.name, image: user.image, roles: user.roles }} isDemo={isDemo()} {...shell}>
      {children}
    </FanShell>
  );
}
