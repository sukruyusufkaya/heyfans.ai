import { cookies } from "next/headers";
import { PublicFooter } from "@/components/layouts/public-footer";
import { PublicHeader } from "@/components/layouts/public-header";
import { CookieBanner } from "@/components/public/cookie-banner";
import { getSession } from "@/lib/auth/session";
import { CONSENT_COOKIE, decodeConsent } from "@/features/support/consent";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [session, jar] = await Promise.all([getSession(), cookies()]);
  const user = session ? { name: session.user.name, image: session.user.image, roles: session.user.roles } : null;
  const decided = decodeConsent(jar.get(CONSENT_COOKIE)?.value) !== null;
  return (
    <>
      <PublicHeader user={user} />
      <main id="main">{children}</main>
      <PublicFooter />
      <CookieBanner decided={decided} />
    </>
  );
}
