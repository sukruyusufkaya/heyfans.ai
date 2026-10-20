import { cookies } from "next/headers";
import { PublicFooter } from "@/components/layouts/public-footer";
import { PublicHeader } from "@/components/layouts/public-header";
import { CookieBanner } from "@/components/public/cookie-banner";
import { getSession } from "@/lib/auth/session";
import { CONSENT_COOKIE, decodeConsent } from "@/features/support/consent";
import { AreaMessages } from "@/i18n/area";
import { m } from "@/i18n/m";

/** Destek, Güvenlik ve Yasal sayfaları: genel başlık + "Destek" menü öğesi. */
export default async function SupportLegalLayout({ children }: { children: React.ReactNode }) {
  const [session, jar] = await Promise.all([getSession(), cookies()]);
  const user = session ? { name: session.user.name, image: session.user.image, roles: session.user.roles } : null;
  const decided = decodeConsent(jar.get(CONSENT_COOKIE)?.value) !== null;
  return (
    <AreaMessages area="support">
      <>
        <PublicHeader user={user} extraNav={[{ href: "/help", label: m("Destek"), match: "prefix" }]} />
        <main id="main" className="bg-gradient-to-b from-white to-[#fffafd]">
          {children}
        </main>
        <PublicFooter />
        <CookieBanner decided={decided} />
      </>
    </AreaMessages>
  );
}
