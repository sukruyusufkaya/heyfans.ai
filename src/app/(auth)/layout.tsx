import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { getSession } from "@/lib/auth/session";
import { AreaMessages } from "@/i18n/area";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    robots: { index: false, follow: false },
    title: { default: t("Hesap"), template: "%s | HEYFANS" },
  };
}

/** Giriş, kayıt, karşılama ve güvenlik sayfalarının ortak iskeleti (sade üst çubuk + pembe zemin). */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession().catch(() => null);
  const roles = session?.user.roles ?? [];
  const accountHref = !session ? null : roles.includes("admin") ? "/admin" : roles.includes("creator") ? "/studio" : "/app";
  return (
    <AreaMessages area="auth">
      <div className="flex min-h-dvh flex-col bg-white">
        <AuthHeader accountHref={accountHref} />
        <main
          id="main"
          className="flex-1 bg-[#fffbfd] bg-[radial-gradient(900px_520px_at_100%_100%,#fde6f2,transparent_70%),radial-gradient(700px_420px_at_0%_0%,#fff3f9,transparent_70%)]"
        >
          {children}
        </main>
      </div>
    </AreaMessages>
  );
}
